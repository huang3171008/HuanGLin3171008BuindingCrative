import Foundation
import Network
import SwiftUI

/// Serves bundled files only on loopback, keeping one stable WebKit origin for local wallets.
final class LocalAssetServer: ObservableObject {
    static let port: UInt16 = 43871
    @Published var ready = false
    @Published var error = ""
    private let queue = DispatchQueue(label: "guess.local.assets")
    private var listener: NWListener?

    func start() {
        guard listener == nil else { return }
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: Self.port)!)
            let server = try NWListener(using: parameters)
            listener = server
            server.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
            server.stateUpdateHandler = { [weak self] state in
                switch state {
                case .ready: DispatchQueue.main.async { self?.ready = true }
                case .failed(let failure): DispatchQueue.main.async { self?.error = "本机界面启动失败：\(failure.localizedDescription)" }
                default: break
                }
            }
            server.start(queue: queue)
        } catch { self.error = "本机界面启动失败：\(error.localizedDescription)" }
    }
    private func accept(_ connection: NWConnection) {
        connection.start(queue: queue)
        receiveHeader(connection, data: Data())
    }
    private func receiveHeader(_ connection: NWConnection, data: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] bytes, _, complete, failure in
            guard let self = self, failure == nil else { connection.cancel(); return }
            var all = data; if let bytes = bytes { all.append(bytes) }
            guard all.count <= 32768 else { connection.cancel(); return }
            if let request = String(data: all, encoding: .utf8), request.contains("\r\n\r\n") { self.reply(connection, request: request) }
            else if complete { connection.cancel() }
            else { self.receiveHeader(connection, data: all) }
        }
    }
    private func reply(_ connection: NWConnection, request: String) {
        let lines = request.components(separatedBy: "\r\n")
        let first = lines.first?.split(separator: " ").map(String.init) ?? []
        guard first.count >= 2, ["GET", "HEAD"].contains(first[0]),
              let decoded = first[1].components(separatedBy: "?").first?.removingPercentEncoding,
              let root = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true).standardizedFileURL else { send(connection, status: "400 Bad Request", headers: [:], body: Data()); return }
        let relative = decoded == "/" ? "index.html" : String(decoded.drop(while: { $0 == "/" }))
        let file = root.appendingPathComponent(relative).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else { send(connection, status: "404 Not Found", headers: [:], body: Data()); return }
        let types = ["html":"text/html; charset=utf-8", "js":"application/javascript; charset=utf-8", "css":"text/css; charset=utf-8", "svg":"image/svg+xml", "jpg":"image/jpeg", "mp3":"audio/mpeg"]
        var headers = ["Content-Type": types[file.pathExtension.lowercased()] ?? "application/octet-stream", "Accept-Ranges":"bytes", "Cache-Control":"no-store"]
        var body = data; var status = "200 OK"
        if let range = lines.first(where: { $0.lowercased().hasPrefix("range: bytes=") }), data.count > 0 {
            let value = range.components(separatedBy: "=").last ?? ""
            let bounds = value.split(separator: "-", omittingEmptySubsequences: false)
            if let start = bounds.first.flatMap({ Int($0) }), start >= 0, start < data.count {
                let end = min((bounds.count > 1 ? Int(bounds[1]) : nil) ?? (data.count-1), data.count-1)
                if end >= start { body = data.subdata(in: start..<(end+1)); status="206 Partial Content"; headers["Content-Range"]="bytes \(start)-\(end)/\(data.count)" }
            }
        }
        headers["Content-Length"] = String(body.count)
        send(connection, status: status, headers: headers, body: first[0] == "HEAD" ? Data() : body)
    }
    private func send(_ connection: NWConnection, status: String, headers: [String:String], body: Data) {
        var header = "HTTP/1.1 \(status)\r\nConnection: close\r\n"
        for (key,value) in headers { header += "\(key): \(value)\r\n" }
        var response = Data((header+"\r\n").utf8); response.append(body)
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
    deinit { listener?.cancel() }
}
