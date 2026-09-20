# Social Injustice: Intellectuals Among Us

Design brief for a browser social-deduction game. Six Fellows at a failing institute race to publish the Grand Manifesto before the funding runs out. One of them is a Pundit who has never read the book and would rather nobody finds out.

This document is the contract for the first implementation PR. It fixes the loop, the roles, the map, the tasks, the meeting flow, the single-player shape, the stack, the cut line, and the data shapes. Anything not in the MVP list is out until the MVP runs end to end.

This document is design only. No code exists yet.

## One sentence

A one-human, five-bot social-deduction round set in a think tank, where Fellows finish satirical academic tasks while a hidden Pundit discredits them one at a time, and everyone argues about it in a meeting.

## Principles that shaped this brief

The brief names the pstack principles that changed a decision, so the implementer knows which choices are load-bearing and which are taste.

**Laziness Protocol.** The map is a graph of five rooms, not a 2D tile map. The player clicks a door and arrives 1.2 seconds later. No sprites, no collision, no pathfinding, no camera. Chat is a menu of canned lines, so the bots never parse free text. The human is always a Fellow in the MVP, so the bots never need to run a deduction that fools a human Pundit. Each of these deletes a subsystem.

**Model the Domain.** The whole match is one discriminated union `Phase` and one pure reducer `step(state, action)`. Rooms are a table. Tasks are a registry keyed by `TaskKind`. Bots return `Action` values through the same reducer the human uses. There are no `isMeeting` or `isDead` booleans anywhere.

**Sequence Work into Verifiable Units.** The implementation plan below is seven units. Each unit ends in a check a reviewer can rerun, and each unit is one commit. Unit 2 (the reducer and its tests) lands before any UI.

**Experience First.** Four tasks that feel good beat eight stubs. The meeting has a real 30 second clock, a vote reveal, and an ejection line. Those three moments are where the game is funny, so they get the polish budget.

## Tone

The joke is on jargon, credentials, and confident people who have not done the reading. It is never on a real person or a group of people. Rules for copy:

- No real names, no real institutions, no real publications.
- Jokes live in copy and task content, never in mechanics. The mechanics are a fair deduction game.
- The Pundit is a role, not an identity. Anyone can draw it.
- Keep every line short enough to read during a 30 second discussion.

If a line needs a footnote to be funny, cut it.

## Core loop

```
Prep ──start──▶ Match ──report or podium──▶ Meeting ──eject or skip──▶ Match
                  │                              │
                  ├── all tasks done ───────────▶ Win
                  ├── human discredited ────────▶ Lose
                  └── Fellows alive <= Pundits ─▶ Lose   (also checked after an eject)
                                                 Meeting ── Pundit ejected ──▶ Win
```

1. **Prep.** The human picks a name and a mug color. Press **Convene**. The game seeds an RNG, deals one Pundit among the five bots, and assigns four tasks to each Fellow.
2. **Match.** Everyone moves between rooms and does tasks. The Pundit bot discredits a Fellow when the two are alone in a room and its cooldown is ready. The discredited Fellow becomes a Footnote that stays in the room.
3. **Meeting.** A Fellow who enters a room with a Footnote can **Report**. The human can also call one **Emergency Symposium** per match from the Podium in the Atrium. Discussion runs 30 seconds, voting runs 20 seconds, the result shows for 5 seconds.
4. **Win or Lose.** Fellows win when every task is done or the Pundit is ejected. The human loses when discredited, or when the number of living Fellows is less than or equal to the number of living Pundits.

A round runs about four to six minutes.

## Roles

| Role | Satire name | Count in MVP | Can | Cannot |
| --- | --- | --- | --- | --- |
| Crew | **Fellow** | 5 (1 human, 4 bots) | move, do tasks, report a Footnote, call one Symposium, vote | see roles |
| Impostor | **Pundit** | 1 (bot) | move, pretend to do tasks, discredit a lone Fellow, vote, lie in chat | complete tasks |
| Dead crew | **Footnote** | starts at 0 | be found | anything else in the MVP |

Each bot has a name and a title. Titles are pure flavor and appear on the mug chip and in the ejection line.

| Name | Mug color | Title |
| --- | --- | --- |
| Ambrose | mustard | Visiting Fellow in Vibes |
| Priya | plum | Chair of Applied Nuance |
| Ludo | teal | Emeritus Reply Guy |
| Greta | rust | Adjunct of Everything |
| Kwame | sage | Director of Discourse |
| Sunny | ink | Fellow, Unpaid |

