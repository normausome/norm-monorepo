import SwiftUI
import TollsKit

@MainActor
@Observable
final class TripModel {
    let corridor: Corridor
    var direction: Direction
    var entries: [TripEntry]?
    var notice: String?
    var pointsError: String?
    var entryID = ""
    var exitID = ""
    var estimate: Estimate?
    var estimateError: String?
    var loading = false

    init(corridor: Corridor) {
        self.corridor = corridor
        self.direction = corridor.directions.first?.id ?? .nb
    }

    var entry: TripEntry? { entries?.first { $0.id == entryID } }
    var exits: [TripPoint] { entry?.exits ?? [] }
    var canSubmit: Bool { entry != nil && !exitID.isEmpty && !loading }

    func changeDirection(_ next: Direction) {
        guard next != direction else { return }
        direction = next
        entries = nil
        notice = nil
        pointsError = nil
        entryID = ""
        exitID = ""
        estimate = nil
        estimateError = nil
    }

    func selectEntry(_ id: String) {
        guard id != entryID else { return }
        entryID = id
        exitID = ""
        estimate = nil
        estimateError = nil
    }

    func selectExit(_ id: String) {
        guard id != exitID else { return }
        exitID = id
        estimate = nil
        estimateError = nil
    }

    func loadPoints() async {
        let direction = self.direction
        do {
            let api = try TollsAPI.fromSettings()
            let response = try await api.points(corridor: corridor.id, direction: direction)
            guard direction == self.direction else { return }
            entries = response.entries
            notice = response.notice
            pointsError = nil
        } catch {
            guard direction == self.direction else { return }
            pointsError = error.localizedDescription
        }
    }

    func submit() async {
        guard canSubmit else { return }
        loading = true
        estimate = nil
        estimateError = nil
        defer { loading = false }
        do {
            let api = try TollsAPI.fromSettings()
            estimate = try await api.estimate(corridor: corridor.id, direction: direction, entry: entryID, exit: exitID)
        } catch {
            estimateError = error.localizedDescription
        }
    }
}

struct TripView: View {
    @State private var model: TripModel

    init(corridor: Corridor) {
        _model = State(initialValue: TripModel(corridor: corridor))
    }

    var body: some View {
        Form {
            if model.corridor.directions.count > 1 {
                Section {
                    Picker("Direction", selection: Binding(
                        get: { model.direction },
                        set: { model.changeDirection($0) }
                    )) {
                        ForEach(model.corridor.directions) { option in
                            Text(option.label).tag(option.id)
                        }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                } header: {
                    Text("Direction")
                }
            }

            if let notice = model.notice {
                Section {
                    Label(notice, systemImage: "arrow.left.arrow.right")
                        .font(.callout)
                }
            }

            if model.corridor.id == "66-inside" {
                Section {
                    Label(InsideBeltwaySchedule.status().summary, systemImage: "clock")
                        .font(.callout)
                }
            }

            Section("Trip") {
                if let entries = model.entries {
                    Picker("Entry", selection: Binding(
                        get: { model.entryID },
                        set: { model.selectEntry($0) }
                    )) {
                        Text("Choose…").tag("")
                        ForEach(entries) { entry in
                            Text(entry.label).tag(entry.id)
                        }
                    }
                    Picker("Exit", selection: Binding(
                        get: { model.exitID },
                        set: { model.selectExit($0) }
                    )) {
                        Text("Choose…").tag("")
                        ForEach(model.exits) { exit in
                            Text(exit.label).tag(exit.id)
                        }
                    }
                    .disabled(model.entry == nil)
                } else if let error = model.pointsError {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                    Button("Retry") { Task { await model.loadPoints() } }
                } else {
                    ProgressView("Loading entries and exits…")
                }
            }

            Section {
                Button {
                    Task { await model.submit() }
                } label: {
                    HStack {
                        Spacer()
                        if model.loading {
                            ProgressView().padding(.trailing, 6)
                            Text("Asking the operator's calculator…")
                        } else {
                            Text("Get estimate").bold()
                        }
                        Spacer()
                    }
                }
                .disabled(!model.canSubmit)
            }

            if let estimate = model.estimate {
                EstimateResultView(estimate: estimate)
            } else if let error = model.estimateError {
                Section("No estimate") {
                    Label(error, systemImage: "xmark.octagon")
                        .foregroundStyle(.red)
                    Text("Nothing is guessed when the operator can't be read. Use the official calculator or the overhead signs.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Know before you go") {
                ForEach(CorridorNotes.notes(for: model.corridor.id), id: \.self) { note in
                    Text(note).font(.footnote)
                }
                Link(destination: model.corridor.calculatorUrl) {
                    Label("Open the official calculator", systemImage: "safari")
                }
            }

            Section {
                Text(CorridorNotes.disclaimer)
                Text(CorridorNotes.fragility)
            } header: {
                Text("Unofficial")
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
        .navigationTitle(model.corridor.name)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: model.direction) { await model.loadPoints() }
    }
}
