import Capacitor
import Contacts
import CoreLocation
import GooglePlaces
import MapKit
import UIKit

@objc(NativeMapsSupportPlugin)
public final class NativeMapsSupportPlugin: CAPPlugin, CAPBridgedPlugin,
    GMSAutocompleteViewControllerDelegate,
    UIAdaptivePresentationControllerDelegate {
    public let identifier = "NativeMapsSupportPlugin"
    public let jsName = "NativeMapsSupport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "autocomplete", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentAutocomplete", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "placeDetails", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reverseGeocode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "route", returnType: CAPPluginReturnPromise)
    ]

    private var configuredKey: String?
    private var sessionTokens: [String: GMSAutocompleteSessionToken] = [:]
    private let geocoder = CLGeocoder()
    private var activeAutocompleteCall: CAPPluginCall?

    @objc func configure(_ call: CAPPluginCall) {
        guard let apiKey = (Bundle.main.object(forInfoDictionaryKey: "MyThriftGoogleMapsAPIKey") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              !apiKey.isEmpty,
              apiKey != "REPLACE_WITH_IOS_RESTRICTED_KEY"
        else {
            call.reject("The native maps API key is not configured", "MAPS_CONFIGURATION")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Native maps support is unavailable", "MAPS_UNAVAILABLE")
                return
            }

            if self.configuredKey == apiKey {
                call.resolve(["configured": true, "apiKey": apiKey])
                return
            }

            let placesAccepted = GMSPlacesClient.provideAPIKey(apiKey)
            guard placesAccepted else {
                call.reject("The native maps API key could not be configured", "MAPS_CONFIGURATION")
                return
            }

            self.configuredKey = apiKey
            call.resolve(["configured": true, "apiKey": apiKey])
        }
    }

    @objc func autocomplete(_ call: CAPPluginCall) {
        guard ensureConfigured(call) else { return }
        guard let input = call.getString("input")?.trimmingCharacters(in: .whitespacesAndNewlines),
              input.count >= 3
        else {
            call.resolve(["predictions": []])
            return
        }

        let sessionID = normalizedSessionID(call.getString("sessionId"))

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Address search is unavailable", "PLACES_UNAVAILABLE")
                return
            }

            let filter = GMSAutocompleteFilter()
            filter.countries = ["NG"]
            let token = self.token(for: sessionID)

            GMSPlacesClient.shared().findAutocompletePredictions(
                fromQuery: input,
                filter: filter,
                sessionToken: token
            ) { predictions, error in
                if let error {
                    NSLog("[NativeMapsSupport] autocomplete failed code=%ld", (error as NSError).code)
                    call.reject("Address search is temporarily unavailable", "PLACES_SEARCH_FAILED", error)
                    return
                }

                let values: [[String: Any]] = (predictions ?? []).map { prediction in
                    [
                        "description": prediction.attributedFullText.string,
                        "place_id": prediction.placeID,
                        "primaryText": prediction.attributedPrimaryText.string,
                        "secondaryText": prediction.attributedSecondaryText?.string ?? ""
                    ]
                }
                call.resolve(["predictions": values])
            }
        }
    }

    @objc func presentAutocomplete(_ call: CAPPluginCall) {
        guard ensureConfigured(call) else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self,
                  let presenter = self.bridge?.viewController else {
                call.reject("Address selection is unavailable", "PLACES_UNAVAILABLE")
                return
            }
            guard self.activeAutocompleteCall == nil,
                  presenter.presentedViewController == nil else {
                call.reject("Another native sheet is already open", "PLACES_BUSY")
                return
            }

            let controller = GMSAutocompleteViewController()
            controller.delegate = self
            controller.primaryTextColor = .label
            controller.secondaryTextColor = .secondaryLabel
            controller.tableCellBackgroundColor = .systemBackground
            controller.tableCellSeparatorColor = .separator
            controller.tintColor = UIColor(
                red: 249.0 / 255.0,
                green: 83.0 / 255.0,
                blue: 30.0 / 255.0,
                alpha: 1
            )
            controller.placeFields = GMSPlaceField(rawValue:
                GMSPlaceField.coordinate.rawValue |
                GMSPlaceField.formattedAddress.rawValue |
                GMSPlaceField.name.rawValue
            )
            let filter = GMSAutocompleteFilter()
            filter.countries = ["NG"]
            controller.autocompleteFilter = filter

            let navigationController = UINavigationController(
                rootViewController: controller
            )
            navigationController.modalPresentationStyle = .pageSheet
            if #available(iOS 15.0, *),
               let sheet = navigationController.sheetPresentationController {
                sheet.detents = [.large()]
                sheet.prefersGrabberVisible = true
                sheet.preferredCornerRadius = 28
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
            }

            self.activeAutocompleteCall = call
            presenter.present(navigationController, animated: true) {
                navigationController.presentationController?.delegate = self
            }
        }
    }

    public func viewController(
        _ viewController: GMSAutocompleteViewController,
        didAutocompleteWith place: GMSPlace
    ) {
        let address = place.formattedAddress?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !address.isEmpty else {
            finishAutocomplete(
                from: viewController,
                error: ("That address could not be loaded", "PLACE_DETAILS_FAILED")
            )
            return
        }
        UISelectionFeedbackGenerator().selectionChanged()
        finishAutocomplete(from: viewController, result: [
            "cancelled": false,
            "address": address,
            "lat": place.coordinate.latitude,
            "lng": place.coordinate.longitude
        ])
    }

    public func viewController(
        _ viewController: GMSAutocompleteViewController,
        didFailAutocompleteWithError error: Error
    ) {
        NSLog(
            "[NativeMapsSupport] native autocomplete failed code=%ld",
            (error as NSError).code
        )
        finishAutocomplete(
            from: viewController,
            error: ("Address search is temporarily unavailable", "PLACES_SEARCH_FAILED")
        )
    }

    public func wasCancelled(_ viewController: GMSAutocompleteViewController) {
        finishAutocomplete(from: viewController, result: ["cancelled": true])
    }

    public func presentationControllerDidDismiss(
        _ presentationController: UIPresentationController
    ) {
        guard let call = activeAutocompleteCall else { return }
        activeAutocompleteCall = nil
        call.resolve(["cancelled": true])
    }

    @objc func placeDetails(_ call: CAPPluginCall) {
        guard ensureConfigured(call) else { return }
        guard let placeID = call.getString("placeId")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !placeID.isEmpty
        else {
            call.reject("A valid address selection is required", "INVALID_PLACE")
            return
        }

        let sessionID = normalizedSessionID(call.getString("sessionId"))

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Address details are unavailable", "PLACES_UNAVAILABLE")
                return
            }

            let fields = GMSPlaceField(rawValue:
                GMSPlaceField.coordinate.rawValue |
                GMSPlaceField.formattedAddress.rawValue
            )
            let token = self.token(for: sessionID)

            GMSPlacesClient.shared().fetchPlace(
                fromPlaceID: placeID,
                placeFields: fields,
                sessionToken: token
            ) { place, error in
                self.sessionTokens.removeValue(forKey: sessionID)

                if let error {
                    NSLog("[NativeMapsSupport] place details failed code=%ld", (error as NSError).code)
                    call.reject("That address could not be loaded", "PLACE_DETAILS_FAILED", error)
                    return
                }

                guard let place else {
                    call.reject("That address could not be loaded", "PLACE_DETAILS_FAILED")
                    return
                }

                call.resolve([
                    "address": place.formattedAddress ?? "",
                    "lat": place.coordinate.latitude,
                    "lng": place.coordinate.longitude
                ])
            }
        }
    }

    @objc func reverseGeocode(_ call: CAPPluginCall) {
        guard let latitude = call.getDouble("lat"),
              let longitude = call.getDouble("lng"),
              CLLocationCoordinate2DIsValid(
                CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
              )
        else {
            call.reject("The supplied location is invalid", "INVALID_COORDINATES")
            return
        }

        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Address lookup is unavailable", "GEOCODER_UNAVAILABLE")
                return
            }

            self.geocoder.reverseGeocodeLocation(CLLocation(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )) { placemarks, error in
                if let error {
                    NSLog("[NativeMapsSupport] reverse geocode failed code=%ld", (error as NSError).code)
                    call.reject("The address for this location could not be found", "REVERSE_GEOCODE_FAILED", error)
                    return
                }

                guard let placemark = placemarks?.first else {
                    call.reject("The address for this location could not be found", "REVERSE_GEOCODE_FAILED")
                    return
                }

                let formattedPostalAddress = placemark.postalAddress.map {
                    CNPostalAddressFormatter.string(from: $0, style: .mailingAddress)
                        .replacingOccurrences(of: "\n", with: ", ")
                }
                let address = formattedPostalAddress ?? [
                    placemark.name,
                    placemark.locality,
                    placemark.administrativeArea,
                    placemark.postalCode,
                    placemark.country
                ]
                    .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter { !$0.isEmpty }
                    .reduce(into: [String]()) { values, part in
                        if !values.contains(part) { values.append(part) }
                    }
                    .joined(separator: ", ")

                guard !address.isEmpty else {
                    call.reject("The address for this location could not be found", "REVERSE_GEOCODE_FAILED")
                    return
                }

                call.resolve(["address": address])
            }
        }
    }

    @objc func route(_ call: CAPPluginCall) {
        guard let originObject = call.getObject("origin"),
              let destinationObject = call.getObject("destination"),
              let origin = coordinate(from: originObject),
              let destination = coordinate(from: destinationObject)
        else {
            call.reject("The route locations are invalid", "INVALID_ROUTE")
            return
        }

        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: origin))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile
        request.requestsAlternateRoutes = false

        MKDirections(request: request).calculate { response, error in
            if let error {
                NSLog("[NativeMapsSupport] route failed code=%ld", (error as NSError).code)
                call.reject("A driving route could not be found", "ROUTE_UNAVAILABLE", error)
                return
            }

            guard let route = response?.routes.first else {
                call.reject("A driving route could not be found", "ROUTE_UNAVAILABLE")
                return
            }

            call.resolve([
                "coordinates": self.serializedCoordinates(from: route.polyline),
                "distanceMeters": route.distance,
                "expectedTravelTimeSeconds": route.expectedTravelTime
            ])
        }
    }

    private func ensureConfigured(_ call: CAPPluginCall) -> Bool {
        guard configuredKey != nil else {
            call.reject("Native maps have not been configured", "MAPS_CONFIGURATION")
            return false
        }
        return true
    }

    private func finishAutocomplete(
        from viewController: UIViewController,
        result: JSObject? = nil,
        error: (message: String, code: String)? = nil
    ) {
        let call = activeAutocompleteCall
        activeAutocompleteCall = nil
        viewController.navigationController?.dismiss(animated: true) {
            if let error {
                call?.reject(error.message, error.code)
            } else {
                call?.resolve(result ?? ["cancelled": true])
            }
        }
    }

    private func normalizedSessionID(_ value: String?) -> String {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? UUID().uuidString : trimmed
    }

    private func token(for sessionID: String) -> GMSAutocompleteSessionToken {
        if let existing = sessionTokens[sessionID] { return existing }
        let token = GMSAutocompleteSessionToken.init()
        sessionTokens[sessionID] = token
        return token
    }

    private func coordinate(from object: JSObject) -> CLLocationCoordinate2D? {
        guard let latitude = number(from: object["lat"]),
              let longitude = number(from: object["lng"])
        else { return nil }

        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        return CLLocationCoordinate2DIsValid(coordinate) ? coordinate : nil
    }

    private func number(from value: Any?) -> Double? {
        if let number = value as? NSNumber { return number.doubleValue }
        if let value = value as? Double { return value }
        if let value = value as? Int { return Double(value) }
        return nil
    }

    private func serializedCoordinates(from polyline: MKPolyline) -> [[String: Double]] {
        guard polyline.pointCount > 0 else { return [] }

        var coordinates = [CLLocationCoordinate2D](
            repeating: CLLocationCoordinate2D(),
            count: polyline.pointCount
        )
        polyline.getCoordinates(
            &coordinates,
            range: NSRange(location: 0, length: polyline.pointCount)
        )

        let maximumPoints = 500
        let step = max(1, Int(ceil(Double(coordinates.count) / Double(maximumPoints))))
        var serialized = coordinates.enumerated().compactMap { index, coordinate -> [String: Double]? in
            guard index % step == 0 else { return nil }
            return ["lat": coordinate.latitude, "lng": coordinate.longitude]
        }

        if let last = coordinates.last,
           serialized.last?["lat"] != last.latitude || serialized.last?["lng"] != last.longitude {
            serialized.append(["lat": last.latitude, "lng": last.longitude])
        }
        return serialized
    }
}
