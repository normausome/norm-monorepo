import Foundation

@MainActor
@Observable
final class EstimatorStore {
    let catalog: CorridorCatalog
    let client: TollAPIClient

    var selectedId: CorridorId
    var supportById: [CorridorId: CorridorSupportInfo] = [:]
    var supportError: String?

    var direction: Direction
    var entries: [TripEntry] = []
    var notice: String?
    var pointsError: String?
    var pointsLoading = false

    var entryId = ""
    var exitId = ""

    var when: QuoteWhen = .now
    var pastDate: Date
    var pastTimeSlot = ""

    var quote: QuoteState = .idle

    /// Published reversible schedule for 395/95, snapped when the corridor is selected.
    var reversibleSchedule: ReversibleStatus?
    /// True after the user picks a direction that differs from the schedule default.
    var directionOverridden = false

    @ObservationIgnored private var pointsTask: Task<Void, Never>?
    @ObservationIgnored private var estimateTask: Task<Void, Never>?
    @ObservationIgnored private var pointsGeneration = 0

    init(client: TollAPIClient, catalog: CorridorCatalog = .bundled) {
        self.client = client
        self.catalog = catalog
        let start = catalog.defaultCorridor
        selectedId = start
        pastDate = InsideBeltwaySchedule.easternCalendar.date(byAdding: .day, value: -1, to: Date()) ?? Date()
        let schedule = Self.schedule(for: start)
        reversibleSchedule = schedule
        direction = Self.defaultDirection(
            options: catalog[start].bundledDirections,
            schedule: schedule
        )
        directionOverridden = false
    }

    var selectedCorridor: Corridor { catalog[selectedId] }

    var liveSupport: CorridorSupportInfo? { supportById[selectedId] }

    var directions: [DirectionOption] {
        liveSupport?.directions ?? selectedCorridor.bundledDirections
    }

    var isSupported: Bool { liveSupport?.supported ?? true }

    var unsupportedReason: String? {
        guard let liveSupport, !liveSupport.supported else { return nil }
        return liveSupport.reason
    }

    var supportsHistorical: Bool {
        liveSupport?.historical ?? selectedCorridor.supportsHistorical
    }

    var selectedEntry: TripEntry? {
        entries.first(where: { $0.id == entryId })
    }

    var canEstimate: Bool {
        guard selectedEntry != nil, !exitId.isEmpty else { return false }
        if case .loading = quote { return false }
        if supportsHistorical, when == .past {
            return !pastTimeSlot.isEmpty
        }
        return true
    }

    var historicalAt: String? {
        guard supportsHistorical, when == .past, !pastTimeSlot.isEmpty else { return nil }
        return "\(InsideBeltwaySchedule.easternDateString(pastDate))T\(pastTimeSlot)"
    }

    func appear() async {
        await refreshSupport()
        await loadPoints()
    }

    func selectCorridor(_ id: CorridorId) async {
        guard id != selectedId else { return }
        estimateTask?.cancel()
        selectedId = id
        resetDraft(keepingCorridor: true)
        applyScheduledDirection()
        await loadPoints()
    }

    func selectDirection(_ next: Direction) async {
        guard next != direction else { return }
        estimateTask?.cancel()
        if let scheduled = reversibleSchedule?.preferredDirection.asDirection {
            directionOverridden = next != scheduled
        } else {
            directionOverridden = true
        }
        direction = next
        entryId = ""
        exitId = ""
        pastTimeSlot = ""
        quote = .idle
        await loadPoints()
    }

    func selectEntry(_ id: String) {
        estimateTask?.cancel()
        entryId = id
        exitId = ""
        quote = .idle
    }

    func selectExit(_ id: String) {
        estimateTask?.cancel()
        exitId = id
        quote = .idle
    }

    /// Prefill from Advanced mode's "Adjust in Simple mode".
    func applyPreset(_ preset: TripPreset) async {
        estimateTask?.cancel()
        selectedId = preset.corridor
        resetDraft(keepingCorridor: true)
        reversibleSchedule = Self.schedule(for: preset.corridor)
        direction = preset.direction
        directionOverridden = true
        await loadPoints()
        if entries.contains(where: { $0.id == preset.entry }) {
            entryId = preset.entry
            if selectedEntry?.exits.contains(where: { $0.id == preset.exit }) == true {
                exitId = preset.exit
            }
        }
    }

    func fetchEstimate() async {
        guard canEstimate else { return }
        let previous: CachedEstimateResponse? = switch quote {
        case .ready(let estimate): estimate
        case .unavailable(_, let lastKnown): lastKnown
        default: nil
        }

        estimateTask?.cancel()
        quote = .loading
        let corridor = selectedId
        let heading = direction
        let entry = entryId
        let exit = exitId
        let at = historicalAt
        let task = Task {
            let next: QuoteState
            do {
                let estimate = try await client.estimate(
                    corridor: corridor,
                    direction: heading,
                    entry: entry,
                    exit: exit,
                    at: at
                )
                next = .ready(estimate)
            } catch is CancellationError {
                return
            } catch {
                let message = (error as? TollAPIError)?.message ?? error.localizedDescription
                next = .unavailable(message: message, lastKnown: previous)
            }
            // Drop stale answers if the draft changed while the operator was slow.
            guard !Task.isCancelled,
                  selectedId == corridor,
                  direction == heading,
                  entryId == entry,
                  exitId == exit
            else { return }
            quote = next
        }
        estimateTask = task
        await task.value
    }

    private func resetDraft(keepingCorridor _: Bool) {
        entries = []
        notice = nil
        pointsError = nil
        entryId = ""
        exitId = ""
        when = .now
        pastTimeSlot = ""
        quote = .idle
        directionOverridden = false
    }

    private func applyScheduledDirection() {
        let schedule = Self.schedule(for: selectedId)
        reversibleSchedule = schedule
        direction = Self.defaultDirection(options: directions, schedule: schedule)
        directionOverridden = false
    }

    private static func schedule(for id: CorridorId) -> ReversibleStatus? {
        ReversibleSchedule.isReversible(id) ? ReversibleSchedule.status() : nil
    }

    private static func defaultDirection(
        options: [DirectionOption],
        schedule: ReversibleStatus?
    ) -> Direction {
        let preferred = schedule?.preferredDirection.asDirection
        if let preferred, options.contains(where: { $0.id == preferred }) {
            return preferred
        }
        return options[0].id
    }

    private func refreshSupport() async {
        do {
            let list = try await client.corridors()
            supportById = Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
            supportError = nil
            if !directionOverridden {
                applyScheduledDirection()
            } else if !directions.contains(where: { $0.id == direction }) {
                applyScheduledDirection()
            }
        } catch {
            supportError = (error as? TollAPIError)?.message ?? error.localizedDescription
        }
    }

    private func loadPoints() async {
        pointsTask?.cancel()
        pointsGeneration += 1
        let generation = pointsGeneration
        let corridor = selectedId
        let heading = direction
        pointsLoading = true
        pointsError = nil
        notice = nil
        entries = []

        let task = Task {
            do {
                let response = try await client.points(corridor: corridor, direction: heading)
                guard generation == pointsGeneration else { return }
                entries = response.entries
                notice = response.notice
                pointsError = nil
            } catch is CancellationError {
                return
            } catch {
                guard generation == pointsGeneration else { return }
                entries = []
                pointsError = (error as? TollAPIError)?.message ?? error.localizedDescription
            }
            if generation == pointsGeneration {
                pointsLoading = false
            }
        }
        pointsTask = task
        await task.value
    }
}
