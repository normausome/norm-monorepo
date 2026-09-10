import SwiftUI

struct PlaybookScreen: View {
    @State private var screen = Screen.initial

    var body: some View {
        let routing = screen.routing

        NavigationStack {
            List {
                introSection
                GoalComposer(screen: $screen)
                PlaybookCard(routing: routing)
                VerificationCard(playbook: routing.playbook)
                creditsSection
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Playbook routing")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var introSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(.tint)
                    Badge(text: "pstack demo", style: .outline)
                }

                Text("How poteto-mode routes your goal")
                    .font(.title.weight(.semibold))

                Text(
                    "Type a plain-language engineering goal. This demo shows how `/poteto-mode` matches it to a playbook and why verification is built into every step — inspired by [pstack](https://github.com/cursor/plugins/tree/main/pstack)."
                )
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 4)
        }
    }

    private var creditsSection: some View {
        Section {
            Text(
                "Demo only — no real plugin install. Based on pstack playbooks by [@poteto](https://x.com/poteto)."
            )
            .font(.footnote)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
        }
    }
}
