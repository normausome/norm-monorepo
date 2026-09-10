import SwiftUI

/// Takes the whole `Screen` as a binding rather than five callbacks. That is safe
/// precisely because every stored field is `private(set)`: this view can only reach
/// the four transitions, so there is no way for it to invent an inconsistent state.
struct GoalComposer: View {
    @Binding var screen: Screen

    var body: some View {
        Section("Your goal") {
            TextField("Describe what you want the agent to do…", text: draftText)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.go)
                .onSubmit { screen.route() }

            Button {
                screen.route()
            } label: {
                Label("Route playbook", systemImage: "arrow.right")
            }

            Text("Try a sample")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            FlowLayout(spacing: 8) {
                ForEach(SampleGoals.all) { sample in
                    Button(sample.label) { screen.apply(sample) }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                }
            }

            Picker("Or pick a playbook", selection: pickerChoice) {
                ForEach(PickerChoice.all) { choice in
                    Text(choice.label).tag(choice)
                }
            }
            .pickerStyle(.menu)
        }
    }

    private var draftText: Binding<String> {
        Binding(get: { screen.draft }, set: { screen.editDraft($0) })
    }

    private var pickerChoice: Binding<PickerChoice> {
        Binding(get: { screen.selection }, set: { screen.select($0) })
    }
}
