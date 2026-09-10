import Testing
@testable import PstackPlaybookDemo

struct ScreenTransitionTests {

    @Test func bootsOnFirstSampleRoutedToBugFix() {
        let screen = Screen.initial
        #expect(screen.draft == SampleGoals.all[0].goal, "boot draft is SAMPLE_GOALS[0]")
        #expect(
            screen.committedGoal == SampleGoals.all[0].goal,
            "boot committed goal is already SAMPLE_GOALS[0]"
        )
        #expect(screen.manualPick == nil, "boot is auto-routed")
        #expect(screen.selection == .auto, "picker starts on Auto-route")
        #expect(screen.routing.match?.playbook == .bugFix, "first sample already routes to Bug Fix")
        #expect(screen.routing.scoreBadge == 12, "first sample score is 12")
        #expect(screen.routing.confidence == .high, "first sample confidence is high")
    }

    @Test func editingDraftDoesNotReroute() {
        var screen = Screen.initial
        screen.editDraft("Check on PR 123. Anything outstanding?")
        #expect(screen.draft == "Check on PR 123. Anything outstanding?", "editDraft writes the field")
        #expect(
            screen.committedGoal == SampleGoals.all[0].goal,
            "editDraft leaves committedGoal unchanged"
        )
        #expect(screen.routing.match?.playbook == .bugFix, "routing still uses the previous commit")
    }

    @Test func routeTrimsCommittedGoalButNotDraft() {
        var screen = Screen.initial
        screen.editDraft("  broken  ")
        screen.route()
        #expect(screen.draft == "  broken  ", "route does not rewrite the text field")
        #expect(screen.committedGoal == "broken", "route trims only the committed goal")
        #expect(screen.manualPick == nil, "route clears a manual override")
        #expect(screen.routing.match?.playbook == .bugFix, "trimmed commit is what the router sees")
    }

    @Test func routeTrimsByteOrderMark() {
        var screen = Screen.initial
        screen.editDraft("\u{FEFF}broken\u{FEFF}")
        screen.route()
        #expect(screen.draft == "\u{FEFF}broken\u{FEFF}", "route leaves BOM in the draft")
        #expect(screen.committedGoal == "broken", "JS trim strips U+FEFF from the commit")
    }

    @Test func sampleCommitsUntrimmed() {
        var screen = Screen.initial
        let sample = SampleGoals.all[4]
        screen.apply(sample)
        #expect(screen.draft == sample.goal, "sample writes the draft raw")
        #expect(screen.committedGoal == sample.goal, "sample writes the commit raw")
        #expect(screen.manualPick == nil, "sample returns to auto-route")
        #expect(screen.routing.match?.playbook == .babysit, "PR sample routes to babysit")
        #expect(screen.routing.scoreBadge == 7, "PR sample scores 7")
    }

    @Test func manualPickBypassesRouterWithHighConfidenceAndNoScore() {
        var screen = Screen.initial
        screen.select(.playbook(.perf))
        #expect(screen.routing == .override(.perf), "manual pick is Routing.override")
        #expect(screen.routing.confidence == .high, "override fabricates high confidence")
        #expect(screen.routing.scoreBadge == nil, "override has no score badge")
        #expect(screen.routing.matchedKeywords.isEmpty, "override has empty matches")
        #expect(screen.routing.playbook.id == .perf, "override shows the chosen playbook")
        #expect(screen.routing.match == nil, "override is not a router Match")
    }

    @Test func selectCommitsDraftUntrimmed() {
        var screen = Screen.initial
        screen.editDraft("  uncommitted draft  ")
        screen.select(.playbook(.shipping))
        #expect(screen.draft == "  uncommitted draft  ", "select leaves the field alone")
        #expect(
            screen.committedGoal == "  uncommitted draft  ",
            "select commits the current draft without trimming"
        )
        #expect(screen.manualPick == .shipping, "select stores the chosen id")
    }

    @Test func switchingBackToAutoRoutesTheQuirkCommittedGoal() {
        var screen = Screen.initial
        screen.editDraft("Check on PR 123. Anything outstanding?")
        screen.select(.playbook(.shipping))
        screen.select(.auto)
        #expect(screen.manualPick == nil, "auto clears the override")
        #expect(
            screen.committedGoal == "Check on PR 123. Anything outstanding?",
            "auto keeps the draft that select committed"
        )
        #expect(
            screen.routing.match?.playbook == .babysit,
            "router runs against the quirk-committed draft, not the previous route"
        )
        #expect(screen.routing.scoreBadge == 7, "quirk-committed PR goal scores 7")
    }

    @Test func routeClearsManualOverride() {
        var screen = Screen.initial
        screen.select(.playbook(.perf))
        screen.route()
        #expect(screen.manualPick == nil, "route returns control to the router")
        #expect(screen.routing.match?.playbook == .bugFix, "route uses the (trimmed) committed draft")
    }

    @Test(
        arguments: [
            (name: "editDraft", trimDraft: false as Bool, trimCommit: false as Bool),
            (name: "route", trimDraft: false, trimCommit: true),
            (name: "apply", trimDraft: false, trimCommit: false),
            (name: "select playbook", trimDraft: false, trimCommit: false),
        ]
    )
    func trimUntrimTable(
        name: String,
        trimDraft: Bool,
        trimCommit: Bool
    ) {
        var screen = Screen.initial
        let padded = "  broken  "
        switch name {
        case "editDraft":
            screen.editDraft(padded)
            #expect(screen.draft == padded, "editDraft stores the raw typed text")
            #expect(screen.committedGoal == SampleGoals.all[0].goal, "editDraft does not commit")
        case "route":
            screen.editDraft(padded)
            screen.route()
            #expect(screen.draft == padded, "route must not trim the draft")
            #expect(screen.committedGoal == "broken", "route trims the commit")
        case "apply":
            let sample = SampleGoal(label: "padded", goal: padded)
            screen.apply(sample)
            #expect(screen.draft == padded, "apply stores the sample raw in draft")
            #expect(screen.committedGoal == padded, "apply stores the sample raw in commit")
        case "select playbook":
            screen.editDraft(padded)
            screen.select(.playbook(.figureItOut))
            #expect(screen.draft == padded, "select must not trim the draft")
            #expect(screen.committedGoal == padded, "select commits the draft untrimmed")
        default:
            Issue.record("unknown transition \(name)")
        }
        #expect(trimDraft == false, "no transition trims the visible draft")
        if name == "route" {
            #expect(trimCommit, "only route trims committedGoal")
        } else if name == "editDraft" {
            #expect(!trimCommit, "editDraft does not write committedGoal")
        } else {
            #expect(!trimCommit, "\(name) commits untrimmed")
        }
    }
}
