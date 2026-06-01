import { Spec } from "../lib/api";

interface Props {
  spec: Spec;
  sotaMass?: number;
  isSelected: boolean;
  onClick: () => void;
}

export function SpecCard({ spec, sotaMass, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-forge-accent bg-forge-accent/10"
          : "border-forge-border bg-forge-surface hover:border-forge-accent/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-white font-semibold text-sm">{spec.name}</div>
          <div className="text-forge-muted text-xs mt-0.5 line-clamp-2">
            {spec.description}
          </div>
        </div>
        {sotaMass !== undefined && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-forge-green font-bold text-sm">
              {sotaMass.toFixed(2)}g
            </div>
            <div className="text-forge-muted text-xs">SOTA</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="bg-forge-border text-forge-muted px-2 py-0.5 rounded">
          {(spec.load_n / 1000).toFixed(0)}kN load
        </span>
        <span className="bg-forge-border text-forge-muted px-2 py-0.5 rounded">
          {spec.material}
        </span>
        <span className="bg-forge-border text-forge-muted px-2 py-0.5 rounded">
          ≤{spec.max_stress_mpa}MPa
        </span>
        <span className="bg-forge-border text-forge-muted px-2 py-0.5 rounded">
          {spec.bolt_holes} bolts
        </span>
      </div>
    </button>
  );
}
