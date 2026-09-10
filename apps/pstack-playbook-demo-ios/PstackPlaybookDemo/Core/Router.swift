import Foundation

/// Pure port of `src/lib/router.ts`. Every deviation from idiomatic Swift below is
/// deliberate: this router is **specified by the TypeScript**, not by what good
/// matching would look like. No stemming, no word boundaries, no fuzzy matching.
enum Router {

    static func route(goal: String) -> Routing {
        let trimmed = Tokenizer.trimmed(goal)
        guard !trimmed.isEmpty else { return .fallback }
        guard let best = Scoreboard(goal: trimmed).best, best.score > 0 else {
            return .fallback
        }
        return .matched(.init(playbook: best.id, score: best.score, matched: best.matched))
    }
}

struct Scoreboard {
    struct Entry: Hashable {
        let id: PlaybookID
        let score: Int
        let matched: [String]
    }

    /// One entry per scorable playbook, in catalog order. Never sort this in place —
    /// `best` depends on the ordering for its tie-break.
    let entries: [Entry]

    init(goal: String) {
        let tokens = Tokenizer.tokens(in: goal)
        let joined = tokens.joined(separator: " ")
        entries = Catalog.scorable.map { Self.score($0, tokens: tokens, joined: joined) }
    }

    /// Highest score wins; ties go to the **earlier** catalog entry.
    ///
    /// Deliberately not `entries.sorted { $0.score > $1.score }.first` and not
    /// `entries.max(by:)`. The TypeScript relies on `Array#sort` being stable (V8
    /// guarantees it) so equal scores keep catalog order. Swift's `sort` is *not*
    /// documented stable, and `max(by:)` returns the **last** maximal element.
    /// A left fold that only replaces on a strictly greater score is the one form
    /// that is obviously right.
    var best: Entry? {
        entries.reduce(nil as Entry?) { incumbent, candidate in
            guard let incumbent else { return candidate }
            return candidate.score > incumbent.score ? candidate : incumbent
        }
    }

    /// A keyword hits when **any** of three conditions holds. All three are in the
    /// source and none of them is a bug to fix:
    ///
    ///   1. some token *contains* the keyword — `"reproduce"` ⊇ `"repro"`
    ///   2. the keyword *contains* some token — `"check on"` ⊇ `"check"`, and
    ///      `"prototype"` ⊇ `"pr"`. This is the loosest rule and the one a
    ///      well-intentioned port would silently drop; it is what lifts the
    ///      "Check PR status" sample from 4 to 7.
    ///   3. the space-joined token string contains the keyword — the multi-word path.
    ///
    /// Weight: +3 when the keyword contains a space, +2 otherwise. Cumulative, uncapped.
    /// `matched` collects the keyword as written in the catalog (all already lowercase).
    private static func score(_ playbook: Playbook, tokens: [String], joined: String) -> Entry {
        var matched: [String] = []
        var score = 0
        for keyword in playbook.keywords {
            let normalized = keyword.lowercased()
            let hit =
                tokens.contains { $0.contains(normalized) || normalized.contains($0) }
                || joined.contains(normalized)
            if hit {
                matched.append(keyword)
                score += normalized.contains(" ") ? 3 : 2
            }
        }
        return Entry(id: playbook.id, score: score, matched: matched)
    }
}

/// `STOP_WORDS` — **41 entries**, transcribed verbatim. Two of them, `"a"` and `"i"`,
/// can never fire because the `utf16.count > 1` filter runs first; they stay in the
/// set so the two files diff cleanly against each other.
enum StopWords {
    static let all: Set<String> = [
        "a", "an", "the", "and", "or", "to", "in", "on", "at", "is", "it", "this",
        "that", "with", "for", "of", "i", "me", "my", "we", "you", "be", "by", "as",
        "so", "if", "when", "even", "then", "first", "want", "has", "have", "do",
        "does", "can", "will", "just", "really", "tell", "going",
    ]
}

enum Tokenizer {
    /// ECMAScript WhiteSpace ∪ LineTerminator, including U+FEFF.
    /// Swift `.whitespacesAndNewlines` omits U+FEFF and includes U+0085 (NEL),
    /// which JS `\s` / `String#trim` do not.
    static let jsWhitespace: CharacterSet = {
        var set = CharacterSet()
        let scalars: [Unicode.Scalar] = [
            "\u{0009}", "\u{000A}", "\u{000B}", "\u{000C}", "\u{000D}", "\u{0020}",
            "\u{00A0}", "\u{1680}",
            "\u{2000}", "\u{2001}", "\u{2002}", "\u{2003}", "\u{2004}",
            "\u{2005}", "\u{2006}", "\u{2007}", "\u{2008}", "\u{2009}", "\u{200A}",
            "\u{2028}", "\u{2029}", "\u{202F}", "\u{205F}", "\u{3000}", "\u{FEFF}",
        ]
        for scalar in scalars {
            set.insert(scalar)
        }
        return set
    }()

    static func trimmed(_ text: String) -> String {
        text.trimmingCharacters(in: jsWhitespace)
    }

    /// JS parity notes, in the order the source applies its four steps:
    ///
    /// 1. `.toLowerCase()` — use `lowercased()`, never `lowercased(with: .current)`.
    ///    A Turkish locale would map `I` to `ı` and break matching.
    ///
    /// 2. `.replace(/[^\w\s-]/g, " ")` — **the trap.** JS `\w` is ASCII-only
    ///    (`[A-Za-z0-9_]`). `NSRegularExpression`'s `\w` is Unicode-aware, so a regex
    ///    that *looks* like a literal transcription is not one: `café` would tokenize
    ///    differently. Filter unicode scalars against an explicit ASCII set instead.
    ///    Kept: `A-Z a-z 0-9 _`, JS whitespace, and `-`. Everything else becomes a space,
    ///    which is why `750ms`, `123`, and hyphenated words survive intact.
    ///
    /// 3. `.split(/\s+/)` — split on the same JS `\s` set, including U+FEFF.
    ///
    /// 4. `.filter(w => w.length > 1 && !STOP_WORDS.has(w))` — JS `.length` counts
    ///    UTF-16 code units. Use `utf16.count`, not `count` (grapheme clusters), so a
    ///    single emoji still reads as length 2 the way it does in the browser.
    static func tokens(in text: String) -> [String] {
        let keep = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789_-")
            .union(jsWhitespace)
        let spaced = String(String.UnicodeScalarView(
            text.lowercased().unicodeScalars.map { keep.contains($0) ? $0 : " " }
        ))
        return spaced.unicodeScalars
            .split { jsWhitespace.contains($0) }
            .map { String(String.UnicodeScalarView($0)) }
            .filter { $0.utf16.count > 1 && !StopWords.all.contains($0) }
    }
}