The human takes one of the six slots and the remaining five become bots.

## Win and lose conditions

Checked by the reducer after every action, in this order. Losses come first so a discredit that also completes the task count still ends the round as a loss.

1. **Lose, discredited.** The human's `alive` flag is false. Screen copy: "You are now a Footnote. Your work will be cited incorrectly."
2. **Lose, outnumbered.** Living Fellows are less than or equal to living Pundits. Screen copy: "The Pundit has been given a column."
3. **Win, vote.** The ejected player was the Pundit. Screen copy: "The Pundit has been asked to step back from public life."
4. **Win, tasks.** Every task has `status: "done"`. Screen copy: "MANIFESTO PUBLISHED. Nobody will read it."

Tasks owned by a discredited Fellow still count toward the total. The reducer marks them done when the Fellow is discredited, so the crew is never blocked by a body, and the Win, tasks check stays a plain count.

## Map

One floor of The Institute for Applied Discourse. Five rooms, rendered as a room card with exits, not as a top-down map. A small graph diagram in the header shows the five rooms and highlights the human's current room.

```
          ┌───────────┐
          │  Library  │
          └─────┬─────┘
                │
┌─────────┐ ┌───┴────┐ ┌──────────────┐
│ Archive ├─┤ Atrium ├─┤ Seminar Room │
└────┬────┘ └───┬────┘ └──────────────┘
     │          │
     │   ┌──────┴────────┐
     └───┤ Faculty Lounge│
         └───────────────┘
```

| Room id | Name | Exits | Tasks | Notes |
| --- | --- | --- | --- | --- |
| `atrium` | Atrium | library, archive, seminar, lounge | none | spawn point, holds the Podium |
| `library` | Library | atrium | citation-hunt | quiet, good for a discredit |
| `seminar` | Seminar Room | atrium | peer-review | dead end |
| `lounge` | Faculty Lounge | atrium, archive | coffee-refill | |
| `archive` | Archive | atrium, lounge | jargon-filter | |

Travel between adjacent rooms takes 1.2 seconds. During travel the player is in neither room and cannot be discredited or seen. Two dead ends (Library, Seminar Room) give the Pundit places to work and give the human a reason to remember who went where.

Back channels (a hidden passage for the Pundit) are out of the MVP. The Pundit bot walks like everyone else.

## Tasks

Four task kinds, one per non-Atrium room. Each is a modal that renders one small interaction and calls `complete()` once. Each human task takes 3 to 6 seconds. Bots do not see the UI. A bot finishes a task after a fixed duration in the room.

| Kind | Room | Interaction | Duration | Copy |
| --- | --- | --- | --- | --- |
| `citation-hunt` | Library | Three sources shown. Click the one with a year and a page number. The two fakes are a blog and "personal communication". | one click | "Find a real source. Any real source." |
| `peer-review` | Seminar Room | Hold the **Approve** stamp for 2 seconds. A progress ring fills. Release early and it resets. | 2 second hold | "Sign the review. Do not read the paper." |
| `jargon-filter` | Archive | One sentence with four highlighted words. Click the two jargon words. Wrong click shakes and continues. | two clicks | "Remove the words that mean nothing." |
| `coffee-refill` | Faculty Lounge | Hold **Pour**. The cup fills. Release between the two lines to pass, otherwise it empties and restarts. | 1 to 3 second hold | "Refill. This is the real work." |

Each Fellow gets four tasks, one of each kind. Total task count is 5 Fellows times 4 tasks, 20 tasks. The task bar in the header shows the crew total, so the human can feel the win approach.

Task content pools (sentences for `jargon-filter`, source triples for `citation-hunt`) live in a small static file. Ten of each is enough for the MVP.

A fifth task, `grant-application` (type a four digit code from a memo), is out of the MVP.

## Discredit and report

The Pundit bot discredits when all of these hold:

- It is in a room with exactly one living Fellow and no other player.
- Its cooldown (25 seconds, starts at 15 seconds) is ready.
- A random roll passes (60 percent per eligible tick, checked every 250 milliseconds while the condition holds).

The discredited Fellow becomes a Footnote in that room. The Pundit bot then moves to an adjacent room on its next tick.

Any living Fellow who enters a room with a Footnote sees it and gets a **Report** button (the human) or reports on the next tick (a bot, 80 percent). Report ends the Match and starts a Meeting with `reason: { kind: "footnote", victimId, roomId }`.

## Meeting and vote

The Meeting is one full-screen panel with three stages on one clock.

