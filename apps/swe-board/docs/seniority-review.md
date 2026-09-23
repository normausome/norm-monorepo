# Seniority classifier review

Review of `scraper/seniority.ts` as merged in PR #20 (commit `105acef`). The question was whether `inferSeniority` marks existing and newly scraped jobs by level accurately enough, and what to change if not.

Verdict: `FOLLOW_UP_PR`. The rule table and its precedence are sound. The follow-up is a handful of regex edits plus tests, listed in order at the end. Nothing in this document changes classifier code.

## How the numbers were produced

On 2026-09-21 a script fetched all 50 boards through `ADAPTERS`, ran `classify()` and `inferSeniority()` over every posting, and wrote `title -> bucket` per bucket. All 50 boards fetched. 16,566 postings, 11,331 distinct titles, 2,794 kept by `classify()`. The kept count matches the README.

| Bucket | Kept postings |
|--------|---------------|
| entry | 25 |
| associate | 0 |
| mid | 940 |
| senior | 1,068 |
| staff | 624 |
| principal | 117 |
| manager | 19 |
| unknown | 1 |

I read every title in `entry`, `associate`, `manager`, `principal`, and `unknown`, and searched `mid`, `senior`, and `staff` for level hints the rules might have missed (numerals, `L2`, `grad`, `lead`, `expert`, `all levels`, `technical staff`, management words). I also ran a fixed list of 53 probe titles for hypothesized gaps. Each claim below says whether it comes from the live corpus or from a probe.

## What is already strong

- Precedence does the work. "Senior Staff Engineer" is `staff`, "Senior Principal Software Engineer" and "Tech Lead /Sr. Principal Engineer (L6)" are `principal`, "Staff Engineering Manager" is `manager`, "Principal Software Engineer I - Serverless" is `principal`. Live corpus.
- Ranges take the higher end. "Site Reliability Engineer (Mid-Level, Senior or Staff)", "Senior / Staff Fullstack Engineer", "Staff/Principal Software Engineer", and "(Intermediate to Senior Staff)" all land on the top of the range. Live corpus.
- Numerals stay anchored to the role word. "Software Engineer 3, Atlas Growth 2" is `mid`, "Software Engineer 2027 Start" and "Software Engineer 10x Platform" are `mid`, "Software Engineer, Vehicle Software, V&V" is `mid`, "Software Engineer in Test" is `mid`. Live corpus and probes.
- Company grades are left alone, and the default covers them. Twilio's "Software Engineer (L2)", "Software Engineer L3", and "Machine Learning Engineer L2" fall to `mid`, which is where Twilio puts L2 and L3. "Staff Software Engineer (L4)" and "Principal Engineer (L5)" get their level from the word. Live corpus, 13 titles.
- Portuguese works on the live boards. "Desenvolvedor(a) Backend .NET Pleno" is `mid`, "Desenvolvedor(a) Back-End Java Sênior" and "Desenvolvedor Fullstack SR (C# / React)" are `senior`, "Especialista FrontEnd" is `staff`. Live corpus.
- "Member of Technical Staff" is `mid` and "Member of Technical Staff, Lead Researcher" is `senior`. Live corpus.
- The `senior` bucket holds no title without a `senior`, `sr`, `sênior`, or `lead` word, and the `staff` bucket holds no title without `staff` or `especialista`. So neither bucket is inflated by numerals or by the default. Live corpus.
- The application path is right. `classify()` writes `seniority` on scrape and the `PgStore` upsert overwrites it on every re-see, so a rule change reaches every active row on the next `bun run scrape`. `backfillSeniority` rewrites only changed rows, covers inactive rows, and a second run changes nothing. Read from `db/store.ts` and `scraper/backfill-seniority.ts`.

## Gaps

Ordered by effect on the board today.

### 1. Intern postings pass the title filter in French and Spanish

`classify.ts` `TITLE_EXCLUDE` drops `intern`, `internship`, `co-op`, and `apprentice`. It does not drop `stagiaire`, `estagiário`, `pasante`, `becario`, `werkstudent`, or `trainee`, which `seniority.ts` rule 6 already knows. "Développeur Logiciels (Stagiaire), Backend (l'été 2027 - Montreal)" (Lyft) is on the board now as `entry`. Live corpus, 1 posting. Probes confirm "Desarrollador Backend (Pasante)" and "Werkstudent Backend Engineer" also pass the filter.

This is a filter bug, not a seniority bug, but it puts a wrong position on the board and the fix is one regex.

### 2. `manager` matches product and team names

