import SwiftUI
import WebKit
import UIKit
import AVFoundation

@main struct GuessingArenaApp: App {
    var body: some Scene { WindowGroup { RootView() } }
}

struct RootView: View {
    @StateObject private var assets = LocalAssetServer()
    @State private var useServer = false
    @State private var showServer = false
    @AppStorage("legacyServer") private var server = "https://punch-pals-rps-2026.eternalknot8.chatgpt.site"
    @State private var draft = ""
    var body: some View {
        VStack(spacing:0) {
            if useServer { HStack {
                Text("猜拳竞技塔").font(.headline)
                Spacer()
                Button("手机直连") { useServer=false }
                Button("服务器") { draft=server;showServer=true }
            }.padding(.horizontal).padding(.vertical,8).background(Color(red:0.97,green:0.76,blue:0.82)) }
            if useServer,let url=URL(string:server),url.scheme?.lowercased()=="https" {
                GameWebView(url:url,direct:false,openServer:{ _ in }).id("server:"+server)
            } else if assets.ready {
                GameWebView(url:URL(string:"http://127.0.0.1:\(LocalAssetServer.port)/index.html")!,direct:true,openServer:{ value in
                    if let u=URL(string:value),u.scheme?.lowercased()=="https",u.host != nil,u.user==nil {server=value;useServer=true}
                }).id("direct").ignoresSafeArea()
            } else {
                Spacer();Text(assets.error.isEmpty ? "正在启动游戏…" : assets.error).padding();Spacer()
            }
        }
        .onAppear { assets.start() }
        .sheet(isPresented:$showServer) {
            NavigationView { Form {
                Section(header:Text("HTTPS 游戏服务器"), footer:Text("两位玩家需连接同一台可访问的服务器。更换服务器不会自动迁移钱包。")) {
                    TextField("https://example.com",text:$draft).keyboardType(.URL).autocapitalization(.none).disableAutocorrection(true)
                }
                Button("连接") { let text=draft.trimmingCharacters(in:.whitespacesAndNewlines);if let u=URL(string:text),u.scheme?.lowercased()=="https",u.host != nil,u.user==nil {server=text;useServer=true;showServer=false} }
            }.navigationTitle("服务器").navigationBarTitleDisplayMode(.inline).toolbar {ToolbarItem(placement:.cancellationAction){Button("取消"){showServer=false}}} }
        }
    }
}

struct GameWebView: UIViewRepresentable {
    let url:URL
    let direct:Bool
    let openServer:(String)->Void
    func makeCoordinator()->Coordinator { Coordinator(direct:direct,openServer:openServer) }
    func makeUIView(context:Context)->WKWebView {
        let config=WKWebViewConfiguration();config.websiteDataStore = .default();config.allowsInlineMediaPlayback=true
        do { try AVAudioSession.sharedInstance().setCategory(.ambient,options:[.mixWithOthers]) } catch { NSLog("Audio session unavailable") }
        if direct {
            config.userContentController.addScriptMessageHandler(context.coordinator,contentWorld:.page,name:"lan")
            let bridge="""
            window.LanBridge={
              startHost:(offer)=>window.webkit.messageHandlers.lan.postMessage({action:'startHost',offer}),
              getOffer:(code)=>window.webkit.messageHandlers.lan.postMessage({action:'getOffer',code}),
              sendAnswer:(code,answer)=>window.webkit.messageHandlers.lan.postMessage({action:'sendAnswer',code,answer}),
              getAnswer:()=>window.webkit.messageHandlers.lan.postMessage({action:'getAnswer'}),
              stop:()=>window.webkit.messageHandlers.lan.postMessage({action:'stop'})
            };
            window.ServerMode={open:(url)=>window.webkit.messageHandlers.lan.postMessage({action:'server',url})};
            window.AppHaptics={tap:()=>window.webkit.messageHandlers.lan.postMessage({action:'haptic'}).catch(()=>{})};
            window.AppShare={sharePng:(data)=>window.webkit.messageHandlers.lan.postMessage({action:'sharePng',data})};
            """
            config.userContentController.addUserScript(WKUserScript(source:bridge,injectionTime:.atDocumentStart,forMainFrameOnly:true))
        }
        let view=WKWebView(frame:.zero,configuration:config);view.scrollView.bounces=false;view.scrollView.contentInsetAdjustmentBehavior = .never;view.navigationDelegate=context.coordinator;view.uiDelegate=context.coordinator;context.coordinator.view=view
        view.load(URLRequest(url:url));return view
    }
    func updateUIView(_ view:WKWebView,context:Context) {}
    static func dismantleUIView(_ view:WKWebView,coordinator:Coordinator) { view.stopLoading();coordinator.lan.stop{_ in} }

