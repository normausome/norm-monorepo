import Foundation

/// The eight records, transcribed from `src/data/playbooks.ts`. Static `let`s rather
/// than a bundled JSON file: 8 fixed records should be a compile-time fact, not a
/// runtime decode that can fail.
enum Catalog {
    static let bugFix = Playbook(
        id: .bugFix,
        name: "Bug Fix",
        summary: "Reproduce a defect, root-cause it, and fix with runtime evidence — not guesses.",
        keywords: [
            "bug",
            "fix",
            "broken",
            "defect",
            "repro",
            "reproduce",
            "crash",
            "regression",
            "drift",
            "idle",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Reproduce the defect with runtime evidence before changing code.",
            "Trace symptoms to root cause — resist guards that only silence errors.",
            "Apply the smallest fix that solves the root cause.",
            "Verify against the real artifact: run the feature, inspect the diff.",
        ],
        skills: ["/poteto-mode", "/tdd", "/how"],
        verification: .init(
            principle: "prove-it-works",
            checks: [
                "Defect reproduced before the fix lands",
                "Fix verified against the real running artifact",
                "No proxy verification ('it compiles' is not enough)",
            ]
        )
    )

    static let investigation = Playbook(
        id: .investigation,
        name: "Investigation",
        summary: "Read-only question: how does X work, why was Y built this way, are we sure?",
        keywords: [
            "how",
            "why",
            "explain",
            "understand",
            "work",
            "architecture",
            "walkthrough",
            "question",
            "investigate",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Clarify the question and scope — no code changes unless asked.",
            "Gather evidence from source, tests, and runtime behavior.",
            "Answer with citations to real code paths, not speculation.",
            "Flag uncertainty and what would prove the answer.",
        ],
        skills: ["/poteto-mode", "/how", "/why"],
        verification: .init(
            principle: "prove-it-works",
            checks: [
                "Claims backed by file paths and code references",
                "Runtime behavior cited where relevant",
                "Open questions explicitly listed",
            ]
        )
    )

    static let feature = Playbook(
        id: .feature,
        name: "Feature",
        summary: "New or changed behavior, built from a named data shape and verified end-to-end.",
        keywords: [
            "feature",
            "build",
            "add",
            "implement",
            "flag",
            "new behavior",
            "ship",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Name the data shape and boundary before writing logic.",
            "Implement the smallest vertical slice that delivers the behavior.",
            "Sequence verifiable units — each step ends in a checkable state.",
            "Prove it works against the real UI or CLI, not mocks alone.",
        ],
        skills: ["/poteto-mode", "/architect", "/tdd"],
        verification: .init(
            principle: "sequence-verifiable-units",
            checks: [
                "Feature exercised in the running app",
                "Each commit/phase leaves a verifiable state",
                "Illegal states made unrepresentable where possible",
            ]
        )
    )

    static let perf = Playbook(
        id: .perf,
        name: "Perf",
        summary: "Trace measured slowness and improve it against a baseline — no premature optimization.",
        keywords: [
            "slow",
            "perf",
            "performance",
            "trace",
            "cpu",
            "latency",
            "baseline",
            "profile",
            "load",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Establish a measured baseline before changing anything.",
            "Capture a trace or profile artifact tied to the symptom.",
            "Hypothesize, change one thing, measure again.",
            "Report before/after numbers — accept only proven wins.",
        ],
        skills: ["/poteto-mode", "/how"],
        verification: .init(
            principle: "prove-it-works",
            checks: [
                "Baseline measurement recorded",
                "After measurement shows improvement",
                "Trace or profile artifact referenced",
            ]
        )
    )

    static let shipping = Playbook(
        id: .shipping,
        name: "Shipping",
        summary: "Independently verify a green stack, then land the contiguous verified run bottom-up.",
        keywords: [
            "merge",
            "land",
            "stack",
            "shipping",
            "ci",
            "green",
            "morning",
            "bed",
            "overnight",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Verify each PR in the stack independently — green CI is not enough alone.",
            "Resolve conflicts and review threads before landing.",
            "Land bottom-up through the contiguous verified run.",
            "Confirm each merge against the real remote state.",
        ],
        skills: ["/poteto-mode", "/babysit"],
        verification: .init(
            principle: "sequence-verifiable-units",
            checks: [
                "Each PR verified before the next lands",
                "Merge order preserves a contiguous verified stack",
                "Final state confirmed on the default branch",
            ]
        )
    )