**Discuss, 30 seconds.** A chat column on the left, the six mug chips on the right. The reason line sits at the top ("Ambrose found Priya in the Library." or "Sunny called an Emergency Symposium."). The human speaks by picking from a line menu:

- "I was in the [room]."
- "I saw [player] in the [room]."
- "[player] was alone with them."
- "I vouch for [player]."
- "Skip. We know nothing."

Every line takes a target from a dropdown where it needs one. Bots speak one or two lines each during the 30 seconds, drawn from the same menu. Fellow bots tell the truth from their own memory. The Pundit bot claims a room it was not in half the time and accuses whoever accused it.

**Vote, 20 seconds.** Every living player picks one mug chip or **Skip**. Votes stay hidden until the timer ends or everyone has voted. The human can change their vote until then.

**Result, 5 seconds.** Votes appear under each chip. Plurality ejects. A tie or a Skip plurality ejects nobody. The ejection line reveals the role:

- "Ambrose was escorted to the parking lot. Ambrose was not the Pundit."
- "Ludo was escorted to the parking lot. Ludo was the Pundit."

Then the reducer runs the win and lose checks and either returns to Match or ends the round.

Free text chat is out of the MVP. A text box that the bots ignore would feel broken, so the MVP does not show one.

## Bots

Bots are pure functions of `(state, botId, rng)` that return zero or more `Action` values per tick. They keep a small private memory that the reducer stores under `state.bots[botId]`.

**Fellow bot, Match.** Pick the nearest room with one of its unfinished tasks, walk there, wait the task duration, mark it done, repeat. Ten percent of the time it wanders to a random room instead. On every tick it records where it currently sees each player in `lastSeen`.

**Pundit bot, Match.** Walk to random rooms, prefer dead ends. Stand in a task room for a task-length duration to look busy. Discredit per the rule above.

**All bots, Meeting.** Compute a suspicion score per living player:

- +3 if `lastSeen[x]` was the victim's room within 10 seconds before the report.
- +2 if x accused this bot in this meeting.
- +1 if x is the player this bot has seen least often.
- A random 0 to 1 tiebreaker.

A Fellow bot votes for the top score if it is at least 3, otherwise Skip. The Pundit bot ignores its own memory and votes for whoever accused it, else a random Fellow. Each bot says one line about its top suspect or one vouch for its lowest.

This is enough for the human to catch the Pundit by cross-checking bot claims against their own observations. It is also enough for bots to sometimes eject the wrong Fellow. That mistake is the genre working as intended.

## Single-player MVP shape

One human, five bots, one round at a time, all in the browser tab. No accounts, no server, no persistence beyond the seed in the URL hash so a round can be replayed.

The human is always a Fellow. Human-as-Pundit is the first post-MVP feature because it only changes who emits the discredit action, but it needs bots that can be fooled, and that is a second bot personality.

Local hotseat was considered and rejected. Passing one laptop between six people every 250 milliseconds does not work for a real-time movement game.

## Tech recommendation

| Layer | Choice | Rationale |
| --- | --- | --- |
| Runtime and scripts | Bun | monorepo default, `bun install && bun run dev` |
| Scaffold | `bunx create-vite --template react-ts` | smallest official React scaffold with no server |
| Language | TypeScript strict | the `Phase` union and `Action` union are the point |
| UI | React 19, `useReducer` over `step`, Tailwind, shadcn `Dialog` and `Button` only | no state library, no router, task modals are dialogs |
| RNG | a 32 bit seeded PRNG in `src/game/rng.ts` | replays and deterministic tests |
| Tests | `bun test` on `src/game/*.test.ts` | reducer and bot logic only, no component tests |
| Server | none in the MVP | client only |

Multiplayer later is a transport change, not a rewrite. The reducer is pure and every `Action` is JSON. A Bun WebSocket server would hold the authoritative `GameState`, run the same `step`, and broadcast state. Bots would keep working as server-side actors. Do not build any of it now.

Before the first `bun install`, create `bunfig.toml` with `[install] minimumReleaseAge = 259200` per `AGENTS.md`.

## Art direction

Faculty lounge brutalism. Warm paper, coffee rings, a chalkboard accent, red pen for danger.

| Token | Value | Use |
| --- | --- | --- |
| paper | `#F3EEE4` | page background |
| ink | `#1E1B18` | text, borders |
| highlighter | `#F2D34B` | task progress, selected chip |
| red-pen | `#C8452D` | Footnote, Report, ejection |
| chalk | `#2F5D50` | Podium, Convene, Win |

