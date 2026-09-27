import UIKit
import Capacitor

@objc(NativeRefreshPlugin)
public class NativeRefreshPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeRefreshPlugin"
    public let jsName = "NativeRefresh"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginRefresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endRefresh", returnType: CAPPluginReturnPromise)
    ]

    private var refreshControl: UIRefreshControl?
    private var previousRefreshControl: UIRefreshControl?
    private weak var activeScrollView: UIScrollView?

    private var previousBounces: Bool?
    private var previousAlwaysBounceVertical: Bool?

    private var safetyTimer: Timer?
    private var isEnabled = false
    private var verticalOffset: CGFloat = 0

    private let safetyTimeout: TimeInterval = 20
    private let safeAreaClearance: CGFloat = 16

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true
        let tintColorHex = call.getString("tintColor")
        let requestedVerticalOffset = CGFloat(call.getDouble("verticalOffset") ?? 0)

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("NativeRefresh plugin unavailable")
                return
            }

            if enabled {
                self.enable(
                    tintColorHex: tintColorHex,
                    verticalOffset: requestedVerticalOffset,
                    call: call
                )
            } else {
                self.disable()
                call.resolve()
            }
        }
    }

    @objc func beginRefresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self,
                  self.isEnabled,
                  let control = self.refreshControl,
                  let scrollView = self.activeScrollView,
                  !control.isRefreshing
            else {
                call.resolve(["triggered": false])
                return
            }

            control.beginRefreshing()

            // beginRefreshing() does not reveal UIRefreshControl on its own.
            // Pull the WKWebView down by the standard refresh-control height;
            // ending the refresh restores the content offset natively.
            let revealDistance = max(control.bounds.height, 60)
            let targetY = -scrollView.adjustedContentInset.top - revealDistance
            scrollView.setContentOffset(
                CGPoint(x: scrollView.contentOffset.x, y: targetY),
                animated: true
            )

            self.emitRefresh(source: "home-tab")
            call.resolve(["triggered": true])
        }
    }

    @objc func endRefresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.stopSafetyTimer()
            self?.refreshControl?.endRefreshing()
            call.resolve()
        }
    }

    private func enable(
        tintColorHex: String?,
        verticalOffset: CGFloat,
        call: CAPPluginCall
    ) {
        guard let scrollView = webView?.scrollView else {
            call.reject("WKWebView scroll view is unavailable")
            return
        }

        if isEnabled {
            if let tintColorHex = tintColorHex,
               let tintColor = UIColor(hexString: tintColorHex) {
                refreshControl?.tintColor = tintColor
            }
            self.verticalOffset = verticalOffset
            if let refreshControl = refreshControl {
                applyVerticalOffset(to: refreshControl, in: scrollView)
            }
            call.resolve()
            return
        }

        previousBounces = scrollView.bounces
        previousAlwaysBounceVertical = scrollView.alwaysBounceVertical
        previousRefreshControl = scrollView.refreshControl
        activeScrollView = scrollView

        let control = UIRefreshControl()
        control.tintColor = UIColor(hexString: tintColorHex ?? "#f9531e") ?? .systemOrange
        self.verticalOffset = verticalOffset
        control.addTarget(self, action: #selector(handleRefreshControl(_:)), for: .valueChanged)

        refreshControl = control
        scrollView.bounces = true
        scrollView.alwaysBounceVertical = true
        scrollView.refreshControl = control
        applyVerticalOffset(to: control, in: scrollView)

        isEnabled = true
        call.resolve()
    }

    private func applyVerticalOffset(
        to control: UIRefreshControl,
        in scrollView: UIScrollView
    ) {
        scrollView.layoutIfNeeded()

        // WKWebView's refresh control sits at the very top of its native
        // scroll view, outside the CSS safe area. Clear the real device notch
        // or Dynamic Island, while retaining the caller's minimum offset for
        // devices that report no native top inset.
        let windowSafeTop = webView?.window?.safeAreaInsets.top ?? 0
        let safeTop = max(scrollView.safeAreaInsets.top, windowSafeTop)
        let effectiveOffset = max(verticalOffset, safeTop + safeAreaClearance)

        control.transform = CGAffineTransform(
            translationX: 0,
            y: effectiveOffset
        )
    }

    private func disable() {
        stopSafetyTimer()

        refreshControl?.endRefreshing()
        refreshControl?.removeTarget(self, action: #selector(handleRefreshControl(_:)), for: .valueChanged)

        if let scrollView = activeScrollView {
            if scrollView.refreshControl === refreshControl {
                scrollView.refreshControl = previousRefreshControl
            }

            if let previousBounces = previousBounces {
                scrollView.bounces = previousBounces
            }

            if let previousAlwaysBounceVertical = previousAlwaysBounceVertical {
                scrollView.alwaysBounceVertical = previousAlwaysBounceVertical
            }
        }

        refreshControl = nil
        previousRefreshControl = nil
        activeScrollView = nil
        previousBounces = nil
        previousAlwaysBounceVertical = nil
        verticalOffset = 0
        isEnabled = false
    }

    @objc private func handleRefreshControl(_ sender: UIRefreshControl) {
        emitRefresh(source: "pull")
    }

    private func emitRefresh(source: String) {
        startSafetyTimer()

        notifyListeners("refresh", data: [
            "triggeredAt": Int(Date().timeIntervalSince1970 * 1000),
            "source": source
        ])
    }

    private func startSafetyTimer() {
        stopSafetyTimer()

        safetyTimer = Timer.scheduledTimer(withTimeInterval: safetyTimeout, repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                self?.refreshControl?.endRefreshing()
            }
        }
    }

    private func stopSafetyTimer() {
        safetyTimer?.invalidate()
        safetyTimer = nil
    }
}

private extension UIColor {
    convenience init?(hexString: String) {
        var value = hexString.trimmingCharacters(in: .whitespacesAndNewlines)

        if value.hasPrefix("#") {
            value.removeFirst()
        }

        if value.count == 3 {
            value = value.map { "\($0)\($0)" }.joined()
        }

        guard value.count == 6,
              let rgb = UInt64(value, radix: 16) else {
            return nil
        }

        self.init(
            red: CGFloat((rgb >> 16) & 0xff) / 255.0,
            green: CGFloat((rgb >> 8) & 0xff) / 255.0,
            blue: CGFloat(rgb & 0xff) / 255.0,
            alpha: 1.0
        )
    }
}
