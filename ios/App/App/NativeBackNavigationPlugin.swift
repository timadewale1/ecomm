import UIKit
import Capacitor

@objc(NativeBackNavigationPlugin)
public class NativeBackNavigationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBackNavigationPlugin"
    public let jsName = "NativeBackNavigation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise)
    ]

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true

        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.webView else {
                call.reject("WKWebView is unavailable")
                return
            }

            // This is WKWebView's real interactive transition: the previous
            // page follows the user's finger and the swipe can be cancelled.
            webView.allowsBackForwardNavigationGestures = enabled
            call.resolve(["enabled": enabled])
        }
    }
}