    final class Coordinator:NSObject,WKNavigationDelegate,WKUIDelegate,WKScriptMessageHandlerWithReply {
        let direct:Bool;let lan=LanPeer();let openServer:(String)->Void;weak var view:WKWebView?
        init(direct:Bool,openServer:@escaping(String)->Void){self.direct=direct;self.openServer=openServer}
        func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage,replyHandler:@escaping(Any?,String?)->Void) {
            guard direct,message.frameInfo.isMainFrame,message.frameInfo.request.url?.host=="127.0.0.1",let data=message.body as? [String:Any],let action=data["action"] as? String else {replyHandler(nil,"无效请求");return}
            let reply:(String)->Void={ result in replyHandler(result,nil) }
            switch action {
            case "startHost":lan.startHost(data["offer"] as? String ?? "",reply:reply)
            case "getOffer":lan.getOffer(data["code"] as? String ?? "",reply:reply)
            case "sendAnswer":lan.sendAnswer(data["code"] as? String ?? "",value:data["answer"] as? String ?? "",reply:reply)
            case "getAnswer":lan.getAnswer(reply)
            case "stop":lan.stop(reply)
            case "haptic":replyHandler("ok",nil);DispatchQueue.main.async { UIImpactFeedbackGenerator(style:.light).impactOccurred() }
            case "sharePng":
                guard let value=data["data"] as? String,value.hasPrefix("data:image/png;base64,"),value.count<4000000,let bytes=Data(base64Encoded:String(value.dropFirst(22))),let image=UIImage(data:bytes) else {replyHandler(nil,"战绩图无效");return}
                replyHandler("ok",nil);DispatchQueue.main.async { guard let root=self.presenter() else {return};let controller=UIActivityViewController(activityItems:[image],applicationActivities:nil);controller.popoverPresentationController?.sourceView=root.view;controller.popoverPresentationController?.sourceRect=CGRect(x:root.view.bounds.midX,y:root.view.bounds.midY,width:1,height:1);root.present(controller,animated:true) }

            case "server":
                guard let value=data["url"] as? String,let u=URL(string:value),u.scheme?.lowercased()=="https",u.host != nil,u.user==nil else {replyHandler(nil,"服务器地址无效");return}
                replyHandler("ok",nil);DispatchQueue.main.async { self.openServer(value) }
            default:replyHandler(nil,"无效操作")
            }
        }
        func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void) {
            guard let target=navigationAction.request.url else {decisionHandler(.cancel);return}
            if direct {
                if target.host=="127.0.0.1",target.port==Int(LocalAssetServer.port),target.scheme=="http" {decisionHandler(.allow);return}
            } else if target.scheme?.lowercased()=="https",target.host==webView.url?.host || webView.url==nil {decisionHandler(.allow);return}
            decisionHandler(.cancel);if target.scheme?.lowercased()=="https" {UIApplication.shared.open(target)}
        }
        private func presenter()->UIViewController? {var root=view?.window?.rootViewController;while let next=root?.presentedViewController{root=next};return root}
        func webView(_ webView:WKWebView,runJavaScriptAlertPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping()->Void) {
            guard let root=presenter() else {completionHandler();return};let alert=UIAlertController(title:nil,message:message,preferredStyle:.alert);alert.addAction(UIAlertAction(title:"确定",style:.default){_ in completionHandler()});root.present(alert,animated:true)
        }
        func webView(_ webView:WKWebView,runJavaScriptConfirmPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping(Bool)->Void) {
            guard let root=presenter() else {completionHandler(false);return};let alert=UIAlertController(title:nil,message:message,preferredStyle:.alert);alert.addAction(UIAlertAction(title:"取消",style:.cancel){_ in completionHandler(false)});alert.addAction(UIAlertAction(title:"确定",style:.default){_ in completionHandler(true)});root.present(alert,animated:true)
        }
    }
}
