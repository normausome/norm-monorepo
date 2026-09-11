import SwiftUI

struct RootView: View {
    @Bindable var store: EstimatorStore
    @Bindable var advanced: AdvancedStore
    @Binding var themeRaw: String
    @State private var mode: AppMode = .simple
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ThemePreference {
        ThemePreference(rawValue: themeRaw) ?? .system
    }

    private var isEffectivelyDark: Bool {
        theme == .dark || (theme == .system && colorScheme == .dark)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    modePicker
                    if mode == .simple {
                        corridorPicker
                        if let supportError = store.supportError {
                            offlineBanner(supportError)
                        }
                        TripFormView(store: store)
                        RulesSection(store: store)
                    } else {
                        AdvancedEstimatorView(store: advanced) { preset in
                            Task {
                                mode = .simple
                                await store.applyPreset(preset)
                            }
                        }
                    }
                    sharedNotes
                    footer
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        var next = theme
                        next.toggle(against: colorScheme == .dark)
                        themeRaw = next.rawValue
                    } label: {
                        Image(systemName: isEffectivelyDark ? "sun.max" : "moon")
                    }
                    .accessibilityLabel(isEffectivelyDark ? "Switch to light mode" : "Switch to dark mode")
                }
            }
        }
        .task { await store.appear() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Northern Virginia", systemImage: "mappin.and.ellipse")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("Express Lanes toll estimate")
                .font(.largeTitle.bold())
                .fixedSize(horizontal: false, vertical: true)
            Text(
                "Five corridors, three operators, three separate calculator sites. Pick a corridor or paste a whole route — we fetch the number the official calculator shows. Unofficial; the overhead sign always wins."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    private var modePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("Mode", selection: $mode) {
                ForEach(AppMode.allCases) { option in
                    Text(option.title).tag(option)
                }
            }
            .pickerStyle(.segmented)
            Text(mode.hint)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var corridorPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("1. Choose corridor")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            VStack(spacing: 8) {
                ForEach(store.catalog.corridors) { corridor in
                    Button {
                        Task { await store.selectCorridor(corridor.id) }
                    } label: {
                        CorridorRow(
                            corridor: corridor,
                            selected: corridor.id == store.selectedId,
                            support: store.supportById[corridor.id]
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func offlineBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(.red)
            VStack(alignment: .leading, spacing: 4) {
                Text("Estimates are offline")
                    .font(.subheadline.weight(.semibold))
                Text("The API isn’t reachable (\(message)). Corridors still load from the bundled catalog. Use the official calculator if you need a price now.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.red.opacity(0.25))
        }
    }

    private var sharedNotes: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Before you go", systemImage: "exclamationmark.circle")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            ForEach(store.catalog.sharedNotes) { note in
                VStack(alignment: .leading, spacing: 4) {
                    Text(note.title)
                        .font(.subheadline.weight(.semibold))
                    Text(note.body)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var footer: some View {
        Text(
            "Unofficial guide. Prices are fetched from the operators’ own public calculators and shown as-is; rules summarized from VDOT, Transurban and 66 Express public pages. Not affiliated with any toll operator or E-ZPass."
        )
        .font(.caption2)
        .foregroundStyle(.secondary)
        .padding(.top, 4)
    }
}

private struct CorridorRow: View {
    let corridor: Corridor
    let selected: Bool
    let support: CorridorSupportInfo?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(corridor.name)
                    .font(.subheadline.weight(.semibold))
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if let support {
                    Text(support.supported ? "LIVE" : "LINK ONLY")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            selected
                                ? Color.white.opacity(0.2)
                                : Color(uiColor: .tertiarySystemFill),
                            in: Capsule()
                        )
                }
            }
            Text(corridor.pickerHint)
                .font(.caption)
                .foregroundStyle(selected ? Color.white.opacity(0.85) : Color.secondary)
                .multilineTextAlignment(.leading)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            selected ? Color.accentColor : Color(uiColor: .secondarySystemGroupedBackground),
            in: RoundedRectangle(cornerRadius: 12)
        )
        .foregroundStyle(selected ? Color.white : Color.primary)
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(selected ? Color.clear : Color(uiColor: .separator).opacity(0.35))
        }
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }
}

#Preview {
    RootView(
        store: EstimatorStore(client: TollAPIClient()),
        advanced: AdvancedStore(client: TollAPIClient()),
        themeRaw: .constant(ThemePreference.system.rawValue)
    )
}
