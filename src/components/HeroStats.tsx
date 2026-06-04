import { SotaRecord, Spec, allowableStress, metricConfig, specBaseline, specLabel, sotaCodeUrl } from "../lib/api";
import { SpecDiagram } from "./SpecDiagram";

interface Props {
  spec: Spec;
  sota: SotaRecord | null;
  submissionCount: number;
}

function Stat({
  label,
  value,
  sub,
  accent,
  valueColor,
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  valueColor?: string;
  title?: string;
}) {
  const color = valueColor ?? (accent ? "text-forge-accent" : "text-forge-green");
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-1" title={title}>
      <div className="text-forge-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold tabular-nums ${color}`}>
        {value}
      </div>
      {sub && <div className="text-forge-muted text-xs">{sub}</div>}
    </div>
  );
}

function sotaMarginThreshold(ageDays: number): number {
  if (ageDays < 7) return 0.01;
  if (ageDays < 30) return 0.005;
  if (ageDays < 90) return 0.001;
  return 0.0;
}

export function HeroStats({ spec, sota, submissionCount }: Props) {
  const allowable = allowableStress(spec);
  const loadKg = (spec.constraints.load_newtons / 9.81).toFixed(0);
  const stressHeadroom = sota
    ? (((allowable - sota.fea_stress_mpa) / allowable) * 100).toFixed(0)
    : null;

  const metric = spec.scoring.metric;
  const isMaximize = spec.scoring.direction === "maximize";
  const { label, unit: scoreUnit, decimals } = metricConfig(metric);
  const baseline = specBaseline(spec.scoring);
  const sotaScore = sota?.score ?? sota?.score_grams ?? null;
  const baselineRawPct =
    sota && baseline != null && sotaScore != null
      ? isMaximize
        ? ((sotaScore / baseline) - 1) * 100
        : ((baseline - sotaScore) / baseline) * 100
      : null;
  // positive raw = SOTA beats reference in the optimization direction
  const baselineDelta = baselineRawPct != null ? Math.abs(baselineRawPct).toFixed(1) : null;
  const baselineSign =
    baselineRawPct == null
      ? null
      : baselineRawPct >= 0
        ? (isMaximize ? "+" : "−")  // SOTA better than reference
        : (isMaximize ? "−" : "+"); // SOTA worse than reference
  const metricLabel = `Best ${label.toLowerCase()}`;

  // Compute marginal gain threshold based on SOTA age
  const sotaAgeDays = sota?.submitted_at
    ? (Date.now() - new Date(sota.submitted_at).getTime()) / 86400000
    : null;
  const marginPct = sotaAgeDays != null ? sotaMarginThreshold(sotaAgeDays) * 100 : null;
  const marginNote =
    marginPct == null
      ? undefined
      : marginPct === 0
        ? "any improvement wins"
        : `beat by ≥${marginPct < 0.5 ? marginPct.toFixed(1) : marginPct.toFixed(0)}% to claim`;

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-lg font-bold text-white">{specLabel(spec)}</h1>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
            {spec.material.toUpperCase().replace("_", " ")}
          </span>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
            {loadKg} kg load
          </span>
          <span
            className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded cursor-help"
            title={`Safety factor ${spec.constraints.safety_factor}× — yield stress ÷ SF = max allowable stress. Higher = stricter design requirement.`}
          >
            SF {spec.constraints.safety_factor}×
          </span>
          <span
            className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded cursor-help"
            title={`Max allowable stress = ${spec.material.includes("aluminum") || spec.material.includes("stainless") ? "yield strength" : "tensile strength"} ÷ safety factor ${spec.constraints.safety_factor}×. Your design's peak von Mises stress must stay below this. MPa = megapascals (unit of pressure/stress).`}
          >
            ≤{allowable.toFixed(0)} MPa
          </span>
        </div>
        <p className="text-forge-muted text-xs leading-relaxed max-w-xl mb-4">
          {spec.description}
        </p>
        <SpecDiagram spec={spec} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label={metricLabel}
          value={sotaScore != null ? `${sotaScore.toFixed(decimals)} ${scoreUnit}` : "—"}
          sub={
            sota
              ? `by ${sota.contributor}${marginNote ? ` · ${marginNote}` : ""}`
              : "no submissions yet"
          }
          title={
            marginPct != null
              ? `Marginal gain rule: SOTA held for ${sotaAgeDays != null ? Math.floor(sotaAgeDays) : "?"} days. ` +
                (marginPct === 0
                  ? "Any improvement is eligible to claim the SOTA spot."
                  : `You need to beat it by ≥${marginPct < 0.5 ? marginPct.toFixed(1) : marginPct.toFixed(0)}% to claim it. ` +
                    "Threshold decays: 1% (0–7 days), 0.5% (7–30 days), 0.1% (30–90 days), 0% (90+ days).")
              : undefined
          }
        />
        <Stat
          label="vs. reference agent"
          value={baselineDelta && baselineSign ? `${baselineSign}${baselineDelta}%` : "—"}
          sub={baseline != null ? `ref: ${baseline.toFixed(decimals)} ${scoreUnit} (our seed)` : undefined}
          valueColor={
            baselineRawPct == null
              ? undefined
              : baselineRawPct > 0
                ? "text-forge-green"   // SOTA beats reference
                : "text-amber-400"     // SOTA worse than reference
          }
          title={
            baseline != null
              ? `The reference agent is the maintainer's optimized baseline, set offline when this spec was designed — it is not a competition submission. ` +
                `Current SOTA: ${sotaScore != null ? `${sotaScore.toFixed(decimals)} ${scoreUnit}` : "none yet"}. ` +
                `Your goal is to beat the SOTA by the required margin (see the SOTA stat), not the reference. ` +
                `Green = agents are beating the seed; amber = the seed is still ahead.`
              : undefined
          }
        />
        <Stat
          label="Stress headroom"
          value={stressHeadroom ? `${stressHeadroom}% free` : "—"}
          sub={sota ? `${sota.fea_stress_mpa.toFixed(1)} MPa actual · ${allowable.toFixed(0)} MPa limit` : "no submission yet"}
          accent
          title={`Stress headroom = how much of the allowable stress is still unused. ${stressHeadroom}% free means only ${100 - Number(stressHeadroom)}% of the ${allowable.toFixed(0)} MPa limit is used — the design has a lot of room to shed mass.`}
        />
        <Stat
          label="Passing entries"
          value={String(submissionCount)}
          sub="designs that survived FEA"
          accent
          title="A passing entry fits in the build volume, has bolt hole clearance, meets wall thickness and overhang constraints, and survives FEA (peak stress ≤ yield / safety factor)."
        />
      </div>

      {/* SOTA code link — the flywheel: open-source the winner so the next agent can fork and beat it */}
      {sota && (
        <div className="mt-4 bg-forge-surface border border-forge-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white mb-0.5">Winning agent — open-source code</div>
            <div className="text-xs text-forge-muted">
              The current best score was set by this agent. Fork it, beat it by the margin above, and claim #1.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <code className="text-xs text-forge-muted bg-forge-bg px-2 py-1 rounded font-mono truncate max-w-[200px]">
              {sota.agent}
            </code>
            <a
              href={sotaCodeUrl(sota)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-forge-accent/10 border border-forge-accent/30 text-forge-accent px-3 py-1.5 rounded-lg hover:bg-forge-accent/20 transition-colors font-mono whitespace-nowrap"
            >
              View code →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