Rule 1 fires on any `manager` in the title. "Software Engineer, Ads Manager" (OpenAI) and "Staff Software Engineer, Technical Lead, Lakebase Manager (LBM)" (Databricks) are IC roles that read as `manager`. Both are also dropped by `TITLE_EXCLUDE`, so they never reach the board. Live corpus, 2 postings. Probes show the same for "Password Manager", "Package Manager", and `head` in "Software Engineer, Head Unit Integration".

The management words in these titles come after the role word with another noun in between. Real manager titles put the management word first ("Manager, Forward Deployed Engineer"), directly after the role word ("Engineer Manager, HR Applications", "ML Engineer Manager"), or after only a separator ("Forward Deployed Engineer, Manager - London", "Field Engineer / Supervisor"). "Engineering Manager" has no role word at all, because `engineering` is not in `ROLE`.

Proposed rule 1, measured on all 11,331 distinct titles. A management word counts when it appears before the first role word, or right after one with at most a `-`, `,`, `/`, or `|` between. It flips 5 titles. The 2 wanted ones above, plus "Developer GTM Strategy Manager" (2 variants) and "Structural Engineer - Project Manager", which `TITLE_EXCLUDE` drops on other words. Every other manager title in the corpus keeps its bucket.

```ts
const MGMT = String.raw`(?:manager|mgr|director|head|supervisor|[rsea]?vp|vice president|president|chief)`
const MANAGEMENT = new RegExp(String.raw`^(?:(?!\b${ROLE}\b)[\s\S])*?\b${MGMT}\b|\b${ROLE}\b\s*[-,/|]?\s*\b${MGMT}\b`, "i")
```

For the two IC titles to reach the board, `TITLE_EXCLUDE` needs the same shape for `manager`. Without that half, the seniority change is correct but invisible.

### 3. Spanish and LatAm level words

Zero live hits today, but the board targets LatAm and Sezzle already posts to Argentina, Chile, Colombia, and Mexico. Probes:

- "Semi Senior Backend Developer" and "Desarrollador Semi-Senior Fullstack" read as `senior`. Semi senior is the Spanish-market word for mid. "SSr" reads as `mid` by default and needs nothing.
- "Desarrollador Sénior Backend" reads as `mid`. Rule 4 has `s[êe]nior` and misses the Spanish `é`.
- "Snr Software Engineer" reads as `mid`. One live "Snr Solutions Architect", dropped by the filter.

### 4. Entry words with a hyphen or a different noun

Probes. "Early-Career Software Engineer" reads as `mid` because rule 6 has `early career` with a literal space. "Software Engineer, University Grad", "Software Engineer (Recent Grad)", and "Software Engineer, New College Grad 2027" read as `mid` because rule 6 has `new grad(uate)?` and `graduate`, not a bare `grad`. Zero live hits in kept titles. 25 live titles contain `grad`. 24 are "New Grad" variants and one is a customer experience role. The filter drops all 25.

### 5. "All Levels" reads as `mid`

"Mobile Engineer (Argentina, All Levels)" and six sibling Sezzle postings fall to the default. Live corpus, 7 postings. `mid` is invented here. `unknown` is the honest bucket and the API already filters on it. This is a judgment call. The README would need one line, because `unknown` currently means "no role word".

### 6. Smaller items, zero or one live hit each

- "Expert DevOps Engineer" (Jobgether) is `mid`. Expert sits at or above senior on European ladders. Live corpus, 1 posting. "Advanced Software Engineer" is also `mid` and I would leave it, since `advanced` names a team in three other live titles.
- "Member, Technical Staff" is `staff`. The MTS normalization matches only `member of technical staff`. Live corpus, 1 posting, dropped by the filter for the same reason.
- "Software Engineer V&V" would be `senior` and "Software Engineer I&T" would be `entry`, because the numeral lookahead `(?=\W|$)` accepts `&`. Probes only. The two live V&V titles are safe because "Vehicle Software" sits between the role word and the numeral.
- "Junior/Mid Software Engineer" and "Junior to Mid-Level Backend Engineer" read as `entry`. Every other range takes the higher end. Probes only.
- "Associate Staff Engineer" is `staff` and "Associate Principal Engineer" is `principal`. Zero kept `associate` titles. Of the 381 dropped ones, the only software title is "Associate Principal Engineer, AI Architect", dropped on `architect`. Leave it.

## What not to change, and why

