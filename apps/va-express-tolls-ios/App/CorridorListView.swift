import SwiftUI
import TollsKit

struct CorridorListView: View {
    @AppStorage(Defaults.baseURLKey) private var baseURL = Defaults.baseURL
    @State private var corridors: [Corridor]?
    @State private var error: String?
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            Group {
                if let corridors {
                    list(corridors)
                } else if let error {
                    ContentUnavailableView {
                        Label("Can't reach the API", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(error)
                        Text("Base URL: \(baseURL)").font(.footnote).monospaced()
                    } actions: {
                        Button("Retry") { Task { await load() } }
                        Button("API settings") { showSettings = true }
                    }
                } else {
                    ProgressView("Checking which calculators are automated…")
                }
            }
            .navigationTitle("VA Express Tolls")
            .toolbar {
                Button("API settings", systemImage: "gearshape") { showSettings = true }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .task(id: baseURL) { await load() }
        }
    }

    private func list(_ corridors: [Corridor]) -> some View {
        List {
            Section {
                ForEach(corridors) { corridor in
                    if corridor.supported {
                        NavigationLink(value: corridor) {
                            CorridorRow(corridor: corridor)
                        }
                    } else {
                        CorridorRow(corridor: corridor)
                            .foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Pick a corridor")
            } footer: {
                Text(CorridorNotes.disclaimer)
            }
        }
        .navigationDestination(for: Corridor.self) { corridor in
            TripView(corridor: corridor)
        }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let api = try TollsAPI.fromSettings()
            corridors = try await api.corridors()
            error = nil
        } catch {
            corridors = nil
            self.error = error.localizedDescription
        }
    }
}

private struct CorridorRow: View {
    let corridor: Corridor

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(corridor.name).font(.headline)
            Text(subtitle).font(.footnote).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }

    private var subtitle: String {
        if !corridor.supported { return corridor.reason ?? "Not automated yet" }
        return CorridorNotes.hint(for: corridor.id) ?? corridor.directions.map(\.label).joined(separator: " · ")
    }
}

#Preview {
    CorridorListView()
}
