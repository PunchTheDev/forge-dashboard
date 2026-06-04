import { Round, SotaRecord, Spec, allowableStress, metricConfig, specBaseline, specLabel, sotaCodeUrl, MATERIAL_META } from "../lib/api";
import { SpecDiagram } from "./SpecDiagram";

interface Props {
  spec: Spec;
  sota: SotaRecord | null;
  submissionCount: number;
  round?: Round | null;
}

// Mirrors CATEGORY_META in App.tsx — kept minimal here so HeroStats stays self-contained
const CATEGORY_PILL: Record<string, { label: string; color: string; bg: string; border: string; goal: string }> = {
  round_001: {
    label: "Mass / Weight",
    color: "text-forge-green",
    bg: "bg-forge-green/10",
    border: "border-forge-green/40",
    goal: "Lightest part that survives the load wins.",
  },
  round_002: {
    label: "Stiffness / Weight",
    color: "text-forge-accent",
    bg: "bg-forge-accent/10",
    border: "border-forge-accent/40",
    goal: "Highest stiffness-per-gram wins.",
  },
  round_003: {
    label: "Deflection",
    color: "text-forge-red",
    bg: "bg-forge-red/10",
    border: "border-forge-red/40",
    goal: "Least bending under the applied load wins.",
  },
};

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

export function HeroStats({ spec, sota, submissionCount, round }: Props) {
  const pill = round ? CATEGORY_PILL[round.id] : null;
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
        {pill && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${pill.color} ${pill.bg} border ${pill.border} px-2 py-0.5 rounded cursor-help`}
              title={pill.goal}
            >
              {pill.label} round
            </span>
            <span className="text-xs text-forge-muted">{pill.goal}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-lg font-bold text-white">{specLabel(spec)}</h1>
          <span
            className="text-xs bg-forge-border text-forge-muted px-2 py-0.5 rounded cursor-help"
            title={MATERIAL_META[spec.material]?.note ?? spec.material}
          >
            {MATERIAL_META[spec.material]?.label ?? spec.material.toUpperCase().replace(/_/g, " ")}
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
              ? `To claim #1, beat the current best. It has been held for ${sotaAgeDays != null ? Math.floor(sotaAgeDays) : "?"} days. ` +
                (marginPct === 0
                  ? "Any improvement claims #1."
                  : `You need to beat it by ≥${marginPct < 0.5 ? marginPct.toFixed(1) : marginPct.toFixed(0)}% to claim it. ` +
                    "Threshold decays: 1% (0–7 days), 0.5% (7–30 days), 0.1% (30–90 days), 0% (90+ days).")
              : undefined
          }
        />
        <Stat
          label="vs. reference agent"
          value={
            baselineDelta != null && baselineRawPct != null
              ? baselineRawPct >= 0
                ? `${baselineDelta}% better`
                : `${baselineDelta}% worse`
              : "—"
          }
          sub={
            baseline != null
              ? `maintainer's baseline: ${baseline.toFixed(decimals)} ${scoreUnit}`
              : undefined
          }
          valueColor={
            baselineRawPct == null
              ? undefined
              : baselineRawPct > 0
                ? "text-forge-green"   // SOTA beats reference
                : "text-amber-400"     // SOTA worse than reference
          }
          title={
            baseline != null
              ? `The reference agent is the maintainer's baseline — not a competition entry. ` +
                `${baselineRawPct != null && baselineRawPct < 0 ? "Amber = the reference is still ahead of the current #1." : "Green = agents are now beating the reference."} ` +
                `Your goal is to beat the current #1 by the required margin, not the reference.`
              : undefined
          }
        />
        <Stat
          label="Stress margin"
          value={stressHeadroom ? `${stressHeadroom}% free` : "—"}
          sub={sota ? `${sota.fea_stress_mpa.toFixed(1)} MPa actual · ${allowable.toFixed(0)} MPa limit` : "no submission yet"}
          accent
          title={`Stress margin = how much of the allowable stress is still unused. ${stressHeadroom}% free means the design uses only ${100 - Number(stressHeadroom)}% of the ${allowable.toFixed(0)} MPa structural limit — the design could shed more mass while staying safe.`}
        />
        <Stat
          label="Passing entries"
          value={String(submissionCount)}
          sub="passed FEA (structural simulation)"
          accent
          title="A passing entry fits in the build volume, has bolt hole clearance, meets wall thickness and overhang constraints, and survives FEA — finite element analysis — where the peak von Mises stress must stay below yield strength ÷ safety factor."
        />
      </div>

      {/* Seed-still-leads callout */}
      {sota && baselineRawPct != null && baselineRawPct < 0 && (
        <div className="mt-3 px-4 py-2.5 bg-amber-400/5 border border-amber-400/20 rounded-xl flex items-start gap-2">
          <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚡</span>
          <div className="text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-300">Maintainer reference still leads.</strong>{" "}
            No competitor has beaten the maintainer's baseline yet — the current best is{" "}
            {Math.abs(baselineRawPct).toFixed(1)}%{" "}
            {metric === "mass_grams" ? "heavier" : isMaximize ? "less stiff" : "worse (more deflection)"} than the reference.
            Fork the winning agent below and claim #1.
          </div>
        </div>
      )}

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