Type is a serif for headings (Fraunces or Cormorant, one weight) and a monospace for chat and timers. Players are coffee mugs, a rounded cylinder with a handle in the player's color, plus one accessory drawn in ink (glasses, a beret, a lanyard, a scarf, a pen behind the ear, a tiny book). Footnotes are the same mug tipped over with a spill. No bean shapes, no visors, no spacesuits.

Motion is CSS transitions only. Room change fades the room card. Chips slide when a player enters or leaves. The vote reveal drops the vote marks one at a time over the 5 second result stage.

## MVP cut line

**In the MVP.**

- Prep screen with name, mug color, and **Convene**.
- Five-room graph map as a room card with exits and occupants.
- One human Fellow, four Fellow bots, one Pundit bot.
- Four tasks with the interactions above, 20 tasks total, header progress bar.
- Discredit, Footnote, Report.
- One Emergency Symposium per match from the Podium.
- Meeting with canned chat, timed vote, plurality eject, role reveal.
- Win and Lose screens with the copy above and a **Convene again** button that reuses or rerolls the seed.
- Seeded RNG with the seed in the URL hash.
- Keyboard focus order and visible focus rings on every button.
- Unit tests for `step` transitions, vote tallies, and win checks.

**Out of the MVP, in rough priority order.**

1. Human as Pundit.
2. Notebook panel that auto-fills the human's `lastSeen`.
3. Sabotages. "The Discourse" forces everyone to the Atrium. "Wi-Fi Down" hides the task bar.
4. Back channels for the Pundit.
5. Footnotes that can still do tasks as ghosts.
6. `grant-application` task.
7. Settings for player count, task count, and timers.
8. Free text chat.
9. Sound.
10. Bun WebSocket server and real multiplayer.

## Data shapes

TypeScript, in `src/game/types.ts`. Illegal states are unrepresentable by construction. There is no `alive && inMeeting` combination to check because `Phase` carries the meeting.

```ts
export type PlayerId = 0 | 1 | 2 | 3 | 4 | 5;
export type RoomId = "atrium" | "library" | "seminar" | "lounge" | "archive";
export type Role = "Fellow" | "Pundit";
export type TaskKind = "citation-hunt" | "peer-review" | "jargon-filter" | "coffee-refill";
export type TaskId = `${PlayerId}:${TaskKind}`;
export type Rng = () => number;

export interface Room {
	id: RoomId;
	name: string;
	exits: readonly RoomId[];
	task: TaskKind | null;
	hasPodium: boolean;
}

export interface Player {
	id: PlayerId;
	name: string;
	title: string;
	color: string;
	role: Role;
	alive: boolean;
	isHuman: boolean;
	location: { kind: "room"; roomId: RoomId } | { kind: "travel"; to: RoomId; arrivesAt: number };
}

export interface Task {
	id: TaskId;
	kind: TaskKind;
	roomId: RoomId;
	ownerId: PlayerId;
	status: "todo" | "done";
}

export interface Footnote {
	victimId: PlayerId;
	roomId: RoomId;
	at: number;
}

export type Vote = { voterId: PlayerId; target: PlayerId | "skip" };

export type ChatLine =
	| { speaker: PlayerId; kind: "was-in"; roomId: RoomId }
	| { speaker: PlayerId; kind: "saw"; target: PlayerId; roomId: RoomId }
	| { speaker: PlayerId; kind: "alone-with"; target: PlayerId }
	| { speaker: PlayerId; kind: "vouch"; target: PlayerId }
	| { speaker: PlayerId; kind: "skip" };

export type MeetingReason =
	| { kind: "footnote"; reporterId: PlayerId; victimId: PlayerId; roomId: RoomId }
	| { kind: "podium"; callerId: PlayerId };

export interface Meeting {
	reason: MeetingReason;
	stage: "discuss" | "vote" | "result";
	stageEndsAt: number;
	chat: ChatLine[];
	votes: Vote[];
	ejected: PlayerId | null;
}

export type Phase =
	| { kind: "Prep" }
	| { kind: "Match" }
	| { kind: "Meeting"; meeting: Meeting }
	| { kind: "Win"; how: "tasks" | "vote" }
	| { kind: "Lose"; how: "discredited" | "outnumbered" };

export interface BotMemory {
	lastSeen: Partial<Record<PlayerId, { roomId: RoomId; at: number }>>;
	accusedBy: PlayerId[];
	nextDiscreditAt: number;
	target: RoomId | null;
	busyUntil: number;
}

export interface GameState {
	seed: number;
	now: number;
	phase: Phase;
	players: readonly Player[];
	tasks: readonly Task[];
	footnotes: readonly Footnote[];
	symposiumUsed: boolean;
	bots: Partial<Record<PlayerId, BotMemory>>;
}

export type Action =
	| { type: "convene"; humanName: string; humanColor: string; seed: number }
	| { type: "tick"; now: number }
	| { type: "move"; playerId: PlayerId; to: RoomId }
	| { type: "complete-task"; taskId: TaskId }
	| { type: "discredit"; punditId: PlayerId; victimId: PlayerId }
	| { type: "report"; reporterId: PlayerId; victimId: PlayerId }
	| { type: "call-symposium"; callerId: PlayerId }
	| { type: "say"; line: ChatLine }
	| { type: "vote"; vote: Vote }
	| { type: "reset" };

export function step(state: GameState, action: Action): GameState;
export function botActions(state: GameState, botId: PlayerId, rng: Rng): Action[];
```

