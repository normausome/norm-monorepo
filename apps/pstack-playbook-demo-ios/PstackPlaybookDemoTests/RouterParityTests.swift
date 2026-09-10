import Testing
@testable import PstackPlaybookDemo

struct Golden: Sendable, CustomTestStringConvertible {
    let label: String
    let goal: String
    let playbook: PlaybookID
    let score: Int?
    let matched: [String]
    let confidence: Confidence

    var testDescription: String { label }
}

private let goldens: [Golden] = [
    Golden(
        label: "Scroll drift bug",
        goal: SampleGoals.all[0].goal,
        playbook: .bugFix,
        score: 12,
        matched: ["bug", "fix", "repro", "reproduce", "drift", "idle"],
        confidence: .high
    ),
    Golden(
        label: "Slow list load",
        goal: SampleGoals.all[1].goal,
        playbook: .perf,
        score: 6,
        matched: ["trace", "cpu", "load"],
        confidence: .high
    ),
    Golden(
        label: "Feature behind flag",
        goal: SampleGoals.all[2].goal,
        playbook: .feature,
        score: 6,
        matched: ["feature", "build", "flag"],
        confidence: .high
    ),
    Golden(
        label: "Land stack overnight",
        goal: SampleGoals.all[3].goal,
        playbook: .shipping,
        score: 12,
        matched: ["merge", "land", "stack", "ci", "morning", "bed"],
        confidence: .high
    ),
    Golden(
        label: "Check PR status",
        goal: SampleGoals.all[4].goal,
        playbook: .babysit,
        score: 7,
        matched: ["pr", "outstanding", "check on"],
        confidence: .high
    ),
    Golden(
        label: "Compare prototypes",
        goal: SampleGoals.all[5].goal,
        playbook: .prototype,
        score: 7,
        matched: ["prototype", "compare", "two prototypes"],
        confidence: .high
    ),
]

struct RouterParityTests {

