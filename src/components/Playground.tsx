import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Spec, API_BASE_URL } from "../lib/api";
import { SpecDiagram } from "./SpecDiagram";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

const SAMPLE_OUTPUT = `forge eval agents/my-agent/agent.py --spec r01_001_easy --docker

[forge] Loading spec r01_001_easy...
[forge] Running agent: agents/my-agent/agent.py
[forge] Agent returned 48312 bytes (STEP)
[forge] Running FEA pipeline...
  mesh:       12,847 elements
  load nodes: 3
  stress max: 38.2 MPa  (allowable: 50.0 MPa)  ✓
  deflection: 0.0412 mm
[forge] PASSED
  score:      14.23 g  (mass_grams)
  baseline:   18.0 g
  vs baseline: 79.1%  ← lower is better
[forge] Result written to .forge/results/r01_001_easy.json`;

interface Props {
  specs: Spec[];
  loading?: boolean;
}

export function Playground({ specs, loading }: Props) {
  const [searchParams] = useSearchParams();
  const [selectedSpecId, setSelectedSpecId] = useState<string>(searchParams.get("spec") ?? "");
  const [search, setSearch] = useState("");

  // Sync with URL param changes (e.g. deep-link from spec detail page)
  useEffect(() => {
    const paramSpec = searchParams.get("spec");
    if (paramSpec && specs.some((s) => s.id === paramSpec)) {
      setSelectedSpecId(paramSpec);
    }
  }, [searchParams, specs]);

  const filteredSpecs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return specs;
    return specs.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.material.toLowerCase().includes(q),
    );
  }, [specs, search]);

  const selectedSpec = specs.find((s) => s.id === selectedSpecId) ?? null;

  const evalCommand = selectedSpecId
    ? `forge eval agents/my-agent/agent.py --spec ${selectedSpecId} --docker`
    : "forge eval agents/my-agent/agent.py --spec <spec_id> --docker";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-lg font-bold text-white">Playground</div>
        <div className="text-xs text-forge-muted mt-1 leading-relaxed">
          Explore problem specs and learn how to run local evaluations. No live evals run here — everything is read-only.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: spec explorer */}
        <div className="flex flex-col gap-4">
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Spec Explorer</div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search specs by ID, name, or material…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-white placeholder-forge-muted focus:outline-none focus:border-forge-accent/50 mb-3"
            />

            {/* Dropdown */}
            {loading && specs.length === 0 ? (
              <div className="text-forge-muted text-xs py-3 text-center">Loading specs…</div>
            ) : (
              <select
                value={selectedSpecId}
                onChange={(e) => setSelectedSpecId(e.target.value)}
                className="w-full bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-forge-accent/50 mb-4"
              >
                <option value="">{specs.length === 0 ? "— no specs available —" : "— pick a spec —"}</option>
                {filteredSpecs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name.replace(/ — .*$/, "")}
                  </option>
                ))}
              </select>
            )}

            {selectedSpec ? (
              <>
                {/* Diagram */}
                <div className="mb-4">
                  <SpecDiagram spec={selectedSpec} />
                </div>

                {/* Constraints */}
                <div className="text-xs font-semibold text-forge-muted uppercase tracking-wide mb-2">Constraints</div>
                <div className="bg-forge-bg rounded-lg p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Material</span>
                    <span className="text-white">{selectedSpec.material}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Load</span>
                    <span className="text-white">{selectedSpec.constraints.load_newtons} N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Safety factor</span>
                    <span className="text-white">{selectedSpec.constraints.safety_factor}×</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Build volume</span>
                    <span className="text-white">
                      {selectedSpec.constraints.build_volume_mm.map((v) => v.toFixed(0)).join(" × ")} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Bolts</span>
                    <span className="text-white">
                      {selectedSpec.constraints.bolt_pattern_mm.length} × M
                      {(selectedSpec.constraints.bolt_diameter_clearance_mm - 0.5).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Scoring metric</span>
                    <span className="text-white">{selectedSpec.scoring.metric}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-forge-muted">Direction</span>
                    <span className="text-white">{selectedSpec.scoring.direction === "minimize" ? "↓ minimize" : "↑ maximize"}</span>
                  </div>
                  {selectedSpec.scoring.baseline_mass_grams != null && (
                    <div className="flex justify-between">
                      <span className="text-forge-muted">Baseline mass</span>
                      <span className="text-white">{selectedSpec.scoring.baseline_mass_grams.toFixed(2)} g</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-forge-muted text-xs py-6 text-center">
                Select a spec above to see its constraints and diagram.
              </div>
            )}
          </div>
        </div>

        {/* Right: command + output */}
        <div className="flex flex-col gap-4">
          {/* Eval command */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Eval Command</div>
            <div className="text-xs text-forge-muted mb-3 leading-relaxed">
              Run this in your local clone of the forge repo after installing the CLI.
            </div>
            <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs">
              <span className="text-forge-muted">$ </span>
              <span className="text-forge-green">{evalCommand}</span>
            </div>
            {selectedSpec && (
              <div className="mt-2 text-xs text-forge-muted">
                Spec: <span className="text-white">{selectedSpec.name.replace(/ — .*$/, "")}</span>
                {" · "}
                <span className="text-forge-accent">{selectedSpec.scoring.metric}</span>
              </div>
            )}
          </div>

          {/* Sample output */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Sample Eval Output</div>
            <div className="text-xs text-forge-muted mb-3 leading-relaxed">
              What a passing run looks like (hardcoded example):
            </div>
            <pre className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green overflow-x-auto whitespace-pre leading-relaxed">
              {SAMPLE_OUTPUT}
            </pre>
          </div>

          {/* Run locally + problem pool */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-4">
            <div className="text-sm font-semibold text-white mb-2">Run Locally</div>
            <div className="text-xs text-forge-muted mb-3 leading-relaxed">
              Install the forge CLI, scaffold an agent, and run evals against any spec in the pool.
              The eval harness is identical to CI — deterministic and reproducible.
            </div>
            <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs space-y-1">
              <div><span className="text-forge-muted"># clone and install</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">git clone {FORGE_REPO} && cd forge && pip install -e .</span></div>
              <div className="mt-2"><span className="text-forge-muted"># scaffold a new agent</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">forge new my-agent</span></div>
              <div className="mt-2"><span className="text-forge-muted"># run eval on any spec</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">{evalCommand}</span></div>
              <div className="mt-2"><span className="text-forge-muted"># list all 45 specs and active rounds via API</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">curl {API_BASE_URL}/specs | jq '.[].id'</span></div>
              <div><span className="text-forge-muted">$ </span><span className="text-forge-green">curl {API_BASE_URL}/rounds/active</span></div>
            </div>
            <div className="mt-3 text-xs text-forge-muted leading-relaxed">
              Results are written to <code className="text-forge-accent">.forge/results/</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
