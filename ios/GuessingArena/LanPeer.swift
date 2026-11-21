import Foundation
import Network
import Security
import Darwin

/// Short-lived local-network exchange of WebRTC offers and answers; no cloud relay.
final class LanPeer {
    private let queue = DispatchQueue(label: "guess.lan")
    private var listener: NWListener?
    private var answer = ""
    private var secret = ""
    private let limit = 22000
    private func json(_ key:String,_ value:String)->String {
        let data = try? JSONSerialization.data(withJSONObject:[key:value]); return data.flatMap { String(data:$0,encoding:.utf8) } ?? "{}"
    }
    private func respond(_ value:String,_ reply:@escaping(String)->Void) { DispatchQueue.main.async { reply(value) } }
    private func stopInternal() { listener?.cancel(); listener=nil; answer=""; secret="" }
    func stop(_ reply:@escaping(String)->Void) { queue.async { self.stopInternal(); self.respond("{}",reply) } }
    func getAnswer(_ reply:@escaping(String)->Void) { queue.async { self.respond(self.answer,reply) } }

    func startHost(_ offer:String,reply:@escaping(String)->Void) {
        queue.async {
            self.stopInternal()
            guard offer.hasPrefix("GUESS2."),offer.utf8.count < self.limit-64 else { self.respond(self.json("error","连接信息无效"),reply); return }
            guard let ip=self.privateIPv4() else { self.respond(self.json("error","未找到局域网地址，请先连接 Wi-Fi 或开启热点"),reply); return }
            var bytes=[UInt8](repeating:0,count:8)
            guard SecRandomCopyBytes(kSecRandomDefault,bytes.count,&bytes)==errSecSuccess else { self.respond(self.json("error","无法生成连接码"),reply); return }
            let key=bytes.map{String(format:"%02X",$0)}.joined();self.secret=key
            do {
                let server=try NWListener(using:.tcp,on:.any);self.listener=server
                server.newConnectionHandler={ [weak self] connection in self?.accept(connection,offer:offer,key:key) }
                var replied=false
                server.stateUpdateHandler={ state in
                    switch state {
                    case .ready:
                        guard !replied,let port=server.port?.rawValue else { return };replied=true
                        let ipHex=ip.split(separator:".").compactMap{UInt8($0)}.map{String(format:"%02X",$0)}.joined()
                        self.respond(self.json("code",ipHex+"-"+String(format:"%04X",port)+"-"+key),reply)
                    case .failed(_):
                        if !replied { replied=true;self.respond(self.json("error","无法创建局域网连接"),reply) }
                    default:break
                    }
                }
                server.start(queue:self.queue)
            } catch { self.respond(self.json("error","无法创建局域网连接"),reply) }
        }
    }
    private func accept(_ connection:NWConnection,offer:String,key:String) {
        connection.start(queue:queue)
        receiveLine(connection,buffer:Data()) { [weak self] line in
            guard let self=self,let line=line else { connection.cancel();return }
            var result="ERROR"
            if line=="GET "+key { result="OK "+offer }
            else if line.hasPrefix("SET "+key+" ") {
                let value=String(line.dropFirst(("SET "+key+" ").count))
                if value.hasPrefix("GUESS2."),self.answer.isEmpty { self.answer=value;result="OK" }
            }
            connection.send(content:Data((result+"\n").utf8),completion:.contentProcessed{ _ in connection.cancel() })
        }
        queue.asyncAfter(deadline:.now()+5){connection.cancel()}
    }
    private func receiveLine(_ connection:NWConnection,buffer:Data,completion:@escaping(String?)->Void) {
        connection.receive(minimumIncompleteLength:1,maximumLength:8192) { [weak self] bytes,_,done,error in
            guard let self=self,error==nil else { completion(nil);return };var data=buffer;if let bytes=bytes {data.append(bytes)}
            guard data.count<=self.limit else { completion(nil);return }
            if let newline=data.firstIndex(of:10) { completion(String(data:Data(data[..<newline]),encoding:.utf8)?.trimmingCharacters(in:.newlines));return }
            if done { completion(nil);return };self.receiveLine(connection,buffer:data,completion:completion)
        }
    }
    func getOffer(_ code:String,reply:@escaping(String)->Void) { exchange(code,operation:"GET",body:nil) { value in self.respond(value.map{self.json("offer",$0)} ?? self.json("error","无法连接房主，请检查同一网络和连接码"),reply) } }
    func sendAnswer(_ code:String,value:String,reply:@escaping(String)->Void) { exchange(code,operation:"SET",body:value) { result in self.respond(result == nil ? self.json("error","发送回复失败，请重新连接") : "{}",reply) } }
    private func exchange(_ code:String,operation:String,body:String?,completion:@escaping(String?)->Void) {
        queue.async {
            let p=code.trimmingCharacters(in:.whitespacesAndNewlines).uppercased().split(separator:"-").map(String.init)
            guard p.count==3,p[0].count==8,p[1].count==4,p[2].count==16,p.allSatisfy({$0.allSatisfy(\.isHexDigit)}),
                  let bits=UInt32(p[0],radix:16),let port=UInt16(p[1],radix:16),port>0,
                  body==nil || (body!.hasPrefix("GUESS2.") && body!.utf8.count<self.limit-64) else { completion(nil);return }
            let octets=[UInt8((bits>>24)&255),UInt8((bits>>16)&255),UInt8((bits>>8)&255),UInt8(bits&255)]
            guard octets[0]==10 || (octets[0]==172 && (16...31).contains(octets[1])) || (octets[0]==192 && octets[1]==168) else { completion(nil);return }
            let address=octets.map(String.init).joined(separator:".")
            let connection=NWConnection(host:NWEndpoint.Host(address),port:NWEndpoint.Port(rawValue:port)!,using:.tcp);var finished=false
            func finish(_ value:String?) { if finished{return};finished=true;connection.cancel();completion(value) }
            connection.stateUpdateHandler={ state in
                switch state {
                case .ready:
                    let line=operation+" "+p[2]+(body.map{" "+$0} ?? "")+"\n"
                    connection.send(content:Data(line.utf8),completion:.contentProcessed{ error in
                        if error != nil {finish(nil);return}
                        self.receiveLine(connection,buffer:Data()){ response in
                            guard let response=response else {finish(nil);return};if response=="OK" {finish("")}else if response.hasPrefix("OK "){finish(String(response.dropFirst(3)))}else{finish(nil)}
                        }
                    })
                case .failed(_), .cancelled:finish(nil)
                default:break
                }
            }
            connection.start(queue:self.queue);self.queue.asyncAfter(deadline:.now()+5){finish(nil)}
        }
    }
    private func privateIPv4()->String? {
        var first:UnsafeMutablePointer<ifaddrs>?;guard getifaddrs(&first)==0,let head=first else{return nil};defer{freeifaddrs(head)}
        var current:UnsafeMutablePointer<ifaddrs>?=head;var best:String?;var bestScore=0
        while let entry=current {defer{current=entry.pointee.ifa_next};let name=String(cString:entry.pointee.ifa_name)
            guard let addr=entry.pointee.ifa_addr,addr.pointee.sa_family==UInt8(AF_INET),!name.hasPrefix("utun"),!name.hasPrefix("pdp_ip") else{continue}
            var ip=UnsafeRawPointer(addr).assumingMemoryBound(to:sockaddr_in.self).pointee.sin_addr;var chars=[CChar](repeating:0,count:Int(INET_ADDRSTRLEN))
            guard inet_ntop(AF_INET,&ip,&chars,socklen_t(INET_ADDRSTRLEN)) != nil else{continue};let text=String(cString:chars);let octets=text.split(separator:".").compactMap{Int($0)}
            guard octets.count==4,octets[0]==10 || (octets[0]==172 && (16...31).contains(octets[1])) || (octets[0]==192 && octets[1]==168) else{continue}
            let score=name.hasPrefix("bridge") ? 3 : name=="en0" ? 2 : 1;if score>bestScore{best=text;bestScore=score}
        };return best
    }
}
