import SwiftUI

/// The routed result. Takes `Routing` and nothing else — no separate score,
/// confidence, or keyword parameters to keep in sync.
struct PlaybookCard: View {
    let routing: Routing

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                FlowLayout(spacing: 8) {
                    Badge(text: "Routed playbook", style: .tinted)
                    Badge(
                        text: "\(routing.confidence.rawValue) confidence",
                        style: routing.confidence.badgeStyle
                    )
                    .accessibilityLabel("\(routing.confidence.rawValue) confidence")
                    if let score = routing.scoreBadge {
                        Badge(text: "score \(score)", style: .outline)
                            .accessibilityLabel("score \(score)")
                    }
                }

                Text(routing.playbook.name)
                    .font(.title2.weight(.semibold))
                Text(routing.playbook.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if !routing.matchedKeywords.isEmpty {
                    FlowLayout(spacing: 6) {
                        ForEach(routing.matchedKeywords, id: \.self) { keyword in
                            Badge(text: keyword, style: .outline)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(
                        "Matched keywords: \(routing.matchedKeywords.joined(separator: ", "))"
                    )
                }

                Text("Playbook steps")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                ForEach(Array(routing.playbook.steps.enumerated()), id: \.element) { index, step in
                    HStack(alignment: .top, spacing: 12) {
                        Text("\(index + 1)")
                            .font(.caption.weight(.semibold))
                            .frame(width: 24, height: 24)
                            .background(.tint.opacity(0.12), in: Circle())
                            .foregroundStyle(.tint)
                        Text(step)
                            .font(.subheadline)
                    }
                }

                Text("Skills invoked")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                FlowLayout(spacing: 8) {
                    ForEach(routing.playbook.skills, id: \.self) { skill in
                        Badge(text: skill, style: .tinted)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// "Verification is first-class" callout. Takes the playbook, not the routing —
/// it genuinely does not care how the playbook was chosen.
struct VerificationCard: View {
    let playbook: Playbook

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                Label("Verification is first-class", systemImage: "checkmark.shield.fill")
                    .font(.headline)
                    .foregroundStyle(.tint)

                Text(
                    "pstack treats verification as a core principle — not an afterthought. The \(Text(playbook.verification.principle).font(.body.monospaced())) principle applies here."
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)

                ForEach(playbook.verification.checks, id: \.self) { check in
                    Label(check, systemImage: "checkmark")
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
