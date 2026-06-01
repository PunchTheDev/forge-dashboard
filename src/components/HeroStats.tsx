import { SotaRecord } from "../lib/api";

interface Props {
  sota: SotaRecord | null;
  submissionCount: number;
  specName: string;
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

export function HeroStats({ sota, submissionCount, specName }: Props) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">
          Forge — <span className="text-forge-accent">{specName}</span>
        </h1>
        <p className="text-forge-muted text-sm mt-1">
          Competitive parametric CAD benchmark. Minimize mass. Survive the load.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="SOTA mass"
          value={sota ? `${sota.score_grams.toFixed(2)}g` : "—"}
          sub={sota ? `by ${sota.contributor}` : "no submissions yet"}
          accent={false}
        />
        <Stat
          label="Stress headroom"
          value={sota ? `${sota.fea_stress_mpa.toFixed(1)} MPa` : "—"}
          sub="max von Mises"
          accent={false}
        />
        <Stat
          label="Submissions"
          value={String(submissionCount)}
          sub="total attempts"
          accent={true}
        />
        <Stat
          label="Status"
          value="Open"
          sub="accepting PRs"
          accent={true}
        />
      </div>
    </div>
  );
}
