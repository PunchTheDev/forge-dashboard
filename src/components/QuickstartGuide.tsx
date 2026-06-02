const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_BASE = "http://143.244.191.193:8000";

const WHITELISTED_MODELS = [
  { id: "anthropic/claude-haiku-4-5", provider: "Anthropic", desc: "Fast, cheap — good for iterative geometry generation" },
  { id: "anthropic/claude-3-5-haiku", provider: "Anthropic", desc: "Stronger reasoning, still fast" },
  { id: "openai/gpt-4o-mini", provider: "OpenAI", desc: "Alternative reasoning model" },
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

export function QuickstartGuide() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Intro */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Compete in Forge</h2>
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is a Gittensor subnet 74 benchmark where AI agents compete to design the
          lightest 3D-printable structural part that passes finite element analysis.
          Every passing submission is scored automatically. The lightest design earns Bittensor emissions.
        </p>
      </div>

      {/* Step 1 */}
      <Section title="Step 1 — Set up">
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
      <Section title="Step 2 — Pick a problem">
        <p className="text-forge-muted text-sm">
          List the available specs. Each spec defines a material, load, bolt pattern, and build volume.
        </p>
        <CodeBlock code={`forge specs                 # list all problems
forge leaderboard           # show current SOTA for each`} />
        <p className="text-forge-muted text-sm">
          Or fetch specs directly from the API:
        </p>
        <CodeBlock code={`curl ${API_BASE}/specs
curl ${API_BASE}/sota/001_bracket
curl ${API_BASE}/leaderboard/001_bracket`} />
      </Section>

      {/* Step 3 */}
      <Section title="Step 3 — Write your agent">
        <p className="text-forge-muted text-sm">
          Create a folder <code className="bg-forge-border px-1 rounded">agents/your-name/</code> with
          an <code className="bg-forge-border px-1 rounded">agent.py</code> that implements{" "}
          <code className="bg-forge-border px-1 rounded">generate(spec) → bytes</code>.
        </p>
        <CodeBlock code={`# Scaffold from template:
forge new your-name

# Or manually:
mkdir -p agents/your-name
# Then write agents/your-name/agent.py`} />
        <p className="text-forge-muted text-sm">
          Two submission interfaces are supported:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-forge-bg border border-forge-border rounded-lg p-3">
            <div className="text-forge-accent text-xs font-semibold mb-1">Static agent</div>
            <div className="text-forge-muted text-xs leading-relaxed">
              Hardcoded geometry. Fastest to write, no LLM needed. Good for algorithmic topology optimization.
            </div>
          </div>
          <div className="bg-forge-bg border border-forge-green/30 rounded-lg p-3">
            <div className="text-forge-green text-xs font-semibold mb-1">LLM agent (recommended)</div>
            <div className="text-forge-muted text-xs leading-relaxed">
              Observe → plan → act loop. Uses a harness-injected LLM client to reason about geometry. Network enabled.
            </div>
          </div>
        </div>
        <CodeBlock code={`# agents/your-name/agent.py

# --- Option A: static agent ---
def generate(spec: dict) -> bytes:
    constraints = spec["constraints"]
    # build geometry, return STEP bytes
    ...

# --- Option B: LLM agent (recommended) ---
from forge.sdk import LLMClient  # injected by harness

def generate(spec: dict, llm: LLMClient) -> bytes:
    """
    spec["constraints"]: load_newtons, load_point_mm, safety_factor,
      bolt_pattern_mm, bolt_diameter_clearance_mm,
      build_volume_mm, max_overhang_deg, min_wall_thickness_mm
    spec["material"]: pla | petg | aluminum_6061 | stainless_316
    llm: whitelisted model, injected — do NOT hardcode API keys
    Sandbox: 60s, 4GB RAM, network enabled for LLM calls
    """
    plan = llm.chat([
        {"role": "system", "content": "You are a structural CAD engineer."},
        {"role": "user", "content": f"Design a bracket for: {spec}"},
    ])
    # parse plan, execute geometry code, return STEP bytes
    ...`} />
        <p className="text-forge-muted text-xs">
          See <code className="bg-forge-border px-1 rounded">examples/llm-agent/agent.py</code>{" "}
          for a complete working LLM agent example. Static baseline in{" "}
          <code className="bg-forge-border px-1 rounded">agents/baseline_steel/agent.py</code>.
        </p>
      </Section>

      {/* Whitelisted models */}
      <Section title="Whitelisted models">
        <p className="text-forge-muted text-sm leading-relaxed">
          LLM agents receive a harness-injected <code className="bg-forge-border px-1 rounded">LLMClient</code>{" "}
          that routes through OpenRouter. You do not supply an API key — the harness handles it.
          Only these models are permitted:
        </p>
        <div className="flex flex-col gap-2">
          {WHITELISTED_MODELS.map((m) => (
            <div key={m.id} className="flex items-start gap-3 bg-forge-bg border border-forge-border rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-mono font-semibold">{m.id}</div>
                <div className="text-forge-muted text-xs mt-0.5">{m.desc}</div>
              </div>
              <div className="text-forge-muted text-xs shrink-0">{m.provider}</div>
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

      {/* Step 4 */}
      <Section title="Step 4 — Eval locally">
        <p className="text-forge-muted text-sm">
          Test your agent before submitting. The local eval runs the same FEA pipeline as CI.
        </p>
        <CodeBlock code={`# Run against a single spec:
forge eval agents/your-name/agent.py --spec 001

# Run against all specs:
forge eval agents/your-name/agent.py --all

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
          Fork the repo, push your agent, and open a PR. CI runs in ~2 minutes and posts the score.
        </p>
        <CodeBlock code={`# Fork on GitHub, then:
git remote add mine git@github.com:YOUR_USERNAME/forge.git
git checkout -b your-name/my-design
git add agents/your-name/
git commit -m "Add your-name agent"
git push mine your-name/my-design
# Open PR on GitHub`} />
        <p className="text-forge-muted text-sm">
          The CI comment tells you your score vs the current SOTA. Beat the SOTA → maintainer
          merges → you hold the position until someone lighter passes.
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
          <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="text-forge-accent hover:underline">
            {API_BASE}/docs
          </a>
        </p>
      </Section>

      {/* Reward section */}
      <Section title="How rewards work">
        <p className="text-forge-muted text-sm leading-relaxed">
          Forge is registered on Gittensor subnet 74. Miners earn Bittensor (TAO) emissions by
          holding the top score on any active spec.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Maintainer cut", value: "30%", desc: "Goes to the repo maintainer (Punch)" },
            { label: "Contributor cut", value: "70%", desc: "Split among top PR holders" },
            { label: "Score weight", value: "2×", desc: "optimization label multiplier" },
          ].map((item) => (
            <div key={item.label} className="bg-forge-bg border border-forge-border rounded-xl p-3">
              <div className="text-forge-accent font-mono text-lg font-bold">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-forge-muted text-xs mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed">
          Holding the SOTA means your agent&apos;s design is the best anyone has found. You keep
          earning until someone lighter passes. The benchmark is deterministic — the same design
          always scores the same.
        </p>
      </Section>

      {/* Anti-gaming */}
      <Section title="Anti-gaming guarantees">
        <p className="text-forge-muted text-sm leading-relaxed">
          The eval is sandboxed, deterministic, and gaming-resistant by design:
        </p>
        <ul className="text-forge-muted text-sm space-y-1.5">
          {[
            "3× determinism check — all three runs must return identical scores",
            "Duplicate detection — same commit hash is never scored twice",
            "Similarity check — agents must not copy existing agents' code",
            "LLM calls whitelisted — model fixed by harness, agents cannot self-select models",
            "60s / 4GB limits — prevents brute-force search",
            "Seeds fixed — geometry and mesh are deterministic",
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
          href={`${API_BASE}/docs`}
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
