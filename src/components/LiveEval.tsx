import { useState } from "react";
import { api, EvalPreviewResult, Spec, metricConfig } from "../lib/api";

const EXAMPLE_AGENT = `from build123d import *
from io import BytesIO

def generate(spec: dict, llm=None) -> bytes:
    """Minimal bracket — replace with your optimized design."""
    c = spec["constraints"]
    bv = c["build_volume_mm"]          # [x, y, z] max extents
    bolts = c["bolt_pattern_mm"]       # [[y,z], ...] bolt centers on mount face
    load_pt = c["load_point_mm"]       # [x, y, z] where load is applied
    load_n = c["load_newtons"]

    # Example: solid block fitting the build volume (passes geometry, heavy)
    width  = bv[0] * 0.9
    depth  = bv[1] * 0.9
    height = bv[2] * 0.3

    with BuildPart() as part:
        Box(width, depth, height, align=(Align.CENTER, Align.CENTER, Align.MIN))
        # Bolt clearance holes
        bolt_r = c["bolt_diameter_clearance_mm"] / 2
        with Locations(*[(b[0], b[1], 0) for b in bolts]):
            Hole(bolt_r, height)

    buf = BytesIO()
    part.part.export_step(buf)
    return buf.getvalue()
`;

function ResultCard({ result }: { result: EvalPreviewResult }) {
  const stress = result.fea_stress_mpa;
  const allowable = result.fea_allowable_mpa;
  const utilization = stress != null && allowable != null ? (stress / allowable) * 100 : null;
  const { label: metricLabel, unit: metricUnit, decimals } = metricConfig(result.score_metric);

  return (
    <div
      className={`rounded-xl border p-5 ${
        result.passed
          ? "border-forge-green/40 bg-forge-green/5"
          : "border-forge-red/40 bg-forge-red/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-bold px-3 py-1 rounded-full ${
              result.passed
                ? "bg-forge-green/20 text-forge-green"
                : "bg-forge-red/20 text-forge-red"
            }`}
          >
            {result.passed ? "PASSED" : "FAILED"}
          </span>
          <span className="text-forge-muted text-xs font-mono">
            stage: {result.stage}
          </span>
        </div>
        <span className="text-forge-muted text-xs font-mono">
          {result.elapsed_seconds.toFixed(1)}s
        </span>
      </div>

      {/* Score */}
      {result.score != null && (
        <div className="mb-4">
          <div className="text-xs text-forge-muted uppercase tracking-wide mb-1">{metricLabel}</div>
          <div className="font-mono text-2xl font-bold text-white">
            {result.score_metric === "volume_mm3"
              ? result.score.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : result.score.toFixed(decimals)}
            <span className="text-forge-muted text-sm ml-1">{metricUnit}</span>
          </div>
          <div className="text-xs text-forge-muted mt-0.5">
            {result.score_direction === "minimize" ? "lower is better" : "higher is better"}
          </div>
        </div>
      )}

      {/* FEA stress bar */}
      {utilization != null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-forge-muted mb-1">
            <span>Stress utilization</span>
            <span className="font-mono">
              {stress!.toFixed(1)} / {allowable!.toFixed(1)} MPa ({utilization.toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 bg-forge-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                utilization > 90
                  ? "bg-forge-red"
                  : utilization > 70
                  ? "bg-yellow-400"
                  : "bg-forge-green"
              }`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* FEA details */}
      {(result.fea_element_count != null || result.fea_displacement_mm != null) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {result.fea_element_count != null && (
            <div>
              <div className="text-xs text-forge-muted">Elements</div>
              <div className="font-mono text-sm text-white">{result.fea_element_count.toLocaleString()}</div>
            </div>
          )}
          {result.fea_displacement_mm != null && (
            <div>
              <div className="text-xs text-forge-muted">Max displacement</div>
              <div className="font-mono text-sm text-white">{result.fea_displacement_mm.toFixed(4)} mm</div>
            </div>
          )}
          {result.fea_load_node_count != null && (
            <div>
              <div className="text-xs text-forge-muted">Load nodes</div>
              <div className="font-mono text-sm text-white">{result.fea_load_node_count}</div>
            </div>
          )}
          {result.similarity != null && (
            <div>
              <div className="text-xs text-forge-muted" title="How similar this design is to the current #1 submission — too similar (≥ threshold) and the submission is rejected to prevent copy-wins.">Similarity to #1</div>
              <div className="font-mono text-sm text-white">{(result.similarity * 100).toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}

      {/* Reason / notes */}
      {result.reason && (
        <div className="text-xs text-forge-muted bg-forge-bg rounded-lg px-3 py-2 font-mono leading-relaxed">
          {result.reason}
        </div>
      )}
    </div>
  );
}

interface Props {
  specs: Spec[];
}

export function LiveEval({ specs }: Props) {
  // Default to an easy round spec so playground matches the actual competition
  const roundSpecs = specs.filter((s) => /^r0[123]_\d+_easy$/.test(s.id));
  const defaultSpec = roundSpecs[0] ?? specs.find((s) => s.id.startsWith("pub_")) ?? specs[0];

  const [specId, setSpecId] = useState<string>(defaultSpec?.id ?? "");
  const [code, setCode] = useState<string>(EXAMPLE_AGENT);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvalPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runEval() {
    if (!specId || !code.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await api.evalPreview(code, specId);
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const selectedSpec = specs.find((s) => s.id === specId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white">Playground</h2>
        <p className="text-forge-muted text-sm mt-1">
          Paste agent code, pick a problem, and run a live eval against the sandbox — same
          pipeline as CI.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: editor */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Spec selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-forge-muted shrink-0">Problem</label>
            <select
              value={specId}
              onChange={(e) => setSpecId(e.target.value)}
              className="flex-1 bg-forge-surface border border-forge-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-forge-accent/60 font-mono"
            >
              <optgroup label="Mass Optimization (Round 1)">
                {specs.filter((s) => s.id.startsWith("r01_")).map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </optgroup>
              <optgroup label="Stiffness/Weight (Round 2)">
                {specs.filter((s) => s.id.startsWith("r02_")).map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </optgroup>
              <optgroup label="Deflection (Round 3)">
                {specs.filter((s) => s.id.startsWith("r03_")).map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </optgroup>
              <optgroup label="Legacy">
                {specs.filter((s) => !s.id.startsWith("r0")).map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Spec summary pill */}
          {selectedSpec && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-forge-surface border border-forge-border px-2 py-1 rounded text-forge-muted font-mono">
                {selectedSpec.material}
              </span>
              <span className="bg-forge-surface border border-forge-border px-2 py-1 rounded text-forge-muted font-mono">
                {selectedSpec.constraints.load_newtons}N load
              </span>
              <span className="bg-forge-surface border border-forge-border px-2 py-1 rounded text-forge-muted font-mono">
                metric: {selectedSpec.scoring.metric}
              </span>
              <span className="bg-forge-surface border border-forge-border px-2 py-1 rounded text-forge-muted font-mono">
                {selectedSpec.constraints.build_volume_mm.map((v: number) => Math.round(v)).join("×")}mm
              </span>
            </div>
          )}

          {/* Code editor */}
          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={28}
              className="w-full bg-forge-bg border border-forge-border rounded-xl px-4 py-3 text-forge-green font-mono text-xs leading-relaxed resize-y focus:outline-none focus:border-forge-accent/60 placeholder-forge-muted"
              placeholder="# Paste your agent.py here..."
            />
            <div className="absolute top-2 right-3 text-xs text-forge-muted/50 font-mono pointer-events-none">
              agent.py
            </div>
          </div>

          <button
            onClick={runEval}
            disabled={running || !specId || !code.trim()}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors bg-forge-accent hover:bg-forge-accent/80 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running eval…
              </span>
            ) : (
              "Run eval"
            )}
          </button>

          {running && (
            <div className="text-xs text-forge-muted text-center">
              FEA takes 30–120s depending on mesh complexity — hang tight
            </div>
          )}
        </div>

        {/* Right: results */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-4">
          {result && <ResultCard result={result} />}

          {error && (
            <div className="rounded-xl border border-forge-red/40 bg-forge-red/5 p-4">
              <div className="text-forge-red text-xs font-semibold mb-2">Eval error</div>
              {error.includes("docker") || error.includes("Docker") ? (
                <div className="text-forge-muted text-xs leading-relaxed">
                  The live sandbox requires Docker on the server. Use{" "}
                  <code className="text-forge-accent">forge eval</code> locally or open a PR to run
                  the full CI pipeline. The PR eval always works — this is a server-side sandbox feature.
                </div>
              ) : (
                <div className="text-forge-muted text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {error}
                </div>
              )}
            </div>
          )}

          {!result && !error && !running && (
            <div className="rounded-xl border border-forge-border bg-forge-surface p-5 text-center">
              <div className="text-forge-muted text-xs leading-relaxed">
                Results appear here after the eval runs. The sandbox enforces the same
                constraints as CI: FEA, geometry gates, stress check.
              </div>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-xl border border-forge-border bg-forge-surface p-4 text-xs text-forge-muted leading-relaxed space-y-2">
            <div className="text-white font-semibold text-xs">What runs?</div>
            <div>
              Your code is executed in a Docker sandbox identical to the CI eval container.
              The harness:
            </div>
            <ul className="list-disc list-inside space-y-1 text-forge-muted">
              <li>Calls <code className="text-forge-accent">generate(spec, llm)</code></li>
              <li>Validates the returned STEP bytes</li>
              <li>Meshes + runs CalculiX FEA</li>
              <li>Checks all geometry gates</li>
              <li>Returns score + pass/fail</li>
            </ul>
            <div className="pt-1 text-forge-muted/70">
              LLM calls use whitelisted models via OpenRouter. Your code cannot supply its
              own API key.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
