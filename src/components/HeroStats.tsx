import type { ReactNode } from "react";
import { Round, SotaRecord, Spec, allowableStress, metricConfig, specBaseline, specLabel, MATERIAL_META } from "../lib/api";
import { SpecDiagram } from "./SpecDiagram";
import { SotaCodeViewer } from "./SotaCodeViewer";

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

/**
 * Tooltip-bearing chip used on the spec header recipe row.
 * Signals "I have a tooltip" with a low-opacity ⓘ glyph + hover bg/text lift,
 * so first-timers don't have to guess that these chips are interactive.
 */
function InfoChip({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded cursor-help inline-flex items-center gap-1 transition-colors duration-150 ${
        className ?? "bg-forge-border text-forge-muted hover:bg-forge-border/80 hover:text-white"
      }`}
      title={title}
    >
      {children}
      <span aria-hidden="true" className="text-[9px] opacity-50 leading-none translate-y-[-0.5px]">ⓘ</span>
    </span>
  );
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
    <div className={`bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-1${title ? " cursor-help" : ""}`} title={title}>
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
  const metricLabel = `${isMaximize ? "↑" : "↓"} Best ${label.toLowerCase()}`;

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
  // When the maintainer reference is still ahead of the best competitor, the SOTA
  // bar to claim #1 is the reference value — not the best competitor. Surface it
  // explicitly so first-timers don't read "beat the current best by 1%" and assume
  // that claims SOTA when it actually doesn't.
  const seedLeads = sota != null && baselineRawPct != null && baselineRawPct < 0;
  const baselineStr = baseline != null ? `${baseline.toFixed(decimals)} ${scoreUnit}` : null;

  // Plain-English summary that ties material + load + arm + allowable to the diagram below.
  // Bridges the dense chip recipe ("PETG · 15 kg load · 78mm arm") to the visual SpecDiagram.
  const materialLabel = MATERIAL_META[spec.material]?.label ?? spec.material.toUpperCase().replace(/_/g, " ");
  const armMm = spec.constraints.load_point_mm[0].toFixed(0);

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
          <InfoChip
            title={MATERIAL_META[spec.material]?.note ?? spec.material}
          >
            {MATERIAL_META[spec.material]?.label ?? spec.material.toUpperCase().replace(/_/g, " ")}
          </InfoChip>
          <InfoChip
            title={`${spec.constraints.load_newtons.toFixed(0)} N is the force the FEA solver applies; ${loadKg} kg is the everyday equivalent (1 kg ≈ 9.81 N under Earth gravity). The load points downward (-Z) at the arm tip. The diagram below shows the same number in newtons — the units match, only the framing differs.`}
          >
            {loadKg} kg <span className="text-forge-muted/70">({spec.constraints.load_newtons.toFixed(0)} N)</span> load
          </InfoChip>
          <InfoChip
            title={`Safety factor ${spec.constraints.safety_factor}× — yield stress ÷ safety factor = max allowable stress (${allowable.toFixed(0)} MPa for this material). Higher safety factor = stricter design requirement.`}
          >
            Safety factor {spec.constraints.safety_factor}×
          </InfoChip>
          <InfoChip
            title={`Max allowable stress = ${spec.material.includes("aluminum") || spec.material.includes("stainless") ? "yield strength" : "tensile strength"} ÷ safety factor ${spec.constraints.safety_factor}×. Your design's peak von Mises stress must stay below this. MPa = megapascals (unit of pressure/stress).`}
          >
            ≤{allowable.toFixed(0)} MPa
          </InfoChip>
          {spec.tier && (
            <InfoChip
              className={`capitalize border ${
                spec.tier === "easy"
                  ? "bg-forge-green/10 text-forge-green border-forge-green/30 hover:bg-forge-green/15"
                  : spec.tier === "medium"
                  ? "bg-forge-accent/10 text-forge-accent border-forge-accent/30 hover:bg-forge-accent/15"
                  : "bg-forge-red/10 text-forge-red border-forge-red/30 hover:bg-forge-red/15"
              }`}
              title={`Difficulty tier: ${spec.tier}. Easy problems have lighter loads and more generous tolerances; hard problems push constraints further.`}
            >
              {spec.tier}
            </InfoChip>
          )}
        </div>
        <p className="text-forge-muted text-xs leading-relaxed max-w-xl mb-2">
          {spec.description}
        </p>
        <p className="text-forge-text/85 text-xs leading-relaxed max-w-2xl mb-4">
          <span className="text-white font-semibold">In plain English:</span>{" "}
          a <span className="text-white">{materialLabel}</span> bracket bolted to a wall must hold{" "}
          <span className="text-white">{loadKg} kg</span>{" "}
          <span className="text-forge-muted">({spec.constraints.load_newtons.toFixed(0)} N)</span> pulling{" "}
          <span className="text-white">straight down</span> at the tip of a{" "}
          <span className="text-white">{armMm} mm</span> cantilever arm, without exceeding{" "}
          <span className="text-white">{allowable.toFixed(0)} MPa</span> peak stress (safety factor{" "}
          {spec.constraints.safety_factor}×). The diagram below shows the geometry — arm length, load arrow, bolt plate.
        </p>
        <SpecDiagram spec={spec} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label={metricLabel}
          value={sotaScore != null ? `${sotaScore.toFixed(decimals)} ${scoreUnit}` : "—"}
          sub={
            sota
              ? seedLeads
                ? `top competitor · by ${sota.contributor}`
                : `by ${sota.contributor}${marginNote ? ` · ${marginNote}` : ""}`
              : "no submissions yet"
          }
          title={
            seedLeads && baselineStr
              ? `Top competitor's score. The maintainer reference (${baselineStr}) still leads — to claim #1, beat the reference, not the current best. Any margin wins until a competitor takes SOTA.`
              : marginPct != null
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

      {/* Seed-still-leads callout — first-timer needs the "which direction wins" anchor
       *  BEFORE the percentage gap reads naturally. e.g. "5.2% heavier" only means worse if
       *  you already know lower mass wins. Lead with the direction, then the gap with a
       *  metric-specific verb, then the concrete bar-to-beat inline. */}
      {seedLeads && (() => {
        const directionLine =
          metric === "mass_grams"
            ? "Lower mass wins this category"
            : isMaximize
            ? "Higher stiffness wins this category"
            : "Lower deflection wins this category";
        const pct = (
          <span className="font-mono text-amber-200">{Math.abs(baselineRawPct!).toFixed(1)}%</span>
        );
        const refStr = (
          <span className="font-mono text-amber-200">{baselineStr}</span>
        );
        const gapPhrase =
          metric === "mass_grams" ? (
            <>is {pct} heavier than the reference at {refStr}</>
          ) : isMaximize ? (
            <>still falls {pct} short of the reference at {refStr}</>
          ) : (
            <>deflects {pct} more than the reference at {refStr}</>
          );
        return (
          <div className="mt-3 px-4 py-2.5 bg-amber-400/5 border border-amber-400/20 rounded-xl flex items-start gap-2">
            <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚡</span>
            <div className="text-xs text-amber-300/80 leading-relaxed">
              <strong className="text-amber-300">Maintainer reference still leads.</strong>{" "}
              {directionLine} — the top competitor {gapPhrase}.
              {" "}Beat {refStr} to claim #1 — any margin wins until a competitor takes SOTA.
            </div>
          </div>
        );
      })()}

      {/* SOTA agent source — the flywheel: read it, fork it, beat it by a decaying margin.
       *  We pull the file inline (not link-out) so the loop stays on this page.
       *  id="sota-code" + scroll-margin so per-category `↗ code` chips elsewhere can deep-link
       *  here (the SotaCodeViewer auto-expands when arrived via that hash). */}
      {sota && (
        <div id="sota-code" style={{ scrollMarginTop: 96 }}>
          <div className="mt-4 px-1 text-xs text-forge-muted leading-relaxed">
            {seedLeads ? (
              <>
                <span className="text-white font-semibold">Top competitor — open-source code.</span>{" "}
                Highest-ranked competitor submission so far. Read it below, fork it, then push past
                the <span className="text-white font-mono">{baselineStr}</span> reference to claim #1.
              </>
            ) : (
              <>
                <span className="text-white font-semibold">Winning agent — open-source code.</span>{" "}
                The current best score was set by this agent. Read it below, fork it,{" "}
                {marginNote ? (
                  <>
                    beat it by <span className="text-white font-mono">{marginNote}</span>,
                  </>
                ) : (
                  "beat it,"
                )}{" "}
                and claim #1.
              </>
            )}
          </div>
          <SotaCodeViewer
            sota={sota}
            label={seedLeads ? "Top competitor agent" : "Current #1 agent"}
          />
        </div>
      )}
    </div>
  );
}
