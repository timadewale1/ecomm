import UIKit
import Capacitor

private struct NativeHistoryOption {
    let id: String
    let title: String
    let type: String
}

private final class NavigationHistorySheetViewController: UIViewController,
    UITableViewDataSource,
    UITableViewDelegate {

    private let sheetTitle: String
    private let sheetMessage: String?
    private let options: [NativeHistoryOption]
    private let tableView = UITableView(frame: .zero, style: .plain)

    var onSelect: ((String) -> Void)?
    var onCancel: (() -> Void)?

    init(title: String, message: String?, options: [NativeHistoryOption]) {
        self.sheetTitle = title
        self.sheetMessage = message
        self.options = options
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = .systemFont(ofSize: 20, weight: .semibold)
        titleLabel.textColor = .label
        titleLabel.text = sheetTitle
        titleLabel.numberOfLines = 1

        let messageLabel = UILabel()
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = .systemFont(ofSize: 13, weight: .regular)
        messageLabel.textColor = .secondaryLabel
        messageLabel.text = sheetMessage
        messageLabel.numberOfLines = 2
        messageLabel.isHidden = sheetMessage?.isEmpty != false

        let labels = UIStackView(arrangedSubviews: [titleLabel, messageLabel])
        labels.translatesAutoresizingMaskIntoConstraints = false
        labels.axis = .vertical
        labels.alignment = .fill
        labels.spacing = 3

        let closeButton = UIButton(type: .system)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeButton.tintColor = .label
        closeButton.backgroundColor = .secondarySystemBackground
        closeButton.layer.cornerRadius = 19
        closeButton.accessibilityLabel = "Close browsing history"
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        let header = UIView()
        header.translatesAutoresizingMaskIntoConstraints = false
        header.addSubview(labels)
        header.addSubview(closeButton)

        let divider = UIView()
        divider.translatesAutoresizingMaskIntoConstraints = false
        divider.backgroundColor = .separator
        header.addSubview(divider)

        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.dataSource = self
        tableView.delegate = self
        tableView.rowHeight = 56
        tableView.backgroundColor = .systemBackground
        tableView.separatorInset = UIEdgeInsets(top: 0, left: 62, bottom: 0, right: 18)
        tableView.tableFooterView = UIView(frame: .zero)
        tableView.alwaysBounceVertical = options.count > 6

        view.addSubview(header)
        view.addSubview(tableView)

        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 18),
            header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            header.heightAnchor.constraint(equalToConstant: 82),

            labels.leadingAnchor.constraint(equalTo: header.leadingAnchor, constant: 20),
            labels.centerYAnchor.constraint(equalTo: header.centerYAnchor, constant: -4),
            labels.trailingAnchor.constraint(lessThanOrEqualTo: closeButton.leadingAnchor, constant: -12),

            closeButton.trailingAnchor.constraint(equalTo: header.trailingAnchor, constant: -18),
            closeButton.centerYAnchor.constraint(equalTo: labels.centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 38),
            closeButton.heightAnchor.constraint(equalToConstant: 38),

            divider.leadingAnchor.constraint(equalTo: header.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: header.trailingAnchor),
            divider.bottomAnchor.constraint(equalTo: header.bottomAnchor),
            divider.heightAnchor.constraint(equalToConstant: 0.5),

            tableView.topAnchor.constraint(equalTo: header.bottomAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
        ])
    }

    @objc private func closeTapped() {
        onCancel?()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        options.count
    }

    func tableView(
        _ tableView: UITableView,
        cellForRowAt indexPath: IndexPath
    ) -> UITableViewCell {
        let reuseIdentifier = "NavigationHistoryOption"
        let cell = tableView.dequeueReusableCell(withIdentifier: reuseIdentifier)
            ?? UITableViewCell(style: .default, reuseIdentifier: reuseIdentifier)
        let option = options[indexPath.row]

        let icon = UIImage(systemName: iconName(for: option.type))
        let tintColor = option.type == "origin"
            ? UIColor(red: 249.0 / 255.0, green: 83.0 / 255.0, blue: 30.0 / 255.0, alpha: 1)
            : UIColor.secondaryLabel

        if #available(iOS 14.0, *) {
            var content = cell.defaultContentConfiguration()
            content.text = option.title
            content.textProperties.font = .systemFont(ofSize: 16, weight: .medium)
            content.textProperties.color = .label
            content.image = icon
            content.imageProperties.tintColor = tintColor
            content.imageProperties.maximumSize = CGSize(width: 22, height: 22)
            content.directionalLayoutMargins = NSDirectionalEdgeInsets(
                top: 0,
                leading: 18,
                bottom: 0,
                trailing: 12
            )
            cell.contentConfiguration = content
        } else {
            cell.textLabel?.text = option.title
            cell.textLabel?.font = .systemFont(ofSize: 16, weight: .medium)
            cell.textLabel?.textColor = .label
            cell.imageView?.image = icon
            cell.imageView?.tintColor = tintColor
        }
        cell.accessoryType = .disclosureIndicator
        cell.backgroundColor = .systemBackground
        cell.selectionStyle = .default
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        onSelect?(options[indexPath.row].id)
    }

    private func iconName(for type: String) -> String {
        switch type {
        case "origin":
            return "house"
        case "store":
            return "storefront"
        default:
            return "arrow.uturn.backward"
        }
    }
}

