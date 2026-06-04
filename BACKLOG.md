# Forge Dashboard — Rehaul Backlog

**Strict per-page, per-component teardown.** Live ticket — updated every loop.
Nothing is "done" because it's obvious to me. Done = a first-timer would understand it without asking.

## The 3 pillars (every item must pass all three)

1. **Beautiful** — clean, intentional, nothing dumped.
2. **Seamless** — every piece flows into the next; consistent terms, consistent data.
3. **Understandable instantly** — first-timer gets it with zero explanation. If they would ask "what is this?", it fails.

Per-component status uses three glyphs, one per pillar (Beautiful · Seamless · Understandable):
- `● ● ●` — all three pass
- `◐ ◐ ◐` — partial (note what's still needed)
- `○ ○ ○` — not yet reviewed under this rubric

## Five seats — judge every page from all of them

1. **First-time viewer** — landed from a link, no context.
2. **Investor** — wants to grasp the value prop in 30s.
3. **Would-be miner** — could fork it, wants to know how.
4. **Mining agent** — machine consumer; needs structured endpoints.
5. **Human miner hunting results** — wants to find their own submission and improve it.

If any seat would be confused, the component fails.

---

## NEXT UP (priority queue)

1. ~~**Surface the SOTA agent's actual code inline**~~ ✅ shipped step 343 (`fb4d06f`). `SotaCodeViewer` renders `agent.py` inline on spec detail with Python syntax highlight + line numbers + 28-line collapsed view with Expand toggle + Copy chip + GitHub-↗ as secondary affordance.
2. ~~**Spec detail header literacy**~~ ✅ shipped step 344 (`735dbec`) + step 346. Plain-English sentence above `SpecDiagram` names material + kg load + arm mm + allowable MPa in connecting prose ("a PETG bracket bolted to a wall must hold 15 kg pulling straight down at the tip of a 78 mm cantilever arm, without exceeding 27 MPa peak stress"). Step 346: chips on the H1 row now consistently render with a low-opacity `ⓘ` suffix glyph + hover bg/text lift via a shared `InfoChip` local helper (5 chips: material / load / SF / MPa / tier) — first-timer sees the affordance without having to discover it by accident.
3. **Side / front-view diagram** — currently small and weak, only shown after spec selection. Promote it; explain the bolt pattern, the load arrow, the wall-mount plane.
4. **Spec vs problem vs round** — pick one word per concept across all pages. Audit copy; remove the synonym drift.
   - ✅ Canonical glossary anchored to `QuickstartGuide` Terminology block (lines 432–437): **Problem** = user-facing unit of work · **Spec** = its JSON definition (CLI `--spec`, API `/specs/{id}`) · **Round** = a set of 15 problems sharing one optimization category · **Category** = the metric (mass / stiffness / deflection).
   - ✅ Step 347 (`punch/terminology-sweep`): 3 surgical swaps to align user-visible copy with the glossary —
     - `App.tsx` L428: `Browse the three challenge types` → `Browse the three problem categories` (drops orphan "challenge" synonym in 4-step landing card)
     - `App.tsx` L1756: `Problem definition (JSON):` → `Spec (JSON):` (the JSON IS the spec per glossary; URL is `/specs/{id}` already)
     - `Playground.tsx` L215: `A problem defines a cantilever bracket challenge:` → `A problem defines a cantilever bracket:` (the colon + list does the work; no synonym needed)
   - ⏸️ Round-vs-category seam unresolved: HeroStats pill (`{label} round`) says "MASS / WEIGHT ROUND" while landing header says "Problem Categories" and sidebar back-link drops the "Round N — " prefix. Per glossary they ARE distinct (round = container, category = axis), so they shouldn't simply be collapsed — but the 1:1 data shape today makes the seam wobble. Decision deferred until round count per category grows past 1.
5. **Rankings → agent profile → per-problem code-fork loop** — closing the loop: from rankings, a miner should reach the best agent's code in ≤2 clicks.
   - ✅ **Click count met**: step 348 puppeteer survey — `/rankings` `↗ code` chip on agent row is **1 click** to agent source (3 chips per row: Mass / Stiffness / Deflection, each pinned to that category's winning `agent.py`).
   - ✅ **Flywheel gap closed (step 333, PR #271)**: rankings `↗ code` chips now route to `/problems/:roundId/:specId#sota-code` (in-app `SotaCodeViewer`) instead of `github.com`. The viewer auto-expands and `scrollIntoView`s when the hash is present. Same conversion applied to `AgentDetailPage` per-problem rows. GitHub link kept as the secondary affordance inside the viewer header (`GitHub ↗`). Puppeteer-verified at 1440×900 from both surfaces — anchor lands at `top=96` matching `scrollMarginTop`.
6. **Extend inline code viewer to the Spotlight panel + Explorer "Current #1" panel** — they still link-out; the new `SotaCodeViewer` component is reusable. (Spotlight ref in App.tsx ~L557; Explorer ref ~L773/L861.)
   - ✅ Explorer "Current #1 — fork to beat" panel (`Playground.tsx`): lazy `<details>` gate added — `▶ Preview winning agent code — inline, no tab-switching`. Closed by default (no GitHub fetch); on click, renders `SotaCodeViewer` inline. Existing `↗ fork code` chip kept as the row-level link-out. Puppeteer verified: 0 GH fetches when closed, 1 fetch after open, body populates ≥1.2 KB with agent.py content.
   - ⏸️ Spotlight panel (`SotaHero` in App.tsx L460–578): inlining `SotaCodeViewer` here is the wrong move — the right column is fixed at `lg:w-72` (288 px) and already carries the title, contributor link, big metric card, prose, and two CTAs. Inline code at that width would force horizontal scroll on every line. Decision: keep the "View winning code →" link-out, and treat the **spec-detail page (step 343)** as the canonical inline-code surface. Spotlight's job is to point you at the spec page, not duplicate it.

---

## Pages

### Home / Problems landing (`/problems`)

- `LandingBanner` (hero with title, sub, CTA stack) — ◐ ◐ ◐ — investor-seat scan passes; first-timer "what's a Forge problem?" still soft.
- 4-step "Choose / Write / Open PR / Earn TAO" cards — ● ● ● — clean copy, sequential, no rework needed.
- `Spotlight` (SOTA hero with 3D viewer + spec sidecar) — ● ● ◐ — 3D loads cleanly; sidecar has metric card + prose, no chip row (BACKLOG note about "PETG · 15 kg load · 78mm arm" chips was phantom — those chips live on `HeroStats` spec-detail header, not `SotaHero`). Remaining gap: sidecar prose talks about "FEA / structural simulation" without a first-timer-friendly aside.
- Category grid (`CategoryCard`) — ● ● ● — three cards (Mass / Stiffness / Deflection) each with problem count + claim status.
- ~~`OverallLeaderboard` preview~~ — N/A. `ProblemsLanding` only reads `overallData.entries.length` for the `LandingBanner` agent count; no leaderboard preview is rendered on `/problems`. The actual `<OverallLeaderboard>` mount is on `/rankings` (App.tsx:1940), already reviewed under Rankings.
- Footer — ○ ○ ○ — not reviewed.

### Category page (`/problems/:roundId`)

- Round header (title, scoring metric, problem count) — ◐ ◐ ● — first-timer now reads a one-line plain-English goal directly under the H1 in the category accent color: "Lightest part that survives the load wins." (mass) / "Highest stiffness-per-gram wins." (stiffness) / "Least bending under the applied load wins." (deflection). Goal sentence sourced from a new `goal` field on `CATEGORY_META` (App.tsx:79) — same vocabulary as the `CATEGORY_PILL.goal` row used on spec-detail, so first-timer's mental model carries across pages. Still needs review for Beautiful/Seamless (visual rhythm, breadcrumb, claim-count layout).
- Tier filter row (`All` / `easy` / `medium` / `hard` / `Unclaimed`) — ● ● ● — now prefixed with an uppercase `Difficulty` label (10px, muted, cursor-help, 191-char tooltip) — first-timer immediately sees what dimension the pills control instead of having to hover-discover the per-pill tooltips. Tooltip clarifies these are real-world physical constraints (load magnitude, tolerance tightness, build-volume freedom), not solver complexity. (App.tsx:699, step 354)
- `SpecCard` grid — ● ● ● — chips render, and the dim sub-label on each row now reads as `--spec r01_001_easy` (amber-prefixed flag + tooltip "Spec ID — the handle passed to the CLI: forge eval … --spec <id> --docker"), so a first-timer sees the ID's role on first scan. (App.tsx:761)
- Round-level SOTA chart — ○ ○ ○

### Spec detail (`/problems/:roundId/:specId`)

- Spec header + plain-English summary — ● ● ● — sentence above diagram ties material+load+arm+MPa together; chips on H1 row carry tooltips. (step 344, `735dbec`)
- Spec spec-card (material / load / wall / overhang / score) — ◐ ◐ ○ — units (N vs kg) repeated; "SF 1.5×" cryptic.
- `SpecDiagram` (front view + side view miniature) — ○ ○ ○ — too small; load arrow direction not labeled.
- 4 KPI tiles (best mass / vs reference / stress margin / passing entries) — ● ● ● — clean.
- "Maintainer reference still leads" banner — ● ● ● — banner now front-loads the category direction sentence ("Lower mass wins this category" / "Higher stiffness wins this category" / "Lower deflection wins this category") before the gap %, and uses metric-specific gap verbs ("is 5.2% heavier than the reference at 263.20 g" / "still falls X% short of the reference at Y N/(mm·g)" / "deflects X% more than the reference at Y mm"). Bar-to-beat is inline with the percentage so a first-timer reads direction → gap → concrete target in one pass. (`HeroStats.tsx` L281–319, step 352)
- **"Top competitor — open-source code"** panel — ● ● ● — `SotaCodeViewer` now renders `agent.py` inline (collapsed 28/full toggle, syntax highlight, Copy, GitHub-↗ fallback). Shipped step 343.
- `StepViewer` (3D viewer) — ● ● ● — drag/zoom hint visible, lazy-loaded.
- `SotaChart` (best score over time) — ○ ○ ○
- "Passing submissions" + "All submissions" tables — ○ ○ ○

### Rankings (`/rankings`)

- Page intro copy — ● ● ● — `0.0 = best, 1.0 = worst` defined inline.
- "How scores work" callout — ● ● ● — worked example included.
- Tab strip (Overall / Mass / Stiffness / Deflection) — ● ● ●
- "Competition just launched" notice — ● ● ●
- Agent row card — ● ● ◐ — per-category `↗ code` chip works; could expose stronger fork CTA on hover.
- "42 problems still unclaimed — grab one" CTA — ● ● ● — closes the loop.

### Agent profile (`/rankings/:agentId`)

- Header (contributor name, summary stats) — ○ ○ ○
- Per-problem breakdown table — ○ ○ ○
- Fork CTAs — ○ ○ ○

### Explorer (`/explorer`)

- Page intro — ● ◐ ◐ — defines "problem" but mixes with "spec" elsewhere on the site.
- `Browse Problems` panel — ● ● ◐ — material/tier filters work; row labels (`PETG · 15 kg load · 78mm arm`) need literacy.
- `Eval Command` panel — ● ● ● — copy-pasteable, well annotated.
- `Sample Eval Output` panel — ● ● ●
- Diagram (front view + side view) — ○ ○ ○ — small, easy to miss.
- "Current #1 — fork to beat" panel — ● ● ● — now carries a lazy `▶ Preview winning agent code` `<details>` that renders `SotaCodeViewer` inline on click. Closed by default to avoid GH fetches for every spec view. Step 345 (`Playground.tsx`).
- `Quick Start` block — ○ ○ ○

### Guide (`/guide`)

- TOC / sticky nav — ○ ○ ○
- "The three categories" section — ○ ○ ○
- "Step 1 — Set up" → "Step 5 — Submit" — ○ ○ ○
- "Whitelisted models" — ○ ○ ○
- "Agent architecture patterns" — ○ ○ ○
- "API reference" — ○ ○ ○
- "How rewards work" — ○ ○ ○
- "Anti-gaming guarantees" — ○ ○ ○

### Cross-cutting

- **Terminology audit**: pick one word — `spec` vs `problem`, `round` vs `category`, `agent` vs `submission` — and enforce it everywhere.
- **Data consistency**: every score, every count, sourced from the same shared `data` hook so no two pages disagree.
- **Deep-link refresh-proofing**: every meaningful UI state expressed in URL (active tab, selected spec, filter chips).
- **Empty / loading / error states**: every async surface needs all three; currently mostly handled but not audited.
- **Mobile breakpoint pass**: not reviewed yet.

---

## Process

- Every loop: pick the top NEXT UP item, do a real teardown, ship a small PR, screenshot before+after, update this file.
- Mark a component's pillar `●` ONLY after the live page has been opened and the relevant seat would not stumble.
- If a component looks fine but hasn't been reviewed, status stays `○` — never `●` by default.
- When a section flips to all `● ● ●`, move it under "Done — locked".

## Done — locked

(empty — nothing has passed the full rubric yet)
