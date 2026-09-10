import MapKit
import SwiftUI

struct AdvancedEstimatorView: View {
    @Bindable var store: AdvancedStore
    var onAdjustLeg: (TripPreset) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Advanced · price a whole route")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                Label("Address to address", systemImage: "slider.horizontal.3")
                    .font(.title2.bold())
                Text(
                    "Type where you’re leaving from and where you’re going. We route the drive, work out which Express Lanes it runs beside, and price each one on its operator’s own calculator, right now, in one go. Unofficial — the overhead sign is the price you pay."
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            PlaceInputView(
                title: "From",
                placeholder: "e.g. Fredericksburg, VA",
                field: store.from,
                client: store.client
            ) { store.updateFrom($0) }

            HStack {
                Spacer()
                Button {
                    store.swap()
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("Swap from and to")
                Spacer()
            }

            PlaceInputView(
                title: "To",
                placeholder: "e.g. Tysons Corner Center",
                field: store.to,
                client: store.client
            ) { store.updateTo($0) }

            Button {
                Task { await store.submit() }
            } label: {
                HStack {
                    if store.isLoading { ProgressView() }
                    Text(store.isLoading ? "Routing and asking the operators…" : "Estimate tolls")
                    if !store.isLoading { Image(systemName: "arrow.right") }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!store.canSubmit)

            Text("Addresses, place names or lat, lng. Prices are for leaving right now.")
                .font(.caption)
                .foregroundStyle(.secondary)

            switch store.quote {
            case .idle:
                EmptyView()
            case .loading:
                EmptyView()
            case .failed(let message):
                VStack(alignment: .leading, spacing: 8) {
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text("We never guess a price. Switch to Simple mode to pick the trip by hand, or use the operators’ calculators.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
            case .ready(let result):
                RouteResultView(result: result, onAdjustLeg: onAdjustLeg)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.accentColor.opacity(0.25))
        }
    }
}

private struct PlaceInputView: View {
    let title: String
    let placeholder: String
    let field: PlaceField
    let client: TollAPIClient
    var onChange: (PlaceField) -> Void

    @State private var suggestions: [Place] = []
    @State private var geocodeTask: Task<Void, Never>?

    private var query: String { field.text.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var searchable: Bool {
        field.place == nil && query.count >= 3 && AdvancedStore.parseLatLng(query) == nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.medium))
            HStack {
                Image(systemName: "mappin")
                    .foregroundStyle(.secondary)
                TextField(placeholder, text: Binding(
                    get: { field.text },
                    set: { onChange(PlaceField(text: $0, place: nil)) }
                ))
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))

            if searchable, !suggestions.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(suggestions) { place in
                        Button {
                            onChange(PlaceField(text: place.label, place: place))
                            suggestions = []
                        } label: {
                            Text(place.label)
                                .font(.subheadline)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 8)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(uiColor: .separator).opacity(0.4))
                }
            }
        }
        .onChange(of: field.text) { _, _ in
            scheduleGeocode()
        }
        .onChange(of: field.place) { _, place in
            if place != nil { suggestions = [] }
        }
    }

    private func scheduleGeocode() {
        geocodeTask?.cancel()
        suggestions = []
        guard searchable else { return }
        let q = query
        geocodeTask = Task {
            try? await Task.sleep(for: .milliseconds(350))
            guard !Task.isCancelled else { return }
            do {
                let response = try await client.geocode(q)
                guard !Task.isCancelled else { return }
                suggestions = response.results
            } catch {
                guard !Task.isCancelled else { return }
                suggestions = []
            }
        }
    }
}

private struct RouteResultView: View {
    let result: RouteTollsResponse
    var onAdjustLeg: (TripPreset) -> Void

