import SwiftUI

struct TripFormView: View {
    @Bindable var store: EstimatorStore

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("2. Price your trip")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                Text(store.selectedCorridor.name)
                    .font(.title2.bold())
                Text(
                    "Pick your entry and exit and we fetch the number the \(store.selectedCorridor.operatorName) calculator shows right now. Unofficial estimate — the overhead sign is the price you pay."
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            if let reason = store.unsupportedReason {
                Text(reason)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
                OfficialCalculatorLink(corridor: store.selectedCorridor, prominent: true)
            } else {
                form
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

    private var form: some View {
        VStack(alignment: .leading, spacing: 14) {
            LabeledPicker(title: "Direction") {
                Picker("Direction", selection: directionBinding) {
                    ForEach(store.directions) { option in
                        Text(option.label).tag(option.id)
                    }
                }
                .pickerStyle(.menu)
            }

            if let notice = store.notice {
                Label(notice, systemImage: "info.circle")
                    .font(.subheadline)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.accentColor.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
            }

            LabeledPicker(title: "Enter at") {
                Picker("Enter at", selection: entryBinding) {
                    Text(entryPlaceholder).tag("")
                    ForEach(store.entries) { entry in
                        Text(entry.label).tag(entry.id)
                    }
                }
                .pickerStyle(.menu)
                .disabled(store.entries.isEmpty)
            }

            LabeledPicker(title: "Exit at") {
                Picker("Exit at", selection: exitBinding) {
                    Text(store.selectedEntry == nil ? "Pick an entry first" : "Choose an exit…").tag("")
                    if let entry = store.selectedEntry {
                        ForEach(entry.exits) { exit in
                            Text(exit.label).tag(exit.id)
                        }
                    }
                }
                .pickerStyle(.menu)
                .disabled(store.selectedEntry == nil)
            }

            if store.supportsHistorical {
                historicalWhen
            }

            HStack(alignment: .center, spacing: 10) {
                Button {
                    Task { await store.fetchEstimate() }
                } label: {
                    HStack {
                        if case .loading = store.quote {
                            ProgressView()
                        }
                        Text(estimateButtonTitle)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!store.canEstimate)
            }

            if let pointsError = store.pointsError {
                Label(pointsError, systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            quoteRegion

            if showsOfficialFallback {
                HStack {
                    Text("Prefer the operator’s own map picker?")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    OfficialCalculatorLink(corridor: store.selectedCorridor, prominent: false)
                }
            }
        }
    }

    @ViewBuilder
    private var quoteRegion: some View {
        switch store.quote {
        case .idle:
            EmptyView()
        case .loading:
            HStack(spacing: 8) {
                ProgressView()
                Text("Asking the operator…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        case .ready(let estimate):
            QuoteCardView(estimate: estimate, corridor: store.selectedCorridor) { id in
                Task { await store.selectCorridor(id) }
            }
        case .unavailable(let message, let lastKnown):
            VStack(alignment: .leading, spacing: 10) {
                Label(message, systemImage: "exclamationmark.triangle")
                    .font(.subheadline)
                Text("We never guess a price. Use the official calculator instead:")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                OfficialCalculatorLink(corridor: store.selectedCorridor, prominent: false)
                if let lastKnown {
                    Text("Last known")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    QuoteCardView(estimate: lastKnown, corridor: store.selectedCorridor, stale: true) { id in
                        Task { await store.selectCorridor(id) }
                    }
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private var historicalWhen: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("When")
                .font(.subheadline.weight(.medium))
            Picker("When", selection: $store.when) {
                Text("Right now").tag(QuoteWhen.now)
                Text("A past weekday time").tag(QuoteWhen.past)
            }
            .pickerStyle(.segmented)

            if store.when == .past {
                DatePicker(
                    "Date",
                    selection: $store.pastDate,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .environment(\.timeZone, InsideBeltwaySchedule.timeZone)

                Picker("Time (Eastern)", selection: $store.pastTimeSlot) {
                    Text("Time (Eastern)…").tag("")
                    ForEach(InsideBeltwaySchedule.peakSlots(direction: store.direction), id: \.value) { slot in
                        Text(slot.label).tag(slot.value)
                    }
                }
                .pickerStyle(.menu)

                Text(
                    "Times are Eastern and limited to this direction’s tolled window — outside it the answer is always “No toll”. The VDOT calculator only prices times that have already happened."
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
    }

    private var directionBinding: Binding<Direction> {
        Binding(
            get: { store.direction },
            set: { next in Task { await store.selectDirection(next) } }
        )
    }

    private var entryBinding: Binding<String> {
        Binding(
            get: { store.entryId },
            set: { store.selectEntry($0) }
        )
    }

    private var exitBinding: Binding<String> {
        Binding(
            get: { store.exitId },
            set: { store.selectExit($0) }
        )
    }

    private var entryPlaceholder: String {
        if !store.entries.isEmpty { return "Choose an entry…" }
        if store.pointsError != nil { return "Unavailable" }
        return store.pointsLoading ? "Loading entries…" : "Loading entries…"
    }

    private var estimateButtonTitle: String {
        if case .loading = store.quote { return "Asking the operator…" }
        return "Get estimate"
    }

    private var showsOfficialFallback: Bool {
        switch store.quote {
        case .idle: true
        default: false
        }
    }
}

private struct LabeledPicker<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.medium))
            content
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct OfficialCalculatorLink: View {
    let corridor: Corridor
    var prominent: Bool

    var body: some View {
        Link(destination: corridor.calculatorURL) {
            Label("Open the official \(corridor.shortName) calculator", systemImage: "arrow.up.right.square")
                .font(prominent ? .headline : .subheadline)
        }
        .buttonStyle(.bordered)
        .controlSize(prominent ? .large : .regular)
    }
}
