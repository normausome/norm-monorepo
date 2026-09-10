import Foundation

/// The eight bundled playbooks. **Declaration order is catalog order** and is
/// load-bearing twice over: it drives the manual picker's order, and it is the
/// router's tie-break when two playbooks score equally. Reordering these cases
/// is a behavior change, not a cosmetic one.
enum PlaybookID: String, CaseIterable, Identifiable, Hashable, Sendable {
    case bugFix = "bug-fix"
    case investigation
    case feature
    case perf                       // source `slug` was "perf-issue"; only `id` was ever
                                    // a key, and `slug` was never read — dropped.
    case shipping
    case babysit
    case prototype
    case figureItOut = "figure-it-out"

    var id: String { rawValue }

    /// Position in catalog order. The router's tie-break, and the only reason
    /// `CaseIterable` conformance is load-bearing rather than a convenience.
    var catalogIndex: Int { Self.allCases.firstIndex(of: self)! }

    /// Returned for an empty goal or when nothing scores. Excluded from scoring
    /// (its keyword list is empty, so it could never win anyway) but still offered
    /// in the manual picker.
    static let fallback: PlaybookID = .figureItOut

    /// Total by exhaustiveness — no optional, no dictionary, no runtime lookup.
    /// This is what replaces the source's `getPlaybookById(id) -> Playbook | undefined`.
    var playbook: Playbook {
        switch self {
        case .bugFix:        return Catalog.bugFix
        case .investigation: return Catalog.investigation
        case .feature:       return Catalog.feature
        case .perf:          return Catalog.perf
        case .shipping:      return Catalog.shipping
        case .babysit:       return Catalog.babysit
        case .prototype:     return Catalog.prototype
        case .figureItOut:   return Catalog.figureItOut
        }
    }
}

/// One playbook record. Pure data; transcribed from `src/data/playbooks.ts`.
struct Playbook: Hashable, Sendable {
    let id: PlaybookID
    let name: String
    let summary: String
    /// Lowercase already in the source. Multi-word entries score +3, single +2.
    let keywords: [String]
    let steps: [String]
    let skills: [String]
    let verification: Verification

    struct Verification: Hashable, Sendable {
        let principle: String
        let checks: [String]
    }
}

/// Derived from score alone: ≥6 high, ≥3 medium, else low.
enum Confidence: String, Hashable, Sendable {
    case high, medium, low

    init(score: Int) {
        if score >= 6 {
            self = .high
        } else if score >= 3 {
            self = .medium
        } else {
            self = .low
        }
    }
}
