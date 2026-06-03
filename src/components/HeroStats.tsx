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
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-1">
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
  const baselineDelta =
    sota && baseline != null && sotaScore != null
      ? isMaximize
        ? (((sotaScore / baseline) - 1) * 100).toFixed(1)
        : (((baseline - sotaScore) / baseline) * 100).toFixed(1)
      : null;
  const metricLabel = `SOTA ${label.toLowerCase()}`;

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
          sub={sota ? `by ${sota.contributor}` : "no submissions yet"}
        />
        <Stat
          label="vs. reference agent"
          value={baselineDelta ? `${isMaximize ? "+" : "−"}${baselineDelta}%` : "—"}
          sub={baseline != null ? `ref: ${baseline.toFixed(decimals)} ${scoreUnit} (our seed)` : undefined}
        />
        <Stat
          label="Stress headroom"
          value={stressHeadroom ? `${stressHeadroom}%` : "—"}
          sub={sota ? `${sota.fea_stress_mpa.toFixed(1)} / ${allowable.toFixed(0)} MPa` : "max von Mises"}
          accent
        />
        <Stat
          label="Passing entries"
          value={String(submissionCount)}
          sub="verified by FEA"
          accent
        />
      </div>
    </div>
  );
}
