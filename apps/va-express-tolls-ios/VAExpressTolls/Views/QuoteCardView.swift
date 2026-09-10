import SwiftUI

struct QuoteCardView: View {
    let estimate: CachedEstimateResponse
    let corridor: Corridor
    var stale = false
    var onSwitchCorridor: (CorridorId) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                badge("Unofficial estimate")
                badge(estimate.kind == .current ? "Current" : "Historical")
                badge(estimate.cache == .hit ? "Cached" : "Fresh")
            }
            Text(
                "from \(estimate.source.operatorName) · fetched \(EasternTimeFormat.display(estimate.source.fetchedAt)) · refreshes \(EasternTimeFormat.display(estimate.expiresAt))"
            )
            .font(.caption)
            .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(estimate.entry.label) → \(estimate.exit.label)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(MoneyFormat.displayTotal(estimate.total))
                    .font(estimate.total == 0 ? .title.bold() : .largeTitle.bold())
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }

            if estimate.legs.count > 1 {
                VStack(spacing: 0) {
                    ForEach(Array(estimate.legs.enumerated()), id: \.offset) { index, leg in
                        if index > 0 { Divider() }
                        HStack {
                            Text(leg.road)
                            Spacer()
                            Text(MoneyFormat.usd(leg.price))
                                .fontWeight(.medium)
                        }
                        .font(.subheadline)
                        .padding(.vertical, 8)
                    }
                }
                .padding(.horizontal, 4)
            }

            if !estimate.notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(estimate.notes, id: \.self) { note in
                        Text(note)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if stale {
                Text("This is the last successful estimate for this trip, not a new fetch.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            twoTollHint

            HStack {
                Text("Double-check on the operator’s site:")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                OfficialCalculatorLink(corridor: corridor, prominent: false)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var twoTollHint: some View {
        let tripText = "\(estimate.entry.label) → \(estimate.exit.label)"
        let transurban = corridor.id == .express495 || corridor.id == .express395 || corridor.id == .express95
        let touches495 = !transurban && tripText.range(of: #"i-495|495 express"#, options: [.regularExpression, .caseInsensitive]) != nil
        let touches66 = transurban && tripText.range(of: #"interstate 66|i-66"#, options: [.regularExpression, .caseInsensitive]) != nil

        if touches495 || touches66 {
            VStack(alignment: .leading, spacing: 8) {
                Text(
                    touches495
                        ? "Taking the 495 Express Lanes too? That’s a second toll."
                        : "Continuing onto I-66? That’s a second toll."
                )
                .font(.subheadline.weight(.semibold))
                if touches495 {
                    Button("Price the 495 leg") { onSwitchCorridor(.express495) }
                }
                if touches66 {
                    Button("Price I-66 Inside the Beltway") { onSwitchCorridor(.inside66) }
                    Button("I-66 Outside the Beltway") { onSwitchCorridor(.outside66) }
                }
            }
            .buttonStyle(.bordered)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
        }
    }

    private func badge(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color(uiColor: .secondarySystemFill), in: Capsule())
    }
}