    static let babysit = Playbook(
        id: .babysit,
        name: "Babysit",
        summary: "Drive a PR or stack to merge-ready: conflicts, review threads, CI flakes.",
        keywords: [
            "pr",
            "pull request",
            "review",
            "outstanding",
            "check on",
            "threads",
            "conflicts",
            "babysit",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Fetch current PR status, CI, and open review threads.",
            "Triage blockers: failing checks, unresolved comments, conflicts.",
            "Fix or respond with evidence — never block on the human for reversibles.",
            "Report merge-ready state with proof links.",
        ],
        skills: ["/poteto-mode", "/interrogate"],
        verification: .init(
            principle: "prove-it-works",
            checks: [
                "CI status fetched and interpreted",
                "Each review thread addressed or summarized",
                "Merge-ready verdict backed by current PR state",
            ]
        )
    )

    static let prototype = Playbook(
        id: .prototype,
        name: "Prototype",
        summary: "Throwaway sketch to settle a design or behavioral decision cheaply.",
        keywords: [
            "prototype",
            "compare",
            "sketch",
            "spike",
            "fork",
            "experiment",
            "two prototypes",
            "arena",
        ],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Define the decision the prototype must settle.",
            "Build 2–3 competing approaches — exhaust the design space.",
            "Compare side by side with observable behavior.",
            "Recommend one path with evidence from the prototypes.",
        ],
        skills: ["/poteto-mode", "/arena", "/architect"],
        verification: .init(
            principle: "exhaust-the-design-space",
            checks: [
                "Multiple approaches built and runnable",
                "Comparison uses observable behavior, not prose alone",
                "Recommendation tied to prototype evidence",
            ]
        )
    )

    static let figureItOut = Playbook(
        id: .figureItOut,
        name: "Figure It Out",
        summary: "No bundled playbook fits — design a rigorous, auditable playbook for the task.",
        keywords: [],
        steps: [
            "Read the inline principles index in poteto-mode.",
            "Decompose the goal into verifiable units.",
            "Draft custom steps with explicit verification at each boundary.",
            "Route to supporting skills (/how, /architect, /swarm) as needed.",
            "Prove completion against the real artifact before declaring done.",
        ],
        skills: ["/poteto-mode", "/figure-it-out", "/show-me-your-work"],
        verification: .init(
            principle: "prove-it-works",
            checks: [
                "Custom playbook steps are auditable",
                "Each phase ends in a verifiable checkpoint",
                "Final state proven against the real artifact",
            ]
        )
    )

    /// Catalog order, for the picker. Derived from the enum so the two can never drift.
    static var all: [Playbook] { PlaybookID.allCases.map(\.playbook) }

    /// Everything the router scores. `figure-it-out` is excluded exactly as in the source.
    static var scorable: [Playbook] {
        PlaybookID.allCases.filter { $0 != .fallback }.map(\.playbook)
    }
}

/// `SAMPLE_GOALS`, verbatim. Order matters: the app boots on `all[0]`, already routed.
struct SampleGoal: Hashable, Identifiable, Sendable {
    let label: String
    let goal: String
    var id: String { label }
}

enum SampleGoals {
    static let all: [SampleGoal] = [
        .init(
            label: "Scroll drift bug",
            goal: "This PR has a subtle bug where scroll drifts every 750ms even when idle. Repro first, then fix and verify."
        ),
        .init(
            label: "Slow list load",
            goal: "A big list takes a second or two to load even though we virtualize. Run a CPU trace and tell me why."
        ),
        .init(
            label: "Feature behind flag",
            goal: "Build a small feature behind a feature flag. Verify it really works."
        ),
        .init(
            label: "Land stack overnight",
            goal: "I'm going to bed. Land the stack even if CI flakes. I want everything merged by morning."
        ),
        .init(
            label: "Check PR status",
            goal: "Check on PR 123. Anything outstanding?"
        ),
        .init(
            label: "Compare prototypes",
            goal: "Build two prototypes of the markdown renderer so we can compare. Spawn an agent for each."
        ),
    ]
}
