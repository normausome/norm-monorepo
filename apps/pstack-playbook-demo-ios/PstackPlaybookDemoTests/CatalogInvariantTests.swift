import Testing
@testable import PstackPlaybookDemo

struct CatalogInvariantTests {

    @Test func playbookIDsAreInCatalogOrder() {
        #expect(
            PlaybookID.allCases.map(\.rawValue) == [
                "bug-fix",
                "investigation",
                "feature",
                "perf",
                "shipping",
                "babysit",
                "prototype",
                "figure-it-out",
            ],
            "declaration order is catalog order and the router's tie-break"
        )
    }

    @Test func catalogIDsAreUniqueAndComplete() {
        let ids = Catalog.all.map(\.id)
        #expect(ids.count == 8, "catalog has exactly the eight bundled playbooks")
        #expect(Set(ids).count == 8, "playbook ids are unique")
        #expect(ids == PlaybookID.allCases, "Catalog.all follows PlaybookID.allCases")
        #expect(
            Catalog.all.map(\.id) == ids,
            "each record's id matches its Catalog slot"
        )
        for (index, playbook) in Catalog.all.enumerated() {
            #expect(
                playbook.id.catalogIndex == index,
                "catalogIndex matches position for \(playbook.id.rawValue)"
            )
            #expect(
                playbook.id.playbook == playbook,
                "PlaybookID.playbook lookup is total for \(playbook.id.rawValue)"
            )
        }
    }

    @Test func fallbackIsFigureItOutAndUnscored() {
        #expect(PlaybookID.fallback == .figureItOut, "fallback id is figure-it-out")
        #expect(
            !Catalog.scorable.map(\.id).contains(.figureItOut),
            "fallback is excluded from scoring"
        )
        #expect(Catalog.scorable.count == 7, "exactly seven playbooks are scored")
        #expect(Catalog.figureItOut.keywords.isEmpty, "fallback keyword list is empty")
    }

    @Test func pickerIncludesAutoAndEveryPlaybookIncludingFallback() {
        #expect(PickerChoice.all.first == .auto, "picker starts with Auto-route from goal")
        #expect(
            PickerChoice.all.contains(.playbook(.figureItOut)),
            "figure-it-out is pickable even though it cannot win by scoring"
        )
        #expect(
            PickerChoice.all.count == 1 + PlaybookID.allCases.count,
            "picker is auto plus every catalog playbook"
        )
        #expect(
            PickerChoice.all.dropFirst().map(\.id) == PlaybookID.allCases.map(\.rawValue),
            "manual picker rows follow catalog order"
        )
        #expect(
            PickerChoice.auto.label == "Auto-route from goal",
            "auto row label matches the web select"
        )
    }

    @Test func samplesAreTheSixWebGoalsInOrder() {
        #expect(SampleGoals.all.count == 6, "six SAMPLE_GOALS chips")
        #expect(
            SampleGoals.all.map(\.label) == [
                "Scroll drift bug",
                "Slow list load",
                "Feature behind flag",
                "Land stack overnight",
                "Check PR status",
                "Compare prototypes",
            ],
            "sample chip labels match the web order"
        )
        #expect(
            SampleGoals.all[0].goal.hasPrefix("This PR has a subtle bug"),
            "first sample is the scroll-drift goal the app boots on"
        )
    }

    @Test func catalogTextMatchesWebSource() {
        #expect(Catalog.bugFix.name == "Bug Fix")
        #expect(
            Catalog.bugFix.summary
                == "Reproduce a defect, root-cause it, and fix with runtime evidence — not guesses."
        )
        #expect(Catalog.perf.name == "Perf", "id is perf; slug perf-issue was dropped")
        #expect(Catalog.perf.keywords.contains("cpu"), "CPU/trace sample keywords are on Perf")
        #expect(Catalog.babysit.keywords.contains("check on"), "babysit keeps the multi-word keyword")
        #expect(Catalog.prototype.steps[2].contains("2–3"), "en-dash in prototype steps is verbatim")
        #expect(
            Catalog.figureItOut.verification.principle == "prove-it-works",
            "fallback verification principle is verbatim"
        )
    }
}
