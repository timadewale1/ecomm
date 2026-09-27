import Capacitor
import UIKit

private struct NativeFormPickerOption {
    let label: String
    let value: String
    let group: String
    let detail: String
    let searchTerms: [String]
}

private struct NativeFormPickerSection {
    let title: String
    let options: [NativeFormPickerOption]
}

private final class NativeFormPickerViewController: UITableViewController,
    UISearchResultsUpdating {

    private let pickerTitle: String
    private let options: [NativeFormPickerOption]
    private let allowsMultipleSelection: Bool
    private let leadingAction: String
    private let destructiveValues: Set<String>
    private let brandColor = UIColor(
        red: 249.0 / 255.0,
        green: 83.0 / 255.0,
        blue: 30.0 / 255.0,
        alpha: 1
    )
    private var selectedValues: Set<String>
    private var filteredOptions: [NativeFormPickerOption]
    private var displayedSections: [NativeFormPickerSection] = []
    private let searchController = UISearchController(searchResultsController: nil)

    var onComplete: (([String]) -> Void)?
    var onCancel: (() -> Void)?

    init(
        title: String,
        options: [NativeFormPickerOption],
        selectedValues: [String],
        destructiveValues: [String],
        allowsMultipleSelection: Bool,
        leadingAction: String
    ) {
        self.pickerTitle = title
        self.options = options
        self.filteredOptions = options
        self.selectedValues = Set(selectedValues)
        self.destructiveValues = Set(destructiveValues)
        self.allowsMultipleSelection = allowsMultipleSelection
        self.leadingAction = leadingAction
        super.init(style: .plain)
        rebuildSections()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        title = pickerTitle
        view.backgroundColor = .systemBackground
        tableView.backgroundColor = .systemBackground
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 60
        tableView.tableFooterView = UIView(frame: .zero)
        tableView.separatorInset = UIEdgeInsets(top: 0, left: 20, bottom: 0, right: 18)
        tableView.keyboardDismissMode = .onDrag

        if leadingAction == "back" {
            navigationItem.leftBarButtonItem = UIBarButtonItem(
                image: UIImage(systemName: "chevron.left"),
                style: .plain,
                target: self,
                action: #selector(cancelTapped)
            )
            navigationItem.leftBarButtonItem?.accessibilityLabel = "Back"
        } else {
            navigationItem.leftBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .cancel,
                target: self,
                action: #selector(cancelTapped)
            )
        }
        navigationItem.leftBarButtonItem?.tintColor = .label

        if allowsMultipleSelection {
            navigationItem.rightBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: self,
                action: #selector(doneTapped)
            )
            navigationItem.rightBarButtonItem?.tintColor = brandColor
        }

        if options.count > 8 {
            searchController.searchResultsUpdater = self
            searchController.obscuresBackgroundDuringPresentation = false
            searchController.searchBar.placeholder = "Search"
            searchController.searchBar.tintColor = brandColor
            navigationItem.searchController = searchController
            navigationItem.hidesSearchBarWhenScrolling = false
            definesPresentationContext = true
        }
    }

    @objc private func cancelTapped() {
        onCancel?()
    }

    @objc private func doneTapped() {
        onComplete?(orderedSelectedValues())
    }

    func updateSearchResults(for searchController: UISearchController) {
        let query = searchController.searchBar.text?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""
        filteredOptions = query.isEmpty
            ? options
            : options.filter { option in
                option.label.lowercased().contains(query) ||
                    option.searchTerms.contains { $0.lowercased().contains(query) }
            }
        rebuildSections()
        tableView.reloadData()
    }

    private func rebuildSections() {
        var orderedTitles: [String] = []
        var optionsByTitle: [String: [NativeFormPickerOption]] = [:]

        filteredOptions.forEach { option in
            let title = option.group
            if optionsByTitle[title] == nil {
                orderedTitles.append(title)
                optionsByTitle[title] = []
            }
            optionsByTitle[title, default: []].append(option)
        }

        displayedSections = orderedTitles.map {
            NativeFormPickerSection(title: $0, options: optionsByTitle[$0] ?? [])
        }
    }

    private func option(at indexPath: IndexPath) -> NativeFormPickerOption {
        displayedSections[indexPath.section].options[indexPath.row]
    }

    private func visibleDetail(for option: NativeFormPickerOption) -> String {
        let query = searchController.searchBar.text?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? ""
        guard !query.isEmpty else { return option.detail }
        let matches = option.searchTerms.filter { $0.lowercased().contains(query) }
        return matches.isEmpty ? option.detail : matches.prefix(3).joined(separator: " · ")
    }

    override func numberOfSections(in tableView: UITableView) -> Int {
        displayedSections.count
    }

    override func tableView(
        _ tableView: UITableView,
        titleForHeaderInSection section: Int
    ) -> String? {
        let title = displayedSections[section].title
        return title.isEmpty ? nil : title
    }

    override func tableView(
        _ tableView: UITableView,
        numberOfRowsInSection section: Int
    ) -> Int {
        displayedSections[section].options.count
    }

    override func tableView(
        _ tableView: UITableView,
        cellForRowAt indexPath: IndexPath
    ) -> UITableViewCell {
        let reuseIdentifier = "NativeFormPickerOption"
        let cell = tableView.dequeueReusableCell(withIdentifier: reuseIdentifier)
            ?? UITableViewCell(style: .subtitle, reuseIdentifier: reuseIdentifier)
        let option = option(at: indexPath)
        let detail = visibleDetail(for: option)

        if #available(iOS 14.0, *) {
            var content = UIListContentConfiguration.subtitleCell()
            content.text = option.label
            content.secondaryText = detail.isEmpty ? nil : detail
            content.textProperties.font = .systemFont(ofSize: 16, weight: .regular)
            content.textProperties.color = destructiveValues.contains(option.value)
                ? .systemRed
                : .label
            content.secondaryTextProperties.font = .systemFont(ofSize: 12, weight: .regular)
            content.secondaryTextProperties.color = .secondaryLabel
            content.secondaryTextProperties.numberOfLines = 1
            content.directionalLayoutMargins = NSDirectionalEdgeInsets(
                top: 0,
                leading: 18,
                bottom: 0,
                trailing: 8
            )
            cell.contentConfiguration = content
        } else {
            cell.textLabel?.text = option.label
            cell.textLabel?.font = .systemFont(ofSize: 16, weight: .regular)
            cell.textLabel?.textColor = destructiveValues.contains(option.value)
                ? .systemRed
                : .label
            cell.detailTextLabel?.text = detail.isEmpty ? nil : detail
        }
        cell.accessoryType = selectedValues.contains(option.value) ? .checkmark : .none
        cell.tintColor = brandColor
        cell.backgroundColor = .systemBackground
        cell.selectionStyle = .default
        cell.accessibilityTraits = selectedValues.contains(option.value)
            ? [.button, .selected]
            : [.button]
        return cell
    }

    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let option = option(at: indexPath)
        UISelectionFeedbackGenerator().selectionChanged()

        if allowsMultipleSelection {
            if selectedValues.contains(option.value) {
                selectedValues.remove(option.value)
            } else {
                selectedValues.insert(option.value)
            }
            tableView.reloadRows(at: [indexPath], with: .none)
            return
        }

        selectedValues = [option.value]
        tableView.reloadRows(at: [indexPath], with: .none)
        onComplete?([option.value])
    }

    private func orderedSelectedValues() -> [String] {
        options.compactMap { selectedValues.contains($0.value) ? $0.value : nil }
    }
}