### Phase transitions

`step` rejects any action that its current phase does not list. Rejected actions return the same state object, so the UI can call `step` freely.

| From | Action | Guard | To |
| --- | --- | --- | --- |
| Prep | `convene` | | Match |
| Match | `move` | player alive, `to` is an exit of the current room | Match |
| Match | `complete-task` | owner alive, owner in `task.roomId`, status todo | Match, or Win tasks |
| Match | `discredit` | pundit and victim alone in one room, cooldown ready | Match, or Lose discredited, or Lose outnumbered |
| Match | `report` | reporter alive, in a room with that Footnote | Meeting discuss |
| Match | `call-symposium` | caller alive, in `atrium`, `symposiumUsed` false | Meeting discuss |
| Meeting discuss | `say` | speaker alive | Meeting discuss |
| Meeting discuss | `tick` | `now >= stageEndsAt` | Meeting vote |
| Meeting vote | `vote` | voter alive, one vote per voter (latest wins) | Meeting vote |
| Meeting vote | `tick` | `now >= stageEndsAt` or every living player voted | Meeting result |
| Meeting result | `tick` | `now >= stageEndsAt` | Match, Win vote, or Lose outnumbered |
| Win, Lose | `reset` | | Prep |
| any | `tick` | | same phase with `now` advanced and travel arrivals applied |

Rooms are a `Record<RoomId, Room>` table in `src/game/rooms.ts`. Task interactions are a `Record<TaskKind, TaskDef>` registry in `src/game/tasks.ts` where `TaskDef` holds the room, the bot duration, the copy, and the React component. Adding a task kind is one row in that registry.

## Implementation plan, seven verifiable units

Each unit is one commit and ends in the named check. Do not start the next unit until the check passes.

1. **Scaffold.** `bunx create-vite` react-ts, `bunfig.toml`, Tailwind, shadcn init with `Button` and `Dialog`. Check: `bun install && bun run dev` serves a page with the game title.
2. **Domain.** `types.ts`, `rooms.ts`, `rng.ts`, `step.ts` with the Prep, Match, Win tasks path. Check: `bun test` passes tests for convene, move guard, complete-task, and Win tasks.
3. **Map UI.** Room card, exits, occupants, travel state, header with task bar. Check: click through all five rooms in the browser.
4. **Tasks.** Four `TaskDef` components wired to `complete-task`. Check: complete all four human tasks and watch the bar move.
5. **Bots and discredit.** `botActions` for Fellow and Pundit, discredit, Footnote, Report. Check: a fixed seed reaches a Meeting within 90 seconds, asserted in a test that ticks the reducer.
6. **Meeting.** Discuss, vote, result, eject, role reveal, Win vote, Lose discredited, Lose outnumbered. Check: tests for plurality eject, tie skips, Pundit eject wins, last Fellow loses.
7. **Polish and evidence.** Tokens, mugs, copy, screens, focus rings. Check: one screenshot of a Meeting and one video of a full round, attached to the PR per `AGENTS.md`.

## Open decisions for the implementer

These are taste calls. Pick one and note it in the PR.

- Whether the header map shows the human's last-seen positions or only the current room's occupants. The brief recommends occupants only in the MVP and the Notebook later.
- Whether a Footnote is drawn in the room card or only announced by a red-pen banner. The brief recommends drawing the tipped mug.
- Discussion length. 30 seconds is the brief's guess. If bots finish talking in 10 seconds, cut it to 20.
