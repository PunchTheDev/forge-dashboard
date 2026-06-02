/**
 * SubmissionJourney — shows the full story for a selected submission:
 * Spec → Agent → FEA test → Score vs SOTA
 */
import { Submission, Spec, SotaRecord, stepUrl } from "../lib/api";
import { StepViewer } from "./StepViewer";
import { SpecDiagram } from "./SpecDiagram";

const MATERIAL_LABEL: Record<string, string> = {
  pla: "PLA",
  petg: "PETG",
  aluminum_6061: "Al 6061-T6",
  stainless_316: "316 SS",
  steel_mild: "Mild Steel",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StageIcon({ passed }: { passed: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
      ${passed ? "bg-forge-green/20 text-forge-green" : "bg-forge-red/20 text-forge-red"}`}>
      {passed ? "✓" : "✗"}
    </div>
  );
}

function Pipeline({ steps }: {
  steps: { label: string; passed: boolean; detail: string }[]
}) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start flex-1 min-w-0">
          <div className="flex flex-col items-center min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 w-full">
              <StageIcon passed={s.passed} />
              <span className="text-xs font-semibold text-white truncate">{s.label}</span>
            </div>
            <div className="text-xs text-forge-muted leading-relaxed w-full">{s.detail}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="text-forge-border text-lg mx-2 mt-0.5 flex-shrink-0">→</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  submission: Submission;
  spec: Spec;
  sota: SotaRecord | null;
  onClose: () => void;
}

export function SubmissionJourney({ submission, spec, sota, onClose }: Props) {
  const c = spec.constraints;
  const stressRatio = submission.fea_stress_mpa / submission.fea_allowable_mpa;
  const stressUsed = (stressRatio * 100).toFixed(1);
  const stressHeadroom = ((1 - stressRatio) * 100).toFixed(1);
  const baseline = spec.scoring.baseline_mass_grams;
  const reductionPct = ((1 - submission.mass_grams / baseline) * 100).toFixed(1);
  const vsSOTA = sota ? (sota.score_grams - submission.mass_grams) : null;
  const beatsSOTA = vsSOTA != null && vsSOTA > 0;
  const isSOTA = sota?.commit_hash === submission.commit_hash;

  const agentName = submission.agent_path.split("/").slice(-2, -1)[0] ?? submission.agent_path;
  const material = MATERIAL_LABEL[spec.material] ?? spec.material;
  const loadKg = (c.load_newtons / 9.81).toFixed(0);
  const loadMm = c.load_point_mm[0].toFixed(0);

  const stages = [
    {
      label: "Problem",
      passed: true,
      detail: `${material} · ${loadKg}kg @ ${loadMm}mm\nSF ${c.safety_factor}× · ${c.bolt_pattern_mm.length} bolts`,
    },
    {
      label: "Agent",
      passed: true,
      detail: `${agentName}\nby ${submission.contributor}${submission.pr_number ? ` · PR #${submission.pr_number}` : ""}`,
    },
    {
      label: "FEA",
      passed: submission.passed,
      detail: submission.passed
        ? `${submission.fea_stress_mpa.toFixed(1)} / ${submission.fea_allowable_mpa.toFixed(1)} MPa\n${stressUsed}% used · ${stressHeadroom}% headroom`
        : "Geometry or stress check failed",
    },
    {
      label: "Score",
      passed: submission.passed,
      detail: submission.passed
        ? `${submission.mass_grams.toFixed(2)}g · −${reductionPct}% from baseline`
        : "No score (failed)",
    },
  ];

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-forge-border">
        <div className="flex items-center gap-3">
          <span className="text-xs text-forge-muted font-semibold uppercase tracking-wider">
            Submission Journey
          </span>
          {isSOTA && (
            <span className="text-xs bg-forge-gold/20 text-forge-gold px-2 py-0.5 rounded-full font-semibold">
              SOTA
            </span>
          )}
          {beatsSOTA && !isSOTA && (
            <span className="text-xs bg-forge-green/20 text-forge-green px-2 py-0.5 rounded-full font-semibold">
              Leader
            </span>
          )}
          <span className="text-xs text-forge-muted">{formatDate(submission.submitted_at)}</span>
        </div>
        <button
          onClick={onClose}
          className="text-forge-muted hover:text-white transition-colors text-xs px-2 py-1 rounded hover:bg-forge-bg"
        >
          close ×
        </button>
      </div>

      {/* Pipeline */}
      <div className="px-5 py-4 border-b border-forge-border">
        <Pipeline steps={stages} />
      </div>

      {/* Score comparison */}
      {submission.passed && (
        <div className="px-5 py-4 border-b border-forge-border">
          <div className="flex flex-wrap items-center gap-6">
            {/* Mass */}
            <div>
              <div className="text-2xl font-bold text-white font-mono">
                {submission.mass_grams.toFixed(2)}
                <span className="text-sm text-forge-muted ml-1">g</span>
              </div>
              <div className="text-xs text-forge-muted mt-0.5">
                −{reductionPct}% vs {baseline.toFixed(0)}g baseline
              </div>
            </div>

            {/* Stress bar */}
            <div className="flex-1 min-w-[160px] max-w-xs">
              <div className="flex justify-between text-xs text-forge-muted mb-1">
                <span>Stress utilization</span>
                <span className="font-mono">{stressUsed}%</span>
              </div>
              <div className="h-2 bg-forge-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stressRatio > 0.85 ? "bg-forge-red" :
                    stressRatio > 0.65 ? "bg-yellow-400" :
                    "bg-forge-green"
                  }`}
                  style={{ width: `${Math.min(stressRatio * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* vs SOTA */}
            {sota && (
              <div className={`text-sm font-mono font-bold ${beatsSOTA ? "text-forge-green" : "text-forge-muted"}`}>
                {beatsSOTA
                  ? `−${vsSOTA!.toFixed(2)}g vs SOTA`
                  : `+${Math.abs(vsSOTA!).toFixed(2)}g vs SOTA (${sota.score_grams.toFixed(2)}g)`}
              </div>
            )}

            {/* PR link */}
            {submission.pr_number && (
              <a
                href={`https://github.com/PunchTheDev/forge/pull/${submission.pr_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-forge-accent hover:underline"
              >
                PR #{submission.pr_number} →
              </a>
            )}
          </div>
        </div>
      )}

      {/* 3D viewer + spec diagram */}
      <div className="flex gap-4 p-5">
        <div className="flex-1 min-w-0">
          <StepViewer
            stepUrl={submission.has_step ? stepUrl(submission.id) : null}
            label={`${agentName} — ${submission.mass_grams.toFixed(2)}g`}
          />
        </div>
        <div className="shrink-0 hidden lg:block">
          <div className="text-xs text-forge-muted mb-2 font-semibold uppercase tracking-wider">
            Spec constraints
          </div>
          <SpecDiagram spec={spec} />
        </div>
      </div>
    </div>
  );
}
