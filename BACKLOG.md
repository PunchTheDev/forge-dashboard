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
2. **Spec detail header literacy** — "PETG · 15 kg load · 78mm arm" assumes you know what PETG is, what direction the load applies, what the arm length means. Header chips need plain-language tooltips and an inline diagram tying material/load/arm to the actual geometry.
3. **Side / front-view diagram** — currently small and weak, only shown after spec selection. Promote it; explain the bolt pattern, the load arrow, the wall-mount plane.
4. **Spec vs problem vs round** — pick one word per concept across all pages. Audit copy; remove the synonym drift.
5. **Rankings → agent profile → per-problem code-fork loop** — closing the loop: from rankings, a miner should reach the best agent's code in ≤2 clicks.
6. **Extend inline code viewer to the Spotlight panel + Explorer "Current #1" panel** — they still link-out; the new `SotaCodeViewer` component is reusable. (Spotlight ref in App.tsx ~L557; Explorer ref ~L773/L861.)

---

## Pages

### Home / Problems landing (`/problems`)

- `LandingBanner` (hero with title, sub, CTA stack) — ◐ ◐ ◐ — investor-seat scan passes; first-timer "what's a Forge problem?" still soft.
- 4-step "Choose / Write / Open PR / Earn TAO" cards — ● ● ● — clean copy, sequential, no rework needed.
- `Spotlight` (SOTA hero with 3D viewer + spec sidecar) — ◐ ● ◐ — 3D loads cleanly; sidecar tags "PETG · 15 kg load · 78mm arm" are unexplained for first-timer.
- Category grid (`CategoryCard`) — ● ● ● — three cards (Mass / Stiffness / Deflection) each with problem count + claim status.
- `OverallLeaderboard` preview — ○ ○ ○ — review for repetition with `/rankings`.
- Footer — ○ ○ ○ — not reviewed.

### Category page (`/problems/:roundId`)

- Round header (title, scoring metric, problem count) — ○ ○ ○
- Tier groups (easy / medium / hard) — ○ ○ ○
- `SpecCard` grid — ◐ ◐ ◐ — chips render, but a first-timer doesn't know what `r01_001_easy` means.
- Round-level SOTA chart — ○ ○ ○

### Spec detail (`/problems/:roundId/:specId`)

- Spec header — ◐ ◐ ◐ — `PETG · 15 kg load · 78mm arm` is a recipe, not a sentence. Needs literacy pass.
- Spec spec-card (material / load / wall / overhang / score) — ◐ ◐ ○ — units (N vs kg) repeated; "SF 1.5×" cryptic.
- `SpecDiagram` (front view + side view miniature) — ○ ○ ○ — too small; load arrow direction not labeled.
- 4 KPI tiles (best mass / vs reference / stress margin / passing entries) — ● ● ● — clean.
- "Maintainer reference still leads" banner — ● ● ◐ — banner clear; "by 5.2% heavier than the reference" phrasing slightly inverted for first-timer.
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
- "Current #1 — fork to beat" panel — ● ● ◐ — shows winner + fork-code chip; could inline a code snippet.
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
