import Foundation

/// Everything the screen can be showing. Exactly three cases — the source constructs
/// exactly three `RouteResult` shapes and never a fourth.
enum Routing: Hashable, Sendable {

    case matched(Match)

    case fallback

    /// The user overrode the router with the picker. **The router never ran.**
    /// The source fabricates `{ score: 0, matchedKeywords: [], confidence: "high" }`
    /// here — high confidence with zero evidence. Preserved on purpose; the enum
    /// case is what makes that oddity legible instead of hiding it in a struct literal.
    case override(PlaybookID)

    struct Match: Hashable, Sendable {
        let playbook: PlaybookID
        let score: Int
        let matched: [String]

        /// Fails a precondition rather than silently constructing a nonsense match.
        /// The only caller is `Router.route(goal:)`, which has already checked.
        init(playbook: PlaybookID, score: Int, matched: [String]) {
            precondition(
                score > 0 && !matched.isEmpty,
                "a Match with no evidence is a .fallback, not a .matched"
            )
            self.playbook = playbook
            self.score = score
            self.matched = matched
        }
    }
}

extension Routing {
    var playbook: Playbook {
        switch self {
        case .matched(let match):
            return match.playbook.playbook
        case .fallback:
            return PlaybookID.fallback.playbook
        case .override(let id):
            return id.playbook
        }
    }

    /// `.matched` derives from score; `.fallback` is always low; `.override` is
    /// always high (source behavior — see the case doc).
    var confidence: Confidence {
        switch self {
        case .matched(let match):
            return Confidence(score: match.score)
        case .fallback:
            return .low
        case .override:
            return .high
        }
    }

    /// Non-nil only when there is a real score to show. This is what replaces the
    /// source's `{score > 0 && <Badge/>}` — the "hide it at zero" rule is now a
    /// consequence of the type rather than a condition the view has to remember.
    var scoreBadge: Int? {
        switch self {
        case .matched(let match):
            return match.score
        case .fallback, .override:
            return nil
        }
    }

    var matchedKeywords: [String] {
        switch self {
        case .matched(let match):
            return match.matched
        case .fallback, .override:
            return []
        }
    }

    /// Test affordance so parity tests read as assertions, not pattern-match ceremony.
    var match: Match? {
        switch self {
        case .matched(let match):
            return match
        case .fallback, .override:
            return nil
        }
    }
}