    @Test(arguments: goldens)
    func sampleGoalsRouteIdentically(_ golden: Golden) {
        let routing = Router.route(goal: golden.goal)
        #expect(
            routing.playbook.id == golden.playbook,
            "oracle playbook for \(golden.label)"
        )
        #expect(routing.scoreBadge == golden.score, "oracle score for \(golden.label)")
        #expect(
            routing.matchedKeywords == golden.matched,
            "oracle matched keywords for \(golden.label)"
        )
        #expect(
            routing.confidence == golden.confidence,
            "oracle confidence for \(golden.label)"
        )
    }

    @Test func emptyAndWhitespaceGoalsFallBack() {
        for goal in ["", "   ", "\n\t", "\u{FEFF}"] {
            let routing = Router.route(goal: goal)
            #expect(routing == .fallback, "whitespace-only goal \(goal.debugDescription) is fallback")
            #expect(routing.playbook.id == .figureItOut, "fallback playbook is figure-it-out")
            #expect(routing.scoreBadge == nil, "fallback has no score badge")
            #expect(routing.matchedKeywords.isEmpty, "fallback has no matched keywords")
            #expect(routing.confidence == .low, "fallback confidence is low")
        }
    }

    @Test func singleCharacterTokensAreDropped() {
        #expect(
            Tokenizer.tokens(in: "a b c").isEmpty,
            "length-1 tokens are dropped before scoring"
        )
        #expect(
            Router.route(goal: "a b c") == .fallback,
            "only length-1 tokens produce fallback"
        )
    }

    @Test func digitsAndUnderscoresSurvive() {
        let tokens = Tokenizer.tokens(in: "every 750ms snake_case and 123")
        #expect(tokens.contains("750ms"), "digits stay attached to the token")
        #expect(tokens.contains("snake_case"), "underscores are word characters")
        #expect(tokens.contains("123"), "standalone digits survive")
        #expect(!tokens.contains("and"), "stop word and is dropped")
    }

    @Test func hyphensSurviveScrubbing() {
        #expect(
            Tokenizer.tokens(in: "root-cause the defect") == ["root-cause", "defect"],
            "hyphenated words stay one token; the is a stop word"
        )
    }

    @Test func keywordContainingTokenCounts() {
        let routing = Router.route(goal: "check")
        #expect(routing.match?.playbook == .babysit, "check hits babysit keyword check on")
        #expect(routing.match?.score == 3, "multi-word keyword containing a token scores +3")
        #expect(routing.matchedKeywords == ["check on"], "matched keyword is the catalog spelling")
        #expect(routing.confidence == .medium, "score 3 is medium")
    }

    @Test func tokenContainingKeywordCounts() {
        let routing = Router.route(goal: "reproduce")
        #expect(routing.match?.playbook == .bugFix, "reproduce routes to bug-fix")
        #expect(
            routing.matchedKeywords == ["repro", "reproduce"],
            "token containing repro also exact-matches reproduce"
        )
        #expect(routing.match?.score == 4, "two single-word keyword hits score +2 each")
        #expect(routing.confidence == .medium, "score 4 is medium")
    }

    @Test func tiesGoToEarlierCatalogEntry() {
        // "bug" → bug-fix +2; "how" → investigation +2. Confirmed against the TS router.
        // max(by:) would return investigation (last maximal); the left fold must not.
        let routing = Router.route(goal: "bug how")
        #expect(routing.match?.playbook == .bugFix, "equal scores keep the earlier catalog entry")
        #expect(routing.match?.score == 2, "constructed tie is +2 each")
        #expect(routing.matchedKeywords == ["bug"], "winner matched keywords stay in catalog order")
    }

    @Test func figureItOutNeverWinsByScoring() {
        #expect(Catalog.figureItOut.keywords.isEmpty, "fallback has no keywords to score")
        #expect(
            Catalog.scorable.allSatisfy { $0.id != .figureItOut },
            "fallback is excluded from the scoreboard"
        )
        #expect(
            Router.route(goal: "zzzz no keywords here") == .fallback,
            "zero-score goals fall back rather than picking figure-it-out by scoring"
        )
    }

    @Test func nonAsciiDoesNotTokenizeLikeUnicodeRegex() {
        #expect(
            Tokenizer.tokens(in: "café") == ["caf"],
            "JS \\w is ASCII-only, so é becomes a space"
        )
    }

    @Test func bomIsTreatedAsJSWhitespace() {
        #expect(
            Tokenizer.trimmed("\u{FEFF}bug\u{FEFF}") == "bug",
            "JS trim strips U+FEFF, which Swift whitespacesAndNewlines does not"
        )
        #expect(
            Tokenizer.tokens(in: "bug\u{FEFF}fix") == ["bug", "fix"],
            "JS \\s includes U+FEFF so it splits tokens"
        )
    }

    @Test func scoreTwoIsLow() {
        let routing = Router.route(goal: "broken")
        #expect(routing.match?.playbook == .bugFix, "broken is a bug-fix keyword")
        #expect(routing.match?.score == 2, "one single-word hit is +2")
        #expect(routing.confidence == .low, "score < 3 is low")
    }

    @Test func scoreThreeIsMedium() {
        let routing = Router.route(goal: "new behavior")
        #expect(routing.match?.playbook == .feature, "joined tokens hit new behavior")
        #expect(routing.match?.score == 3, "one multi-word hit is +3")
        #expect(routing.confidence == .medium, "score >= 3 and < 6 is medium")
    }

    @Test func scoreSixIsHigh() {
        let routing = Router.route(goal: "bug fix broken")
        #expect(routing.match?.playbook == .bugFix, "three bug-fix keywords")
        #expect(routing.match?.score == 6, "three single-word hits are +2 each")
        #expect(routing.confidence == .high, "score >= 6 is high")
    }

    @Test func prTokenHitsPrototypeViaContainsQuirk() {
        // Not a tie: prototype "prototype" (+2) and "two prototypes" (+3) both contain "pr".
        let routing = Router.route(goal: "pr")
        #expect(routing.match?.playbook == .prototype, "keyword-contains-token lifts prototype over babysit")
        #expect(routing.match?.score == 5, "prototype +2 and two prototypes +3")
        #expect(routing.matchedKeywords == ["prototype", "two prototypes"])
        #expect(routing.confidence == .medium, "score 5 is medium")
    }

    @Test func stopWordsAreTheFortyOneFromSource() {
        #expect(StopWords.all.count == 41, "source STOP_WORDS has 41 entries, not 43")
        #expect(
            StopWords.all == [
                "a", "an", "the", "and", "or", "to", "in", "on", "at", "is", "it", "this",
                "that", "with", "for", "of", "i", "me", "my", "we", "you", "be", "by", "as",
                "so", "if", "when", "even", "then", "first", "want", "has", "have", "do",
                "does", "can", "will", "just", "really", "tell", "going",
            ],
            "stop words match router.ts verbatim"
        )
    }
}
