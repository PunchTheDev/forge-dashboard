import { allowableStress, fmtScore, Spec } from "../lib/api";

const MATERIAL_SHORT: Record<string, string> = {
  pla: "PLA",
  petg: "PETG",
  aluminum_6061: "Al6061",
  stainless_316: "SS316",
  steel_mild: "Steel",
};

/** True for randomly-generated "pub" specs (not the curated featured specs). */
function isPubSpec(spec: Spec): boolean {
  return spec.id.startsWith("pub_");
}

interface Props {
  spec: Spec;
  sotaScore?: number;
  isSelected: boolean;
  onClick: () => void;
}

export function SpecCard({ spec, sotaScore, isSelected, onClick }: Props) {
  const boltCount = spec.constraints.bolt_pattern_mm.length;
  const maxStress = allowableStress(spec);
  const isNew = sotaScore === undefined;
  const pub = isPubSpec(spec);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? "border-forge-accent bg-forge-accent/10"
          : "border-forge-border bg-forge-surface hover:border-forge-accent/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {pub ? (
              <span className="text-xs bg-forge-border text-forge-muted px-1.5 py-0 rounded font-medium">
                community
              </span>
            ) : (
              <span className="text-xs bg-forge-accent/20 text-forge-accent px-1.5 py-0 rounded font-medium">
                featured
              </span>
            )}
            <span className="text-xs text-forge-muted">{MATERIAL_SHORT[spec.material] ?? spec.material}</span>
          </div>
          <div className="text-white font-semibold text-xs leading-tight truncate">
            {spec.name.replace(/ — .*$/, "").replace(/ \[medium\]$/, "")}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {sotaScore !== undefined ? (
            <>
              <div className="font-mono text-forge-green font-bold text-sm">
                {fmtScore(sotaScore, spec.scoring.metric)}
              </div>
              <div className="text-forge-muted text-xs">#1 score</div>
            </>
          ) : isNew ? (
            <div className="text-xs text-forge-accent font-medium">first!</div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="bg-forge-bg text-forge-muted px-1.5 py-0.5 rounded">
          {(spec.constraints.load_newtons / 9.81).toFixed(0)}kg
        </span>
        <span className="bg-forge-bg text-forge-muted px-1.5 py-0.5 rounded">
          ≤{maxStress.toFixed(0)}MPa
        </span>
        <span className="bg-forge-bg text-forge-muted px-1.5 py-0.5 rounded">
          {boltCount}×bolt
        </span>
        <span className="bg-forge-bg text-forge-muted px-1.5 py-0.5 rounded">
          {spec.constraints.build_volume_mm[0].toFixed(0)}mm arm
        </span>
      </div>
    </button>
  );
}