@objc(NativeNavigationHistoryPlugin)
public class NativeNavigationHistoryPlugin: CAPPlugin, CAPBridgedPlugin,
    UIAdaptivePresentationControllerDelegate {
    public let identifier = "NativeNavigationHistoryPlugin"
    public let jsName = "NativeNavigationHistory"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
    ]


    private var activeCall: CAPPluginCall?

    @objc func present(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "Browsing history"
        let message = call.getString("message")
        let rawOptions = call.getArray("options", JSObject.self) ?? []
        let options = rawOptions.compactMap { option -> NativeHistoryOption? in
            guard let identifier = option["id"] as? String,
                  let optionTitle = option["title"] as? String,
                  !identifier.isEmpty,
                  !optionTitle.isEmpty else {
                return nil
            }

            return NativeHistoryOption(
                id: identifier,
                title: optionTitle,
                type: option["type"] as? String ?? "product"
            )
        }

        guard !options.isEmpty else {
            call.resolve(["cancelled": true])
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let viewController = self.bridge?.viewController else {
                call.reject("Native navigation history is unavailable")
                return
            }

            guard self.activeCall == nil,
                  viewController.presentedViewController == nil else {
                call.reject("Another native sheet is already open")
                return
            }

            let historySheet = NavigationHistorySheetViewController(
                title: title,
                message: message,
                options: options
            )
            historySheet.modalPresentationStyle = .pageSheet

            historySheet.onSelect = { [weak self, weak historySheet] identifier in
                historySheet?.dismiss(animated: true) {
                    self?.resolveActiveCall([
                        "selectedId": identifier,
                        "cancelled": false,
                    ])
                }
            }
            historySheet.onCancel = { [weak self, weak historySheet] in
                historySheet?.dismiss(animated: true) {
                    self?.resolveActiveCall(["cancelled": true])
                }
            }

            if #available(iOS 15.0, *),
               let sheet = historySheet.sheetPresentationController {
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 28
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.prefersEdgeAttachedInCompactHeight = true
                sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = false

                if #available(iOS 16.0, *) {
                    let height = min(
                        max(260, CGFloat(132 + options.count * 56)),
                        UIScreen.main.bounds.height * 0.62
                    )
                    let identifier = UISheetPresentationController.Detent.Identifier(
                        "navigationHistory"
                    )
                    sheet.detents = [
                        .custom(identifier: identifier) { _ in height },
                    ]
                    sheet.selectedDetentIdentifier = identifier
                } else {
                    sheet.detents = [.medium()]
                }
            }

            self.activeCall = call
            viewController.present(historySheet, animated: true) { [weak self, weak historySheet] in
                historySheet?.presentationController?.delegate = self
            }
        }
    }

    public func presentationControllerDidDismiss(
        _ presentationController: UIPresentationController
    ) {
        resolveActiveCall(["cancelled": true])
    }

    private func resolveActiveCall(_ data: JSObject) {
        guard let call = activeCall else { return }
        activeCall = nil
        call.resolve(data)
    }
}