    private var pricedSum: Decimal? {
        let priced = result.legs.compactMap { $0.estimate?.total }
        guard result.total == nil, !priced.isEmpty else { return nil }
        return priced.reduce(0, +)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text("Unofficial estimate")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(uiColor: .tertiarySystemFill), in: Capsule())
                Text("Right now")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.accentColor.opacity(0.15), in: Capsule())
                Text(routeMeta)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("\(result.from.label) → \(result.to.label)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text(totalTitle)
                .font(result.legs.isEmpty || result.total == 0 ? .title2.bold() : .largeTitle.bold())
                .minimumScaleFactor(0.7)

            if result.legs.count > 1 {
                Text("\(result.legs.count) Express Lanes legs\(result.total != nil ? ", added up" : "")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            RouteMapView(result: result)
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            ForEach(Array(result.legs.enumerated()), id: \.element.id) { index, leg in
                AdvancedLegCard(index: index + 1, leg: leg, onAdjustLeg: onAdjustLeg)
            }

            ForEach(result.unmatched) { unmatched in
                VStack(alignment: .leading, spacing: 8) {
                    Label("\(unmatched.corridorName): not priced", systemImage: "exclamationmark.triangle")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.red)
                    Text(unmatched.reason)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let url = URL(string: unmatched.calculatorUrl) {
                        Link("Open the official calculator", destination: url)
                            .font(.caption.weight(.semibold))
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
            }

            ForEach(result.notes, id: \.self) { note in
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var routeMeta: String {
        let miles = Double(result.route.distanceMeters) / 1000.0 * 0.621371
        let minutes = Int((Double(result.route.durationSeconds) / 60.0).rounded())
        return String(format: "%.1f mi · about %d min · route by %@", miles, minutes, result.route.provider)
    }

    private var totalTitle: String {
        if result.legs.isEmpty { return "No Express Lanes toll" }
        if let total = result.total {
            return total == 0 ? "No toll right now" : MoneyFormat.usd(total)
        }
        if let partial = pricedSum {
            return "\(MoneyFormat.usd(partial)) + unpriced"
        }
        return "No price available"
    }
}

private struct AdvancedLegCard: View {
    let index: Int
    let leg: RouteLeg
    var onAdjustLeg: (TripPreset) -> Void

    private var schedule: ReversibleStatus? {
        ReversibleSchedule.isReversible(leg.corridor) ? ReversibleSchedule.status() : nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(index). \(leg.corridorName) · \(leg.direction.word)")
                        .font(.subheadline.weight(.semibold))
                    Text("\(leg.entry.label) → \(leg.exit.label)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Text(priceText)
                    .font(.title3.bold())
                    .foregroundStyle(leg.estimate?.total == nil ? Color.secondary : Color.primary)
            }

            if leg.match == .nearEnds {
                Text("Ramp matched near where you join or leave — check the interchange")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.orange.opacity(0.15), in: Capsule())
            } else {
                Text("Entry and exit on your route")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(uiColor: .tertiarySystemFill), in: Capsule())
            }

            if let estimate = leg.estimate {
                Text("from \(estimate.source.operatorName) · fetched \(EasternTimeFormat.display(estimate.source.fetchedAt))")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if let notice = leg.notice {
                Label(notice, systemImage: "info.circle")
                    .font(.caption)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            }

            if let schedule {
                scheduleHint(schedule)
            }

            if let error = leg.error {
                Label(error, systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            HStack {
                Button {
                    onAdjustLeg(
                        TripPreset(
                            corridor: leg.corridor,
                            direction: leg.direction,
                            entry: leg.entry.id,
                            exit: leg.exit.id
                        )
                    )
                } label: {
                    Label("Adjust in Simple mode", systemImage: "arrow.right")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                if let url = URL(string: leg.calculatorUrl) {
                    Link("Official calculator", destination: url)
                        .font(.caption.weight(.semibold))
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var priceText: String {
        guard let estimate = leg.estimate else { return "Not priced" }
        guard let total = estimate.total else { return "No price" }
        return total == 0 ? "No toll" : MoneyFormat.usd(total)
    }

    @ViewBuilder
    private func scheduleHint(_ schedule: ReversibleStatus) -> some View {
        let body: String = switch schedule {
        case .open(let direction, let until):
            "Published schedule: lanes run \(direction.word) until \(until) Eastern."
        case .closed(let next, let opensAt):
            "Published schedule: probably closed for reversal; \(next.word) usually opens \(opensAt) Eastern."
        }
        VStack(alignment: .leading, spacing: 2) {
            Text(body + " Approximate — holidays, events and incidents differ.")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Link("Schedule", destination: ReversibleSchedule.learnURL)
                .font(.caption2.weight(.semibold))
        }
    }
}

private struct RouteMapView: View {
    let result: RouteTollsResponse

    private var coordinates: [CLLocationCoordinate2D] {
        result.route.geometry.compactMap { pair in
            guard pair.count == 2 else { return nil }
            return CLLocationCoordinate2D(latitude: pair[0], longitude: pair[1])
        }
    }

    var body: some View {
        Map {
            if coordinates.count >= 2 {
                MapPolyline(coordinates: coordinates)
                    .stroke(.tint, lineWidth: 4)
            }
            Marker("From", coordinate: CLLocationCoordinate2D(latitude: result.from.lat, longitude: result.from.lng))
            Marker("To", coordinate: CLLocationCoordinate2D(latitude: result.to.lat, longitude: result.to.lng))
        }
        .mapStyle(.standard(elevation: .flat))
        .disabled(true)
    }
}
