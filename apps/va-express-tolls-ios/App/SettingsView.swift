import SwiftUI
import TollsKit

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(Defaults.baseURLKey) private var baseURL = Defaults.baseURL
    @State private var draft = ""

    private var validationMessage: String? {
        do {
            _ = try TollsAPI(baseURLString: draft)
            return nil
        } catch {
            return error.localizedDescription
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("http://localhost:8787", text: $draft)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .font(.body.monospaced())
                    if let validationMessage {
                        Text(validationMessage).font(.footnote).foregroundStyle(.red)
                    }
                } header: {
                    Text("va-express-tolls API base URL")
                } footer: {
                    Text("Simulator: keep localhost and run `bun run dev:api` in apps/va-express-tolls on this Mac. Device: use the Mac's LAN IP (http is allowed for local networks only) or an https deployment.")
                }

                Section {
                    Button("Reset to localhost") { draft = Defaults.baseURL }
                }
            }
            .navigationTitle("API settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        baseURL = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                        dismiss()
                    }
                    .disabled(validationMessage != nil)
                }
            }
            .onAppear { draft = baseURL }
        }
    }
}
