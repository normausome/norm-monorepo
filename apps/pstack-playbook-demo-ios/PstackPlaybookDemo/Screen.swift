import Foundation

/// The picker's binding type. Replaces the source's magic `"auto"` string, which was
/// a string id living in the same value space as real playbook ids.
enum PickerChoice: Hashable, Identifiable, Sendable {
    case auto
    case playbook(PlaybookID)

    var id: String {
        switch self {
        case .auto:
            return "auto"
        case .playbook(let playbookID):
            return playbookID.rawValue
        }
    }

    var label: String {
        switch self {
        case .auto:
            return "Auto-route from goal"
        case .playbook(let playbookID):
            return playbookID.playbook.name
        }
    }

    /// Catalog order, `auto` first — exactly the source's `<SelectItem>` order.
    /// `figure-it-out` is included, matching the source (it is pickable even though
    /// it can never be routed to by scoring).
    static var all: [PickerChoice] { [.auto] + PlaybookID.allCases.map(Self.playbook) }
}

/// The entire application state. Three stored fields, all `private(set)`: a view can
/// hold a `Binding<Screen>` and still be structurally unable to write a field directly.
/// Mutation happens only through the four transitions below, all in this file.
struct Screen: Equatable, Sendable {

    private(set) var draft: String
    private(set) var committedGoal: String
    private(set) var manualPick: PlaybookID?

    /// Boots on `SAMPLE_GOALS[0]`, already routed to Bug Fix — same as the source.
    static let initial = Screen(
        draft: SampleGoals.all[0].goal,
        committedGoal: SampleGoals.all[0].goal,
        manualPick: nil
    )

    /// The single thing the screen renders from. Pure; cheap (8 playbooks × ~10
    /// keywords), so it is recomputed rather than cached.
    var routing: Routing {
        if let manualPick {
            return .override(manualPick)
        }
        return Router.route(goal: committedGoal)
    }

    var selection: PickerChoice {
        manualPick.map(PickerChoice.playbook) ?? .auto
    }
}

/// The four transitions. This table *is* the port spec — the trim/untrim asymmetry
/// is the highest-risk thing in the whole app and it is invisible in the source,
/// spread across three inline handlers in `App.tsx`.
///
/// | transition          | draft         | committedGoal        | manualPick |
/// |---------------------|---------------|----------------------|------------|
/// | `editDraft(t)`      | `t`           | unchanged            | unchanged  |
/// | `route()`           | unchanged     | `draft` **trimmed**  | `nil`      |
/// | `apply(sample)`     | `sample.goal` | `sample.goal` **raw**| `nil`      |
/// | `select(.auto)`     | unchanged     | unchanged            | `nil`      |
/// | `select(.playbook)` | unchanged     | `draft` **raw** ⚠︎    | the id     |
extension Screen {

    /// Typing. Never routes — the source only routes on an explicit commit.
    mutating func editDraft(_ text: String) {
        draft = text
    }

    /// The "Route playbook" button and the return key. Trims, and clears any
    /// manual pick so the router takes over again. Draft itself is left alone —
    /// the source does not rewrite the field.
    mutating func route() {
        committedGoal = Tokenizer.trimmed(draft)
        manualPick = nil
    }

    /// A sample chip. Commits the sample **untrimmed** into both fields.
    mutating func apply(_ sample: SampleGoal) {
        draft = sample.goal
        committedGoal = sample.goal
        manualPick = nil
    }

    /// Choosing a real playbook also commits the current draft, untrimmed, even
    /// though the router will not run. This is a faithful port of a source quirk
    /// (`App.tsx`: `if (playbook) setSubmittedGoal(goal)`), not an accident.
    mutating func select(_ choice: PickerChoice) {
        switch choice {
        case .auto:
            manualPick = nil
        case .playbook(let playbookID):
            committedGoal = draft
            manualPick = playbookID
        }
    }
}