- `lead` as `senior`. 86 kept titles carry `lead`. "Lead Software Engineer", "Tech Lead", and "Forward Deployed Engineering Lead" span senior to staff across companies. `senior` is the conservative pick and the README says so.
- `founding` as `mid`. "Founding Full Stack Software Engineer, Legal" is a level-less title. Two distinct kept titles across 8 postings, and the other one, "Founding Staff Mobile Engineer", already gets `staff` from its level word. Pay says senior, the title does not.
- `III` as `mid`. Affirm, MongoDB, Sezzle, and Pinterest each post "Engineer II" or "Engineer 3" titles next to separate "Senior" titles, so on these boards the numerals sit below senior. Amazon's SDE III is senior, but Amazon is not a board.
- `L#` not read. Twilio L2 and L3 fall to `mid` correctly on their own.
- `chief` as `manager`. Every live `chief` title with a role word is an Anduril "Chief Engineer" or "Deputy Chief Engineer" hardware program role, 23 distinct titles. The rest are "Chief of Staff" and C-level titles. The filter drops all of them.
- Roman ranges like "III/IV". One live title, "Senior Software Engineer I/II - Infrastructure", and the level word already decides it.
- French and German role words (`ingénieur`, `entwickler`). Four live French titles, all dropped by the English-only `TITLE_INCLUDE`. Adding role words without include patterns changes nothing.

One product observation, no change proposed. `TITLE_EXCLUDE` drops `new grad` but keeps `entry-level`, `early career`, and "Engineer I", so the `entry` bucket holds 25 postings while 24 "New Grad" software titles are dropped. If the board wants new grads, that is a filter decision, and rule 6 already buckets them.

## Change list for Composer

Keep first-match precedence. Items 1 and 2 change the board. Items 3 to 6 are cheap and guard the LatAm audience. Item 7 is the one reorder, and it is optional. Add each title named below to `seniority.test.ts` or `classify.test.ts` under its bucket.

1. `classify.ts` `TITLE_EXCLUDE`. Extend the intern alternation with `stagiaire|estagi[áa]ri[oa]|pasante|becari[oa]|werkstudent|praktikant(in)?|trainee`. Test: "Développeur Logiciels (Stagiaire), Backend" is not a SWE title.
2. `seniority.ts` rule 1. Replace the regex with the positional `MANAGEMENT` regex above. `classify.ts` `TITLE_EXCLUDE`. Give `manager` the same positional shape, or move it into a shared export from `seniority.ts`. Tests: "Software Engineer, Ads Manager" is `mid` and kept, "Staff Software Engineer, Technical Lead, Lakebase Manager (LBM)" is `staff` and kept, "Forward Deployed Engineer, Manager - London" and "Engineer Manager, HR Applications" stay `manager` and dropped.
3. `seniority.ts`. Add `[/\bsemi[- ]?(senior|sr)\b/i, "mid"]` before rule 4. Test: "Desarrollador Semi-Senior Fullstack" is `mid`.
4. `seniority.ts` rule 4. Change `s[êe]nior` to `s[êée]nior` and add `snr`. Tests: "Desarrollador Sénior Backend" and "Snr Software Engineer" are `senior`.
5. `seniority.ts` rule 6. Change `early career` to `early[- ]career` and add `\bgrad\b` alongside `new grad(uate)?`. Tests: "Early-Career Software Engineer" and "Software Engineer (Recent Grad)" are `entry`.
6. `seniority.ts` `level()`. Change the lookahead `(?=\W|$)` to `(?![\w&])`. Test: "Software Engineer V&V" is `mid`.
7. Optional. `seniority.ts`. Move rule 7 (`mid-level|intermediate|pleno`) above rule 6 so "Junior/Mid" takes the higher end like every other range. No live title changes bucket. Test: "Junior/Mid Software Engineer" is `mid`.
8. Optional. `seniority.ts`. Add `[/\ball levels\b/i, "unknown"]` before rule 8 and add one README line under Seniority. Test: "Mobile Engineer (Argentina, All Levels)" is `unknown`.
9. Optional. `seniority.ts`. Add `expert` to rule 4. Test: "Expert DevOps Engineer" is `senior`.
10. Optional. `seniority.ts` and `classify.ts`. Change the MTS pattern to `member(?:,| of)(?: the)? technical staff` in both files. Test: "Member, Technical Staff" is `mid`.
11. README Seniority table. Update rows 1, 4, and 6 for whatever landed, and refresh the bucket counts with `bun run backfill:seniority`.
12. After merge, run `bun run backfill:seniority` once against production so inactive rows pick up the new rules. Active rows update on the next scrape.
