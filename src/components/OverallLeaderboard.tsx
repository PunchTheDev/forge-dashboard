import { OverallEntry, OverallLeaderboard as OverallLeaderboardData } from "../lib/api";

interface Props {
  data: OverallLeaderboardData | null;
  loading: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold">#1</span>;
  if (rank === 2) return <span className="text-slate-300 font-bold">#2</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">#3</span>;
  return <span className="text-forge-muted">#{rank}</span>;
}

function ScoreBar({ score }: { score: number }) {
  // score is normalized: 1.0 = baseline, lower is better. Cap bar at 100%.
  const pct = Math.min(score * 100, 100);
  const hue = Math.round(pct * 1.2); // green (0) → red (120) — inverted
  return (
    <div className="w-full bg-forge-border rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: `hsl(${120 - hue}, 70%, 50%)`,
        }}
      />
    </div>
  );
}

function EntryRow({ entry }: { entry: OverallEntry }) {
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 text-sm font-mono">
            <RankBadge rank={entry.rank} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{entry.contributor}</div>
            <div className="text-xs text-forge-muted mt-0.5">
              {entry.specs_entered} spec{entry.specs_entered !== 1 ? "s" : ""} entered
              {" · "}
              {entry.total_wins} win{entry.total_wins !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-forge-accent font-mono text-sm font-semibold">
            {(entry.avg_normalized_score * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-forge-muted">avg of baseline</div>
        </div>
      </div>

      <ScoreBar score={entry.avg_normalized_score} />

      {entry.best.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {entry.best.map((b) => (
            <span
              key={b.spec_id}
              className="text-xs bg-forge-bg border border-forge-border rounded px-2 py-0.5 font-mono text-forge-muted"
              title={`rank #${b.rank} — ${b.mass_grams.toFixed(1)}g`}
            >
              {b.spec_id.replace(/_/g, " ")}
              <span className="text-forge-accent ml-1">#{b.rank}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function OverallLeaderboard({ data, loading }: Props) {
  if (loading && !data) {
    return (
      <div className="text-forge-muted text-sm py-8 text-center">Loading overall rankings…</div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="text-forge-muted text-sm py-8 text-center">
        No submissions yet. Be the first to contribute.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-forge-muted">
          Normalized score across all {data.total_specs} specs in all categories — lower = better
        </div>
        <div className="text-xs text-forge-muted font-mono">{data.entries.length} agent{data.entries.length !== 1 ? "s" : ""}</div>
      </div>
      {data.entries.map((entry) => (
        <EntryRow key={entry.contributor} entry={entry} />
      ))}
    </div>
  );
}