@objc(NativeFormPickerPlugin)
public final class NativeFormPickerPlugin: CAPPlugin, CAPBridgedPlugin,
    UIAdaptivePresentationControllerDelegate {
    public let identifier = "NativeFormPickerPlugin"
    public let jsName = "NativeFormPicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
    ]


    private var activeCall: CAPPluginCall?

    @objc func present(_ call: CAPPluginCall) {
        let labels = call.getArray("labels", String.self) ?? []
        let values = call.getArray("values", String.self) ?? []
        let groups = call.getArray("groups", String.self) ?? []
        let details = call.getArray("details", String.self) ?? []
        let searchTerms = call.getArray("searchTerms", String.self) ?? []
        let selectedValues = call.getArray("selectedValues", String.self) ?? []
        let destructiveValues = call.getArray("destructiveValues", String.self) ?? []
        let allowsMultipleSelection = call.getBool("multiple", false)
        let leadingAction = call.getString("leadingAction") == "back"
            ? "back"
            : "cancel"
        let pickerTitle = call.getString("title")?.trimmingCharacters(
            in: .whitespacesAndNewlines
        ) ?? "Select an option"

        guard labels.count == values.count, !labels.isEmpty else {
            call.reject("Picker options are invalid", "INVALID_OPTIONS")
            return
        }

        var seenValues = Set<String>()
        let options = labels.indices.compactMap { index -> NativeFormPickerOption? in
            let label = labels[index]
            let value = values[index]
            let cleanLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
            let cleanValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleanLabel.isEmpty,
                  !cleanValue.isEmpty,
                  !seenValues.contains(cleanValue) else { return nil }
            seenValues.insert(cleanValue)
            let cleanGroup = index < groups.count
                ? groups[index].trimmingCharacters(in: .whitespacesAndNewlines)
                : ""
            let cleanDetail = index < details.count
                ? details[index].trimmingCharacters(in: .whitespacesAndNewlines)
                : ""
            let cleanSearchTerms = index < searchTerms.count
                ? searchTerms[index]
                    .components(separatedBy: "\n")
                    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                : []
            return NativeFormPickerOption(
                label: cleanLabel,
                value: cleanValue,
                group: cleanGroup,
                detail: cleanDetail,
                searchTerms: cleanSearchTerms
            )
        }

        guard !options.isEmpty else {
            call.reject("Picker options are empty", "INVALID_OPTIONS")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self,
                  let presenter = self.bridge?.viewController else {
                call.reject("Native picker is unavailable", "PICKER_UNAVAILABLE")
                return
            }

            guard self.activeCall == nil,
                  presenter.presentedViewController == nil else {
                call.reject("Another native sheet is already open", "PICKER_BUSY")
                return
            }

            let picker = NativeFormPickerViewController(
                title: pickerTitle,
                options: options,
                selectedValues: selectedValues,
                destructiveValues: destructiveValues,
                allowsMultipleSelection: allowsMultipleSelection,
                leadingAction: leadingAction
            )
            let navigationController = UINavigationController(rootViewController: picker)
            navigationController.modalPresentationStyle = .pageSheet

            picker.onComplete = { [weak self, weak navigationController] selected in
                navigationController?.dismiss(animated: true) {
                    self?.resolveActiveCall([
                        "cancelled": false,
                        "selectedValues": selected,
                    ])
                }
            }
            picker.onCancel = { [weak self, weak navigationController] in
                navigationController?.dismiss(animated: true) {
                    self?.resolveActiveCall([
                        "cancelled": true,
                        "action": leadingAction,
                    ])
                }
            }

            if #available(iOS 15.0, *),
               let sheet = navigationController.sheetPresentationController {
                sheet.detents = options.count > 8 ? [.medium(), .large()] : [.medium()]
                sheet.selectedDetentIdentifier = options.count > 8 ? .large : .medium
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 28
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.prefersEdgeAttachedInCompactHeight = true
                sheet.widthFollowsPreferredContentSizeWhenEdgeAttached = false
            }

            self.activeCall = call
            presenter.present(navigationController, animated: true) { [weak self] in
                navigationController.presentationController?.delegate = self
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
