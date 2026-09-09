import SwiftUI
import TollsKit

/// The dollar figure the server relayed, or an explicit "no price" — never a number of our own.
struct EstimateResultView: View {
    let estimate: Estimate

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text("\(estimate.entry.label) → \(estimate.exit.label)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let total = estimate.total {
                    Text(Formatting.usd(total))
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .accessibilityLabel("Estimated toll \(Formatting.usd(total))")
                    if total == 0 {
                        Text("No toll").font(.headline)
                    }
                } else {
                    Text("No price published")
                        .font(.title2.bold())
                    Text("The operator's feed has no usable price for this trip right now (closed or reversed lanes, or a feed gap). Trust the gates and signs.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Text("\(estimate.kind == .current ? "Current" : "Historical") estimate · \(estimate.source.operator) · fetched \(Formatting.easternTime(iso: estimate.source.fetchedAt))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)

            if estimate.legs.count > 1 {
                ForEach(Array(estimate.legs.enumerated()), id: \.offset) { _, leg in
                    LabeledContent(leg.road) {
                        Text(legPrice(leg)).monospacedDigit()
                    }
                }
            }
        } header: {
            Text("Estimate")
        } footer: {
            if !estimate.notes.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(estimate.notes, id: \.self) { note in
                        Text(note)
                    }
                }
            }
        }
    }

    private func legPrice(_ leg: EstimateLeg) -> String {
        if let status = leg.status, status.lowercased() == "closed" { return "closed" }
        return Formatting.usd(leg.price)
    }
}
