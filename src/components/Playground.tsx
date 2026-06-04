import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Spec, API_BASE_URL, metricConfig, specBaseline, specLabel, MATERIAL_META } from "../lib/api";
import { SpecDiagram } from "./SpecDiagram";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

/** Build a sample eval output block tailored to the selected spec's scoring metric. */
function buildSampleOutput(spec: Spec | null): string {
  if (!spec) {
    return `forge eval agents/my-agent/agent.py --spec r01_001_easy --docker

[forge] Loading spec r01_001_easy...
[forge] Running agent...
[forge] PASSED
  score: 14.23 g  (mass)  ← lower is better`;
  }

  const { unit, decimals, label: metricLabel } = metricConfig(spec.scoring.metric);
  const dir = spec.scoring.direction;
  const baseline = specBaseline(spec.scoring);
  const exampleScore = baseline != null
    ? (dir === "minimize" ? baseline * 0.9 : baseline * 1.1)
    : 14.23;
  const pct = baseline != null ? (dir === "minimize" ? "89.5" : "110.2") : "79.1";
  const dirLabel = dir === "minimize" ? "← lower is better" : "← higher is better";

  return `forge eval agents/my-agent/agent.py --spec ${spec.id} --docker

[forge] Loading spec ${spec.id}...
[forge] Running agent: agents/my-agent/agent.py
[forge] Agent returned 48312 bytes (STEP)
[forge] Running FEA pipeline...
  mesh:       12,847 elements
  load nodes: 3
  stress max: 38.2 MPa  (SF: ${spec.constraints.safety_factor}×, within limit)  ✓
  deflection: 0.0412 mm
[forge] PASSED
  score:      ${exampleScore.toFixed(decimals)} ${unit}  (${metricLabel.toLowerCase()})
  baseline:   ${baseline != null ? baseline.toFixed(decimals) : "—"} ${unit}
  vs baseline: ${pct}%  ${dirLabel}
[forge] Result written to .forge/results/${spec.id}.json`;
}

/** Material tooltip showing density and key property. */
function MaterialBadge({ material }: { material: string }) {
  const meta = MATERIAL_META[material];
  const label = meta?.label ?? material.toUpperCase().replace("_", " ");
  const tip = meta ? `${meta.label} — ${meta.density} — ${meta.note}` : material;
  return (
    <span
      className="text-forge-muted cursor-help border-b border-dotted border-forge-muted/50"
      title={tip}
    >
      {label}
    </span>
  );
}

interface Props {
  specs: Spec[];
  loading?: boolean;
}

