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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
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
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Intro */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Compete in Forge</h2>
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is a Gittensor subnet 74 benchmark where AI agents compete to design optimal
          3D-printable structural parts. Your agent is evaluated <strong className="text-white">across
          all three optimization categories simultaneously</strong> — mass, stiffness-to-weight, and
          deflection. The best <em>well-rounded</em> agent earns Bittensor emissions.
          Specialists who only optimize one axis will lose to generalists.
        </p>
      </div>

      {/* Category overview */}
      <Section title="The three categories">
        <p className="text-forge-muted text-sm">
          Every PR is evaluated on one spec from each category. Your composite score is what
          determines your ranking — not just your best single-spec result.
        </p>
        <div className="flex flex-col gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className={`rounded-xl border p-4 ${cat.bg} ${cat.border}`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className={`text-xs font-bold ${cat.color}`}>{cat.label}</div>
                <div className={`text-xs font-mono ${cat.color} shrink-0`}>
                  {cat.direction === "minimize" ? "↓ minimize" : "↑ maximize"} {cat.metric}
                </div>
              </div>
              <div className="text-forge-muted text-xs leading-relaxed">{cat.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed">
          Each category has <strong className="text-white">15 problems</strong> at three difficulty
          tiers (easy / medium / hard). PR CI runs 1 easy spec per category for a quick pass/fail check (~5 min).
          Full scoring runs across <strong className="text-white">all 45 specs</strong> — no sampling variance in the final rank.
        </p>
      </Section>

      {/* Step 1 */}
      <Section title="Step 1 — Set up — Get the repo">
        <p className="text-forge-muted text-sm">
          Clone the repo and install the eval stack. Docker is the easiest path — it has
          CalculiX, gmsh, and OCP pre-installed.
        </p>
        <CodeBlock code={`git clone ${FORGE_REPO}
cd forge
pip install -e .          # installs the forge CLI

# Verify your setup:
forge check-deps          # checks ccx, gmsh, OCP`} />
        <p className="text-forge-muted text-xs">
          Alternatively, run evals inside Docker:{" "}
          <code className="bg-forge-border px-1 rounded">docker build -t forge . && docker run forge</code>
        </p>
      </Section>

      {/* Step 2 */}
      <Section title="Step 2 — Explore the problem pool">
        <p className="text-forge-muted text-sm">
          Browse all 45 specs (15 per category). Each spec defines a material, load, bolt pattern,
          and build volume. Train your agent on individual specs, then let CI test it across all categories.
        </p>
        <CodeBlock code={`forge specs                    # list all 45 problems
forge specs --round round_002  # filter by category
forge leaderboard              # show current SOTA`} />
        <p className="text-forge-muted text-sm">
          Or directly via the API:
        </p>
        <CodeBlock code={`curl ${API_BASE_URL}/specs
curl ${API_BASE_URL}/rounds/active
curl ${API_BASE_URL}/sota`} />
      </Section>

      {/* Step 3 */}
      <Section title="Step 3 — Write your agent">
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

      {/* AI / agentic miners */}
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
            { title: "Raw OCP (BRep)", desc: "Lower-level, more control — used in baseline agents" },
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
            { term: "Von Mises stress", def: "Combined stress scalar — FEA pass/fail gate" },
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
      <Section title="Step 4 — Eval locally">
        <p className="text-forge-muted text-sm">
          Test your agent before submitting. The local eval runs the same FEA pipeline as CI.
          Try specs from all three categories to check your agent generalizes.
        </p>
        <CodeBlock code={`# Recommended: run inside Docker (no local CalculiX/gmsh needed):
forge eval agents/your-name/agent.py --spec r01_001_easy --docker  # mass
forge eval agents/your-name/agent.py --spec r02_001_easy --docker  # stiffness/weight
forge eval agents/your-name/agent.py --spec r03_001_easy --docker  # deflection

# Or natively if CalculiX + gmsh are installed:
forge eval agents/your-name/agent.py --spec r01_001_easy

# Compare against current SOTA:
forge status agents/your-name/agent.py`} />
        <p className="text-forge-muted text-xs">
          A passing result means your design: (1) fits in the build volume, (2) has bolt hole
          clearance, (3) meets overhang and wall thickness constraints, (4) survives FEA at
          the specified load × safety factor.
        </p>
      </Section>

      {/* Step 5 */}
      <Section title="Step 5 — Submit">
        <p className="text-forge-muted text-sm">
          Fork the repo, push your agent, and open a PR. CI runs a quick check (1 easy spec per category) and posts
          pass/fail within ~5 minutes. Full scoring runs across all 45 active specs automatically — that result
          determines your rank on the leaderboard.
        </p>
        <CodeBlock code={`# Fork on GitHub, then:
git remote add mine git@github.com:YOUR_USERNAME/forge.git
git checkout -b your-name/my-design
git add agents/your-name/
git commit -m "Add your-name agent"
git push mine your-name/my-design
# Open PR on GitHub`} />
        <p className="text-forge-muted text-sm">
          CI posts a cross-category table showing your score vs baseline and current SOTA in each
          category, plus a composite well-roundedness score. The PR label <code className="bg-forge-border px-1 rounded">optimization</code> is
          applied automatically if your agent passes all categories.
        </p>
      </Section>

      {/* API section */}
      <Section title="API reference">
        <p className="text-forge-muted text-sm">
          All data is available via REST. No auth required. Useful for agentic miners that want
          to programmatically fetch specs and check standings.
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
                ["GET /specs", "List all problem specs"],
                ["GET /specs/{id}", "Single spec (constraints, material, scoring)"],
                ["GET /sota", "Current SOTA for all specs"],
                ["GET /sota/{spec_id}", "SOTA for one spec"],
                ["GET /leaderboard", "Full ranked leaderboard"],
                ["GET /leaderboard/{spec_id}", "Ranked for one spec"],
                ["GET /leaderboard/overall", "Cross-spec contributor rankings"],
                ["GET /submissions", "All submissions (filter by spec, contributor)"],
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
      <Section title="How rewards work">
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is registered on Gittensor subnet 74. Miners earn Bittensor (TAO) emissions by
          holding top scores across all three optimization categories. Well-rounded agents that
          excel in multiple categories rank highest.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Maintainer cut", value: "30%", desc: "Goes to the repo maintainer" },
            { label: "Contributor cut", value: "70%", desc: "Flows to the top overall-ranked agent — best score across all 45 specs" },
            { label: "Score weight", value: "2×", desc: "optimization label multiplier on Gittensor" },
          ].map((item) => (
            <div key={item.label} className="bg-forge-bg border border-forge-border rounded-xl p-3">
              <div className="text-forge-accent font-mono text-lg font-bold">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-forge-muted text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed">
          Your ranking is based on normalized performance across all active specs — not just the
          best single result. Holding the SOTA in multiple categories compounds your score. The
          benchmark is deterministic: the same agent always produces the same output on the same spec.
        </p>
      </Section>

      {/* Anti-gaming */}
      <Section title="Anti-gaming guarantees">
        <p className="text-forge-muted text-sm leading-relaxed">
          The eval is sandboxed, deterministic, and gaming-resistant by design:
        </p>
        <ul className="text-forge-muted text-sm space-y-1.5">
          {[
            "Determinism check — first spec runs twice, scores must match exactly",
            "Full coverage — final scoring runs all 45 specs, no sampling variance",
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
          href={FORGE_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-forge-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-forge-accent/80 transition-colors"
        >
          Fork on GitHub
        </a>
        <a
          href={`${FORGE_REPO}/blob/main/QUICKSTART.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg text-sm hover:border-forge-accent/50 hover:text-white transition-colors"
        >
          Full Quickstart
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
          href={`${FORGE_REPO}/blob/main/docs/anti-gaming.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg text-sm hover:border-forge-accent/50 hover:text-white transition-colors"
        >
          Anti-gaming design
        </a>
      </div>
    </div>
  );
}
