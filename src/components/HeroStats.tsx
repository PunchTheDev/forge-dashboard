import { SotaRecord, Spec, allowableStress, metricConfig, specBaseline } from "../lib/api";
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
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  title?: string;
}) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-1" title={title}>
      <div className="text-forge-muted text-xs font-medium uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          accent ? "text-forge-accent" : "text-forge-green"
        }`}
      >
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
  const metricLabel = `SOTA ${label.toLowerCase()}`;

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
          <h2 className="text-lg font-bold text-white">{spec.name}</h2>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
            {spec.material.toUpperCase().replace("_", " ")}
          </span>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
            {loadKg} kg load
          </span>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
            SF {spec.constraints.safety_factor}×
          </span>
          <span className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded">
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
        />
        <Stat
          label="Stress headroom"
          value={stressHeadroom ? `${stressHeadroom}%` : "—"}
          sub={sota ? `${sota.fea_stress_mpa.toFixed(1)} / ${allowable.toFixed(0)} MPa` : "max von Mises"}
          accent
          title="FEA (Finite Element Analysis) simulates the load on your design. Stress headroom = how far the peak Von Mises stress is below the allowable limit. Higher % = more safety margin."
        />
        <Stat
          label="Passing entries"
          value={String(submissionCount)}
          sub="designs that survived FEA"
          accent
          title="A passing entry fits in the build volume, has bolt hole clearance, meets wall thickness and overhang constraints, and survives FEA (peak stress ≤ yield / safety factor)."
        />
      </div>
    </div>
  );
}