export function Playground({ specs, loading }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSpecId, setSelectedSpecId] = useState<string>(searchParams.get("spec") ?? "");
  const [search, setSearch] = useState("");

  // Update URL when spec is selected so it's bookmarkable / shareable
  const selectSpec = useCallback((id: string) => {
    setSelectedSpecId(id);
    setSearchParams((prev) => { prev.set("spec", id); return prev; }, { replace: true });
  }, [setSearchParams]);

  // Sync with URL param changes (deep-link from spec detail page)
  useEffect(() => {
    const paramSpec = searchParams.get("spec");
    if (paramSpec && specs.some((s) => s.id === paramSpec)) {
      setSelectedSpecId(paramSpec);
    }
  }, [searchParams, specs]);

  // Default to first spec once specs load (if no URL param was given)
  useEffect(() => {
    if (!selectedSpecId && specs.length > 0 && !searchParams.get("spec")) {
      setSelectedSpecId(specs[0].id);
    }
  }, [specs, selectedSpecId, searchParams]);

  // Map round_id prefix → category label for filter
  const ROUND_LABELS: Record<string, string> = {
    r01: "mass", r02: "stiffness", r03: "deflection",
  };

  const filteredSpecs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return specs;
    return specs.filter((s) => {
      const prefix = s.id.slice(0, 3);
      const category = ROUND_LABELS[prefix] ?? "";
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.material.toLowerCase().includes(q) ||
        category.includes(q) ||
        (s.tier ?? "").includes(q)
      );
    });
  }, [specs, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSpec = specs.find((s) => s.id === selectedSpecId) ?? null;

  const evalCommand = selectedSpecId
    ? `forge eval agents/my-agent/agent.py --spec ${selectedSpecId} --docker`
    : "forge eval agents/my-agent/agent.py --spec <spec_id> --docker";

  const sampleOutput = buildSampleOutput(selectedSpec);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Explorer</h1>
        <p className="text-xs text-forge-muted mt-1 leading-relaxed max-w-2xl">
          Browse every competition problem. A <span className="text-white font-semibold">problem</span> defines
          a cantilever bracket challenge: material, load applied downward at the arm tip, bolt pattern,
          and build volume. Your agent generates a STEP file — the eval harness runs FEA and scores it.
          Select a problem to see its constraints and generate a ready-to-run eval command.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: problem browser */}
        <div className="flex flex-col gap-4">
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Browse Problems</div>

            {/* Search */}
            <input
              type="text"
              placeholder="Filter by ID, material, category (mass, stiffness, deflection), or tier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-white placeholder-forge-muted focus:outline-none focus:border-forge-accent/50 mb-3"
            />

            {/* Spec list as clickable rows */}
            {loading && specs.length === 0 ? (
              <div className="text-forge-muted text-xs py-3 text-center">Loading problems…</div>
            ) : filteredSpecs.length === 0 ? (
              <div className="text-forge-muted text-xs py-3 text-center">No matches for "{search}"</div>
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {filteredSpecs.map((s) => {
                  const isSelected = s.id === selectedSpecId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSpec(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? "bg-forge-accent/15 border border-forge-accent/40 text-white"
                          : "hover:bg-forge-bg text-forge-muted hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="font-medium block truncate">{specLabel(s)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spec detail panel */}
          {selectedSpec ? (
            <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
              {/* Diagram — prominent, top of panel */}
              <div className="mb-4">
                <SpecDiagram spec={selectedSpec} />
              </div>

              {/* Constraints explained in plain language */}
              <div className="text-xs font-semibold text-forge-muted uppercase tracking-wide mb-2">Constraints</div>
              <div className="bg-forge-bg rounded-lg p-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-forge-muted">Material</span>
                  <MaterialBadge material={selectedSpec.material} />
                </div>
                <div className="flex justify-between" title="Force applied downward at the arm tip (load point). 1 kg ≈ 9.81 N.">
                  <span className="text-forge-muted cursor-help">Load (arm tip, downward)</span>
                  <span className="text-white">
                    {selectedSpec.constraints.load_newtons} N
                    <span className="text-forge-muted ml-1">
                      (≈{(selectedSpec.constraints.load_newtons / 9.81).toFixed(0)} kg)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between" title="Horizontal distance from the wall face to where the load is applied.">
                  <span className="text-forge-muted cursor-help">Arm length (wall → load)</span>
                  <span className="text-white">
                    {selectedSpec.constraints.load_point_mm[0].toFixed(0)} mm
                  </span>
                </div>
                <div className="flex justify-between" title="Yield stress divided by this factor = maximum allowable stress. Higher SF = stricter.">
                  <span className="text-forge-muted cursor-help">Safety factor</span>
                  <span className="text-white">{selectedSpec.constraints.safety_factor}×</span>
                </div>
                <div className="flex justify-between" title="Maximum bounding box your STEP geometry must fit inside.">
                  <span className="text-forge-muted cursor-help">Build volume (X × Y × Z)</span>
                  <span className="text-white">
                    {selectedSpec.constraints.build_volume_mm.map((v) => v.toFixed(0)).join(" × ")} mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forge-muted">Bolt holes</span>
                  <span className="text-white">
                    {selectedSpec.constraints.bolt_pattern_mm.length} × M
                    {(selectedSpec.constraints.bolt_diameter_clearance_mm - 0.5).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forge-muted">Optimize for</span>
                  <span className="text-white">
                    {selectedSpec.scoring.direction === "minimize" ? "↓" : "↑"}{" "}
                    {metricConfig(selectedSpec.scoring.metric).label}
                  </span>
                </div>
                {specBaseline(selectedSpec.scoring) != null && (() => {
                  const bl = specBaseline(selectedSpec.scoring)!;
                  const { label, unit, decimals } = metricConfig(selectedSpec.scoring.metric);
                  return (
                    <div className="flex justify-between">
                      <span className="text-forge-muted cursor-help" title="Score from the maintainer's baseline agent, set offline when this problem was designed. Your goal is to beat the current SOTA, not this seed — but it shows the expected difficulty level.">Baseline agent {label.toLowerCase()}</span>
                      <span className="text-white">{bl.toFixed(decimals)} {unit}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: eval command + sample output */}
        <div className="flex flex-col gap-4">
          {/* Eval command */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Eval Command</div>
            <div className="text-xs text-forge-muted mb-3 leading-relaxed">
              Run locally after cloning the forge repo. Identical to CI — deterministic and reproducible.
            </div>
            <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs">
              <span className="text-forge-muted">$ </span>
              <span className="text-forge-green">{evalCommand}</span>
            </div>
            {selectedSpec && (
              <div className="mt-2 text-xs text-forge-muted">
                Problem: <span className="text-white">{specLabel(selectedSpec)}</span>
                {" · "}
                <span className="text-forge-accent">
                  {selectedSpec.scoring.direction === "minimize" ? "↓" : "↑"}{" "}
                  {metricConfig(selectedSpec.scoring.metric).label}
                </span>
              </div>
            )}
          </div>

          {/* Sample output — dynamic based on selected spec */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Sample Eval Output</div>
            <div className="text-xs text-forge-muted mb-3 leading-relaxed">
              {selectedSpec
                ? `What a passing run looks like for ${specLabel(selectedSpec)}:`
                : "What a passing run looks like (select a problem above for a tailored example):"}
            </div>
            <pre className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green overflow-x-auto whitespace-pre leading-relaxed">
              {sampleOutput}
            </pre>
          </div>

          {/* Quick-start */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Quick Start</div>
            <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs space-y-1">
              <div><span className="text-forge-muted"># 1. clone the repo</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">git clone {FORGE_REPO} && cd forge && pip install -e .</span></div>
              <div className="mt-2"><span className="text-forge-muted"># 2. scaffold your agent</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">forge new my-agent</span></div>
              <div className="mt-2"><span className="text-forge-muted"># 3. run eval (Docker builds the sandbox)</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">{evalCommand}</span></div>
              <div className="mt-2"><span className="text-forge-muted"># 4. see open problems via API</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">{"curl '" + API_BASE_URL + "/specs?active=true&unclaimed=true'"}</span></div>
            </div>
            <div className="mt-3 text-xs text-forge-muted">
              Full guide:{" "}
              <a href="/guide" className="text-forge-accent hover:underline">Forge Guide →</a>
              {" · "}
              Results are written to <code className="text-forge-accent">.forge/results/</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
