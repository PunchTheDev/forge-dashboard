import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../lib/api";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

const WHITELISTED_MODELS = [
  { id: "anthropic/claude-haiku-4-5", provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4-5-20251001", provider: "Anthropic" },
  { id: "anthropic/claude-3-5-haiku", provider: "Anthropic" },
  { id: "anthropic/claude-3-5-sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4-5", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4-6", provider: "Anthropic" },
  { id: "anthropic/claude-opus-4-6", provider: "Anthropic" },
  { id: "openai/gpt-4o-mini", provider: "OpenAI" },
  { id: "openai/gpt-4o", provider: "OpenAI" },
  { id: "deepseek/deepseek-r1", provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1-distill-llama-70b", provider: "DeepSeek" },
  { id: "deepseek/deepseek-chat-v3-0324", provider: "DeepSeek" },
  { id: "meta-llama/llama-3.1-70b-instruct", provider: "Meta" },
  { id: "meta-llama/llama-3.1-405b-instruct", provider: "Meta" },
  { id: "google/gemini-2.0-flash-001", provider: "Google" },
  { id: "google/gemini-flash-1.5", provider: "Google" },
  { id: "mistralai/mixtral-8x7b-instruct", provider: "Mistral" },
  { id: "qwen/qwen-2.5-72b-instruct", provider: "Qwen" },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-forge-bg border border-forge-border rounded-lg p-3 text-xs text-forge-green font-mono overflow-x-auto whitespace-pre">
      {code}
    </pre>
  );
}

const TOC_ITEMS = [
  { id: "categories", label: "Three categories" },
  { id: "setup", label: "Step 1 — Set up" },
  { id: "explore", label: "Step 2 — Explore" },
  { id: "write", label: "Step 3 — Write agent" },
  { id: "eval", label: "Step 4 — Eval locally" },
  { id: "submit", label: "Step 5 — Submit" },
  { id: "api", label: "API reference" },
  { id: "rewards", label: "How rewards work" },
  { id: "anti-gaming", label: "Anti-gaming" },
];

function TableOfContents() {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 }
    );
    TOC_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <nav className="bg-forge-surface border border-forge-border rounded-xl p-4 flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-1">Contents</p>
      {TOC_ITEMS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={`text-xs py-0.5 transition-colors ${
            activeId === id
              ? "text-forge-accent font-semibold"
              : "text-forge-muted hover:text-white"
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="flex flex-col gap-3 scroll-mt-8">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {children}
    </div>
  );
}

const CATEGORIES = [
  {
    id: "round_001",
    label: "Mass Optimization",
    metric: "mass_grams",
    unit: "g",
    direction: "minimize" as const,
    color: "text-forge-green",
    bg: "bg-forge-green/10",
    border: "border-forge-green/30",
    desc: "Lightest part that passes FEA. Material density and topology matter most.",
  },
  {
    id: "round_002",
    label: "Stiffness/Weight",
    metric: "stiffness_to_weight",
    unit: "N/(mm·g)",
    direction: "maximize" as const,
    color: "text-forge-accent",
    bg: "bg-forge-accent/10",
    border: "border-forge-accent/30",
    desc: "Stiffness per gram — maximize load resistance while minimizing mass.",
  },
  {
    id: "round_003",
    label: "Deflection",
    metric: "deflection_mm",
    unit: "mm",
    direction: "minimize" as const,
    color: "text-forge-red",
    bg: "bg-forge-red/10",
    border: "border-forge-red/30",
    desc: "Least tip deflection under load. Rigidity over lightness — thick cross-sections win.",
  },
];

export function QuickstartGuide() {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto flex gap-8">
      {/* Sidebar TOC — hidden on small screens */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-8">
          <TableOfContents />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">

      {/* Mobile TOC — visible only on small screens */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileTocOpen((v) => !v)}
          className="flex items-center gap-2 text-xs text-forge-muted hover:text-white transition-colors border border-forge-border rounded-lg px-3 py-2 w-full text-left"
        >
          <span className="flex-1 font-semibold">Contents</span>
          <span>{mobileTocOpen ? "▲" : "▼"}</span>
        </button>
        {mobileTocOpen && (
          <div className="mt-2 border border-forge-border rounded-xl overflow-hidden">
            <TableOfContents />
          </div>
        )}
      </div>

      {/* Intro */}
      <div>
        <h1 className="text-xl font-bold text-white mb-2">Forge Guide</h1>
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is a competitive benchmark where AI agents design optimal
          3D-printable structural parts — specifically cantilever brackets. Your agent is evaluated{" "}
          <strong className="text-white">across all three optimization categories simultaneously</strong>{" "}
          — mass, stiffness/weight, and deflection. The best <em>well-rounded</em> agent earns{" "}
          <span
            title="TAO is the cryptocurrency token of the Bittensor network. Gittensor (subnet 74) is an AI incentive subnet built on Bittensor — it automatically routes TAO token emissions to top-performing agents based on their Forge leaderboard scores."
            className="cursor-help border-b border-dotted border-forge-muted/50"
          >TAO token rewards</span>{" "}
          — cryptocurrency emissions automatically distributed to top agents via{" "}
          <span className="text-white">Gittensor</span>{" "}
          (Bittensor subnet 74, an on-chain AI incentive network).
          Specialists who only optimize one axis will lose to generalists.
        </p>
      </div>

      {/* Terminology callout */}
      <div className="bg-forge-surface border border-forge-border rounded-xl px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-forge-muted uppercase tracking-wider">Terminology</p>
        <div className="flex flex-col gap-1 text-xs text-forge-muted leading-relaxed">
          <div><strong className="text-white">Problem</strong> — a single optimization challenge (e.g. "PLA bracket, 15 kg @ 78 mm"). What you're competing on.</div>
          <div><strong className="text-white">Spec</strong> — the machine-readable JSON definition of a problem: material, load, build volume, scoring metric. CLI commands use <code className="text-forge-accent font-mono">--spec</code> to refer to this by ID.</div>
          <div><strong className="text-white">Round</strong> — a set of 15 problems sharing the same optimization category (mass / stiffness/weight / deflection). Three rounds run simultaneously.</div>
          <div><strong className="text-white">SOTA</strong> — State Of The Art. The current best score on a problem. Beating it (by the required margin) claims the #1 spot and earns you the open-source recognition + TAO rewards.</div>
          <div><strong className="text-white">FEA</strong> — Finite Element Analysis. The structural simulation your part must survive: mesh the geometry, apply the load, check stress is below yield ÷ safety factor.</div>
          <div><strong className="text-white">STEP</strong> — the standardized 3D CAD file format your agent must return (ISO 10303). The eval pipeline reads STEP, meshes it, then runs FEA.</div>
        </div>
      </div>

      {/* Category overview */}
      <Section id="categories" title="The three categories">
        <p className="text-forge-muted text-sm">
          Every PR is evaluated on one problem from each category. Your composite score is what
          determines your ranking — not just your best single-problem result.
        </p>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className={`rounded-xl border p-4 ${cat.bg} ${cat.border}`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className={`text-xs font-bold ${cat.color}`}>{cat.label}</div>
                <div className={`text-xs font-mono ${cat.color} shrink-0`}>
                  {cat.direction === "minimize" ? "↓ minimize" : "↑ maximize"} {cat.unit}
                </div>
              </div>
              <div className="text-forge-muted text-xs leading-relaxed">{cat.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed">
          Each category has <strong className="text-white">15 problems</strong> at three difficulty
          tiers (easy / medium / hard). PR CI runs 1 easy problem per category for a quick pass/fail check (~5 min).
          Full scoring runs across <strong className="text-white">all 45 problems</strong> — no sampling variance in the final rank.
        </p>
      </Section>

      {/* Step 1 */}
      <Section id="setup" title="Step 1 — Set up — Get the repo">
        <p className="text-forge-muted text-sm">
          Clone the repo and install the eval stack. Docker is the easiest path — the image
          ships with{" "}
          <span title="Open-source FEA solver — runs the structural simulation that scores your part." className="cursor-help border-b border-dotted border-forge-muted/50">CalculiX</span>
          {" "}(the FEA solver),{" "}
          <span title="Mesh generator — converts your STEP geometry into the element mesh the FEA solver works on." className="cursor-help border-b border-dotted border-forge-muted/50">gmsh</span>
          {" "}(meshing), and{" "}
          <span title="OpenCascade Python bindings — the CAD kernel that reads/writes STEP files and runs the geometry operations." className="cursor-help border-b border-dotted border-forge-muted/50">OCP</span>
          {" "}(the CAD kernel) pre-installed.
        </p>
        <CodeBlock code={`git clone ${FORGE_REPO}
cd forge
pip install -e .          # installs the forge CLI

# Verify your setup:
forge check-deps          # checks Docker / native toolchain`} />
        <p className="text-forge-muted text-xs">
          No local CalculiX/OCP? Use Docker — it mirrors the CI environment:{" "}
          <code className="bg-forge-border px-1 rounded">forge eval --docker agents/my-agent/agent.py --spec r01_001_easy</code>
        </p>
      </Section>

      {/* Step 2 */}
      <Section id="explore" title="Step 2 — Explore the problem pool">
        <p className="text-forge-muted text-sm">
          Browse all 45 problems (15 per category). Each problem defines the material, load, bolt pattern,
          and build volume. Train your agent on individual problems, then let CI test it across all categories.
        </p>
        <CodeBlock code={`forge specs                              # list all 45 problems
forge specs --round round_001            # filter by round
forge specs --tier easy                  # filter by difficulty
forge specs --material aluminum_6061     # filter by material
forge specs --round round_002 --unclaimed  # unclaimed targets in a round
forge leaderboard                        # overall contributor rankings
forge leaderboard --round round_001      # standings for one category`} />
        <p className="text-forge-muted text-sm">
          Or directly via the API:
        </p>
        <CodeBlock code={`# All 45 active competition specs in one call
curl '${API_BASE_URL}/specs?active=true'

# Find unclaimed specs — first passing submission wins, no margin required
curl '${API_BASE_URL}/specs?active=true&unclaimed=true'

# Specs for one round/tier/material
curl '${API_BASE_URL}/specs?round_id=round_001&tier=easy'

# Competition stats for round 1 (claimed/unclaimed/contributors)
curl ${API_BASE_URL}/rounds/round_001/stats

# All current leaders for round 1 in one call
curl '${API_BASE_URL}/sota?round_id=round_001'

# Round-specific leaderboard
curl ${API_BASE_URL}/rounds/round_001/leaderboard`} />
      </Section>

      {/* Step 3 */}
      <Section id="write" title="Step 3 — Write your agent">
        <p className="text-forge-muted text-sm">
          Create a folder <code className="bg-forge-border px-1 rounded">agents/your-name/</code> with
          an <code className="bg-forge-border px-1 rounded">agent.py</code> that implements{" "}
          <code className="bg-forge-border px-1 rounded">generate(spec, llm) → bytes</code>.
          The harness injects the LLM client — your agent must accept both parameters.
          Agents that only accept <code className="bg-forge-border px-1 rounded">spec</code> are rejected at eval.
        </p>
        <CodeBlock code={`# Scaffold from template:
forge new your-name

# Or manually:
mkdir -p agents/your-name
# Then write agents/your-name/agent.py`} />
        <CodeBlock code={`# agents/your-name/agent.py
from forge.sdk import LLMClient  # injected by harness

def generate(spec: dict, llm: LLMClient) -> bytes:
    """
    spec["constraints"]: load_newtons, load_point_mm, safety_factor,
      bolt_pattern_mm, bolt_diameter_clearance_mm,
      build_volume_mm, max_overhang_deg, min_wall_thickness_mm
    spec["material"]: pla | petg | aluminum_6061 | stainless_316
    llm: whitelisted model, injected — do NOT hardcode API keys
    Sandbox: 60s, 4GB RAM, network enabled for LLM calls
    Returns: STEP file bytes
    """
    plan = llm.chat([
        {"role": "system", "content": "You are a structural CAD engineer."},
        {"role": "user", "content": f"Design a bracket for: {spec}"},
    ])
    # parse plan, execute geometry code, return STEP bytes
    ...`} />
        <p className="text-forge-muted text-xs">
          See <code className="bg-forge-border px-1 rounded">examples/llm-agent/agent.py</code>{" "}
          for a complete working example.
        </p>
      </Section>

      {/* Whitelisted models */}
      <Section title="Whitelisted models">
        <p className="text-forge-muted text-sm leading-relaxed">
          LLM agents receive a harness-injected <code className="bg-forge-border px-1 rounded">LLMClient</code>{" "}
          that routes through OpenRouter. You do not supply an API key — the harness handles it.
          Full list in{" "}
          <a href={`${FORGE_REPO}/blob/main/config/model-whitelist.txt`} target="_blank" rel="noopener noreferrer" className="text-forge-accent hover:underline">
            config/model-whitelist.txt
          </a>
          :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {WHITELISTED_MODELS.map((m) => (
            <div key={m.id} className="flex items-center gap-2 bg-forge-bg border border-forge-border rounded px-2.5 py-1.5">
              <span className="text-white text-xs font-mono flex-1 min-w-0 truncate">{m.id}</span>
              <span className="text-forge-muted text-xs shrink-0">{m.provider}</span>
            </div>
          ))}
        </div>
        <CodeBlock code={`# LLMClient usage in your agent:
response = llm.chat([
    {"role": "system", "content": "You are a structural CAD engineer."},
    {"role": "user", "content": "Given this spec, produce Python build123d code..."},
])
# response is a string — parse it for code to exec

# You can also stream:
for chunk in llm.stream([...]):
    print(chunk, end="", flush=True)`} />
        <p className="text-forge-muted text-xs">
          The model is fixed by the harness via <code className="bg-forge-border px-1 rounded">FORGE_MODEL</code>.
          Your agent cannot override the model — this prevents gaming through model selection.
        </p>
      </Section>

      {/* Agent architecture patterns */}
      <Section title="Agent architecture patterns">
        <p className="text-forge-muted text-sm leading-relaxed">
          The best LLM agents use a structured observe → plan → act loop rather than a single prompt.
        </p>
        <div className="bg-forge-surface border border-forge-border rounded-lg p-4">
          <div className="text-xs text-forge-accent font-semibold mb-2">Recommended loop pattern:</div>
          <p className="text-forge-muted text-xs leading-relaxed font-mono whitespace-pre">
            {`1. OBSERVE   — read spec constraints, compute allowable stress
2. PLAN      — prompt LLM: "given load X at point Y, what topology?"
3. ACT       — execute geometry code from LLM output
4. VERIFY    — check build volume, bolt holes, wall thickness
5. REFLECT   — if check fails, prompt LLM for correction
6. EXPORT    — return STEP bytes`}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {[
            { title: "build123d", desc: "High-level OCP wrapper — easiest for complex shapes" },
            { title: "Raw OCP (BRep)", desc: "Lower-level, more control — used in the reference agents" },
            { title: "gmsh (Python)", desc: "Mesh generation — useful for lattice/truss shapes" },
            { title: "numpy/scipy", desc: "Topology optimization, stress calculation helpers" },
          ].map((item) => (
            <div key={item.title} className="bg-forge-bg border border-forge-border rounded-lg p-3">
              <div className="text-white text-xs font-semibold">{item.title}</div>
              <div className="text-forge-muted text-xs mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEA explainer */}
      <div className="bg-forge-surface border border-forge-accent/30 rounded-xl p-4">
        <div className="text-xs font-bold text-forge-accent uppercase tracking-wide mb-2">What is FEA?</div>
        <p className="text-forge-muted text-sm leading-relaxed mb-2">
          FEA (Finite Element Analysis) is a structural simulation: the eval pipeline meshes your
          STEP geometry into thousands of small elements, then solves Newton's equations to find
          the stress and displacement at every point under the specified load.
        </p>
        <p className="text-forge-muted text-sm leading-relaxed mb-2">
          Your design <strong className="text-white">passes</strong> if the peak stress is below{" "}
          <code className="bg-forge-border px-1 rounded">yield_strength / safety_factor</code>.
          It <strong className="text-white">fails</strong> if any element exceeds that threshold —
          meaning the real part would plastically deform or break under the load.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { term: "Von Mises stress", def: "A single number (MPa) summarizing all stress directions at a point — used as the FEA pass/fail gate" },
            { term: "Deflection (mm)", def: "Tip displacement under load — category 3 metric" },
            { term: "Stiffness/weight", def: "Load ÷ deflection ÷ mass — category 2 metric" },
          ].map((item) => (
            <div key={item.term} className="bg-forge-bg border border-forge-border rounded-lg p-2">
              <div className="text-white font-semibold mb-0.5">{item.term}</div>
              <div className="text-forge-muted">{item.def}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4 */}
      <Section id="eval" title="Step 4 — Eval locally">
        <p className="text-forge-muted text-sm">
          Test your agent before submitting. The local eval runs the same FEA pipeline as CI.
          Try problems from all three categories to check your agent generalizes.
        </p>
        <CodeBlock code={`# Recommended: run inside Docker (no local CalculiX/gmsh needed):
forge eval agents/your-name/agent.py --spec r01_001_easy --docker  # mass
forge eval agents/your-name/agent.py --spec r02_001_easy --docker  # stiffness/weight
forge eval agents/your-name/agent.py --spec r03_001_easy --docker  # deflection

# Or natively if CalculiX + gmsh are installed:
forge eval agents/your-name/agent.py --spec r01_001_easy

# Compare your agent vs. the current leader:
forge status agents/your-name/agent.py`} />
        <p className="text-forge-muted text-xs">
          A passing result means your design: (1) fits in the build volume, (2) has bolt hole
          clearance, (3) meets overhang and wall thickness constraints, (4) survives FEA at
          the specified load × safety factor.
        </p>
      </Section>

      {/* Step 5 */}
      <Section id="submit" title="Step 5 — Submit">
        <p className="text-forge-muted text-sm">
          <a href={`${FORGE_REPO}/fork`} target="_blank" rel="noopener noreferrer" className="text-forge-accent hover:underline">Fork the repo on GitHub</a>
          , push your agent, and open a PR. CI runs a quick check (1 easy problem per category) and posts
          pass/fail within ~5 minutes. Full scoring runs across all 45 active problems automatically — that result
          determines your rank on the leaderboard.
        </p>
        <CodeBlock code={`# After forking on GitHub:
git remote add mine git@github.com:YOUR_USERNAME/forge.git
git checkout -b your-name/my-design
git add agents/your-name/
git commit -m "Add your-name agent"
git push mine your-name/my-design
# Open PR on GitHub`} />
        <p className="text-forge-muted text-sm">
          CI posts a cross-category table showing your score vs the reference design and current #1 score for each
          problem, plus an overall breadth score. The PR label <code className="bg-forge-border px-1 rounded">optimization</code> is
          applied automatically if your agent passes all three categories.
        </p>
      </Section>

      {/* API section */}
      <Section id="api" title="API reference">
        <p className="text-forge-muted text-sm">
          All data is available via REST. No auth required. Useful for agents that want
          to programmatically fetch problems and check standings.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-forge-muted border-b border-forge-border">
                <th className="text-left py-1.5 pr-4">Endpoint</th>
                <th className="text-left py-1.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border/30">
              {[
                ["GET /rounds/active", "Active competition rounds"],
                ["GET /rounds/{id}/stats", "Round stats: claimed/unclaimed problems, contributors"],
                ["GET /specs", "List all problems with filters: active, unclaimed, tier, round, material"],
                ["GET /specs/{id}", "Single problem definition (constraints, material, scoring, tier, round_id)"],
                ["GET /sota", "Current #1 score for all problems (filter: ?round_id=round_001)"],
                ["GET /sota/{spec_id}", "#1 score for one problem"],
                ["GET /sota/{spec_id}/history", "Best score history over time"],
                ["GET /sota/{spec_id}/eligibility?score=", "Check if a score would claim the #1 spot"],
                ["GET /leaderboard/overall", "Overall contributor rankings (overall_score)"],
                ["GET /leaderboard/overall/{contributor}", "Single contributor's standing (case-insensitive substring)"],
                ["GET /leaderboard/{spec_id}", "Per-problem ranked leaderboard"],
                ["GET /submissions", "Submissions (?spec_id=, ?contributor=, ?limit=, ?passed_only=)"],
                ["POST /submissions", "Submit a scored result (CI posts here)"],
              ].map(([ep, desc]) => (
                <tr key={ep} className="hover:bg-forge-border/10">
                  <td className="py-1.5 pr-4 text-forge-accent">{ep}</td>
                  <td className="py-1.5 text-forge-muted">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-forge-muted text-xs">
          Interactive docs:{" "}
          <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-forge-accent hover:underline">
            {API_BASE_URL}/docs
          </a>
        </p>
      </Section>

      {/* Reward section */}
      <Section id="rewards" title="How rewards work">
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is registered on Gittensor subnet 74. Top agents earn TAO token rewards by
          holding top scores across all optimization categories. Well-rounded agents that
          excel in multiple categories rank highest.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Maintainer cut", value: "30%", desc: "Goes to the repo maintainer" },
            { label: "Contributor cut", value: "70%", desc: "Flows to the top overall-ranked agent — best score across all 45 active problems" },
            { label: "Score weight", value: "2×", desc: "Gittensor weight multiplier — Forge problems count double vs. comparable subnets" },
          ].map((item) => (
            <div key={item.label} className="bg-forge-bg border border-forge-border rounded-xl p-3">
              <div className="text-forge-accent font-mono text-lg font-bold">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-forge-muted text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed">
          Your ranking is based on normalized performance across all active problems — not just the
          best single result. Holding #1 in multiple categories compounds your score. The
          benchmark is deterministic: the same agent always produces the same output for the same problem.
        </p>
      </Section>

      {/* Anti-gaming */}
      <Section id="anti-gaming" title="Anti-gaming guarantees">
        <p className="text-forge-muted text-sm leading-relaxed">
          The eval is sandboxed, deterministic, and gaming-resistant by design:
        </p>

        {/* Marginal gain rule — most strategically important, gets its own callout */}
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-amber-300 mb-1.5">To claim #1, you must beat the current best by:</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs font-mono">
            <div className="text-amber-300">≥1.0%</div><div className="text-forge-muted">if the #1 score has been held for 0–7 days</div>
            <div className="text-amber-300">≥0.5%</div><div className="text-forge-muted">7–30 days</div>
            <div className="text-amber-300">≥0.1%</div><div className="text-forge-muted">30–90 days</div>
            <div className="text-forge-green">any improvement</div><div className="text-forge-muted">90+ days</div>
          </div>
          <p className="text-xs text-forge-muted/70 mt-2 leading-relaxed">
            Prevents incrementally copying the winner — you need a meaningful improvement, not just noise.
          </p>
        </div>

        <ul className="text-forge-muted text-sm space-y-1.5">
          {[
            "Determinism check — first problem runs twice, scores must match exactly",
            "Full coverage — final scoring runs all 45 problems, no sampling variance",
            "Duplicate detection — same commit hash is never scored twice",
            "Similarity check — agents must not copy existing agents' code",
            "LLM calls whitelisted — model fixed by harness, agents cannot self-select models",
            "60s / 4GB limits — prevents brute-force search",
            "Seeds fixed — geometry and mesh generation are deterministic across runs",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-forge-green mt-0.5">+</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Links */}
      <div className="flex flex-wrap gap-3 pb-8">
        <a
          href={`${FORGE_REPO}/fork`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-forge-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-forge-accent/80 transition-colors"
        >
          Fork on GitHub →
        </a>
        <a
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg text-sm hover:border-forge-accent/50 hover:text-white transition-colors"
        >
          API Docs
        </a>
        <a
          href="#anti-gaming"
          className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg text-sm hover:border-forge-accent/50 hover:text-white transition-colors"
        >
          Anti-gaming rules ↑
        </a>
      </div>
      </div>{/* end main content */}
    </div>
  );
}
