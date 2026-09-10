import Foundation

struct PlaceField: Hashable, Sendable {
    var text: String = ""
    /// Set once the text has been resolved (suggestion pick or typed lat,lng).
    var place: Place? = nil
}

enum AdvancedQuoteState: Hashable, Sendable {
    case idle
    case loading
    case ready(RouteTollsResponse)
    case failed(String)
}

@MainActor
@Observable
final class AdvancedStore {
    let client: TollAPIClient

    var from = PlaceField()
    var to = PlaceField()
    var quote: AdvancedQuoteState = .idle

    @ObservationIgnored private var estimateTask: Task<Void, Never>?

    init(client: TollAPIClient) {
        self.client = client
    }

    var canSubmit: Bool {
        !from.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !to.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !isLoading
    }

    var isLoading: Bool {
        if case .loading = quote { return true }
        return false
    }

    func updateFrom(_ field: PlaceField) {
        from = field
        clearResult()
    }

    func updateTo(_ field: PlaceField) {
        to = field
        clearResult()
    }

    func swap() {
        let prior = from
        from = to
        to = prior
        clearResult()
    }

    func clearResult() {
        if case .ready = quote { quote = .idle }
        if case .failed = quote { quote = .idle }
    }

    func submit() async {
        guard canSubmit else { return }
        estimateTask?.cancel()
        quote = .loading
        let fromField = from
        let toField = to
        let task = Task {
            let next: AdvancedQuoteState
            do {
                let resolvedFrom = try await resolve(fromField, name: "From")
                let resolvedTo = try await resolve(toField, name: "To")
                guard !Task.isCancelled else { return }
                from = PlaceField(text: resolvedFrom.label, place: resolvedFrom)
                to = PlaceField(text: resolvedTo.label, place: resolvedTo)
                let result = try await client.routeTolls(from: resolvedFrom, to: resolvedTo)
                next = .ready(result)
            } catch is CancellationError {
                return
            } catch {
                let message = (error as? TollAPIError)?.message ?? error.localizedDescription
                next = .failed(message)
            }
            guard !Task.isCancelled else { return }
            quote = next
        }
        estimateTask = task
        await task.value
    }

    private func resolve(_ field: PlaceField, name: String) async throws -> Place {
        if let place = field.place { return place }
        if let direct = Self.parseLatLng(field.text) { return direct }
        let response = try await client.geocode(field.text)
        guard let first = response.results.first else {
            throw TollAPIError(
                message: "Couldn't find \"\(field.text)\" for \(name). Try a fuller address or pick a suggestion."
            )
        }
        return first
    }

    /// "38.79, -77.18" typed straight in skips the geocoder.
    nonisolated static func parseLatLng(_ text: String) -> Place? {
        let pattern = #"^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              match.numberOfRanges == 3,
              let latRange = Range(match.range(at: 1), in: text),
              let lngRange = Range(match.range(at: 2), in: text),
              let lat = Double(text[latRange]),
              let lng = Double(text[lngRange]),
              abs(lat) <= 90,
              abs(lng) <= 180
        else { return nil }
        return Place(label: "\(lat), \(lng)", lat: lat, lng: lng)
    }
}
