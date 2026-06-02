import { useMemo } from "react";
import { OverallEntry, OverallLeaderboard as OverallLeaderboardData, Round, fmtScore } from "../lib/api";

interface Props {
  data: OverallLeaderboardData | null;
  loading: boolean;
  rounds?: Round[];
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  round_001: { label: "Mass",             color: "text-forge-green",  bg: "bg-forge-green/10",  border: "border-forge-green/30" },
  round_002: { label: "Stiffness/Weight", color: "text-forge-accent", bg: "bg-forge-accent/10", border: "border-forge-accent/30" },
  round_003: { label: "Deflection",       color: "text-forge-red",    bg: "bg-forge-red/10",    border: "border-forge-red/30" },
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold">#1</span>;
  if (rank === 2) return <span className="text-slate-300 font-bold">#2</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">#3</span>;
  return <span className="text-forge-muted">#{rank}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(score * 100, 100);
  const hue = Math.round(pct * 1.2);
  return (
    <div className="w-full bg-forge-border rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: `hsl(${120 - hue}, 70%, 50%)` }}
      />
    </div>
  );
}

function CategoryBreakdown({ entry, specToRound }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
}) {
  // Group best entries by round
  const byRound = useMemo(() => {
    const map: Record<string, typeof entry.best> = {};
    for (const b of entry.best) {
      const rid = specToRound[b.spec_id] ?? "other";
      if (!map[rid]) map[rid] = [];
      map[rid].push(b);
    }
    return map;
  }, [entry.best, specToRound]);

  const knownRounds = Object.keys(CATEGORY_META).filter((rid) => byRound[rid]?.length);
  if (!knownRounds.length) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {knownRounds.map((rid) => {
        const meta = CATEGORY_META[rid];
        const bests = byRound[rid];
        const wins = bests.filter((b) => b.rank === 1).length;
        // Best normalized score in this category (lower is better)
        const bestNorm = Math.min(...bests.map((b) => b.normalized_score));
        // Representative entry for score display (first win, or first entry)
        const rep = bests.find((b) => b.rank === 1) ?? bests[0];
        return (
          <div key={rid} className={`rounded-lg border px-3 py-2 ${meta.bg} ${meta.border}`}>
            <div className={`text-xs font-semibold ${meta.color} mb-1`}>{meta.label}</div>
            <div className="text-xs text-white font-mono">
              {fmtScore(rep.score, rep.score_metric)}
            </div>
            <div className="text-xs text-forge-muted mt-0.5">
              {bests.length} spec{bests.length !== 1 ? "s" : ""}
              {wins > 0 && <span className="text-yellow-400 ml-1">· {wins} win{wins !== 1 ? "s" : ""}</span>}
              <span className="ml-1 font-mono">{(bestNorm * 100).toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntryRow({ entry, specToRound }: { entry: OverallEntry; specToRound: Record<string, string> }) {
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
              {entry.specs_entered} spec{entry.specs_entered !== 1 ? "s" : ""}
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

      <CategoryBreakdown entry={entry} specToRound={specToRound} />
    </div>
  );
}

export function OverallLeaderboard({ data, loading, rounds = [] }: Props) {
  // Build spec_id → round_id map from rounds data
  const specToRound = useMemo(() => {
    const map: Record<string, string> = {};
    for (const round of rounds) {
      for (const spec of round.specs) map[spec.id] = round.id;
    }
    return map;
  }, [rounds]);

  if (loading && !data) {
    return <div className="text-forge-muted text-sm py-8 text-center">Loading overall rankings…</div>;
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
          Normalized score across all {data.total_specs} specs — lower is better. 100% = baseline.
        </div>
        <div className="text-xs text-forge-muted font-mono">{data.entries.length} agent{data.entries.length !== 1 ? "s" : ""}</div>
      </div>
      {data.entries.map((entry) => (
        <EntryRow key={entry.contributor} entry={entry} specToRound={specToRound} />
      ))}
    </div>
  );
}
