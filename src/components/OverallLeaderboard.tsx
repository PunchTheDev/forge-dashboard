import { useState, useMemo } from "react";
import { OverallEntry, OverallLeaderboard as OverallLeaderboardData, Round, fmtScore } from "../lib/api";

interface Props {
  data: OverallLeaderboardData | null;
  loading: boolean;
  rounds?: Round[];
  onSelectAgent?: (contributor: string) => void;
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

/** Display a normalized score % — capped at 999% with ">" prefix when absurd. */
function fmtNorm(norm: number): { text: string; color: string } {
  const pct = norm * 100;
  if (pct <= 80)  return { text: `${pct.toFixed(1)}%`, color: "text-forge-green" };
  if (pct <= 100) return { text: `${pct.toFixed(1)}%`, color: "text-forge-accent" };
  if (pct > 999)  return { text: `>${(999).toFixed(0)}%`, color: "text-forge-red" };
  return { text: `${pct.toFixed(1)}%`, color: "text-forge-red" };
}

/** Display an average rank — #1.0 is green, higher ranks shade toward amber/red. */
function fmtOverallScore(score: number): { text: string; color: string } {
  // overall_score < 1.0 = beating baseline. Closer to 0 = better.
  if (score <= 0.80) return { text: score.toFixed(3), color: "text-forge-green" };
  if (score <= 0.95) return { text: score.toFixed(3), color: "text-forge-accent" };
  return { text: score.toFixed(3), color: "text-forge-muted" };
}

function fmtAvgRank(avg: number): { text: string; color: string } {
  if (avg <= 1.5) return { text: `#${avg.toFixed(1)}`, color: "text-forge-green" };
  if (avg <= 3.0) return { text: `#${avg.toFixed(1)}`, color: "text-forge-accent" };
  return { text: `#${avg.toFixed(1)}`, color: "text-forge-red" };
}

function ScoreBar({ score }: { score: number }) {
  // overall_score <= 1.0. Bar fills from right: 0 = full green, 1.0 = empty.
  const fill = Math.max(0, Math.min(1, 1 - score));
  const hue = Math.round(fill * 120);
  return (
    <div className="w-full bg-forge-border rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${fill * 100}%`, backgroundColor: `hsl(${hue}, 70%, 50%)` }}
      />
    </div>
  );
}

function CategoryBreakdown({ entry, specToRound }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
}) {
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
        const bestRank = Math.min(...bests.map((b) => b.rank));
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
              <span className={`ml-1 font-mono ${bestRank === 1 ? "text-yellow-400" : ""}`}>#{bestRank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpecBreakdown({ entry, specToRound }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
}) {
  const sorted = useMemo(
    () => [...entry.best].sort((a, b) => a.spec_id.localeCompare(b.spec_id)),
    [entry.best],
  );

  return (
    <div className="mt-3 border-t border-forge-border pt-3">
      <div className="text-xs text-forge-muted mb-2 font-semibold uppercase tracking-wide">Per-spec results</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-forge-muted border-b border-forge-border">
            <th className="text-left pb-1.5 font-normal">Spec</th>
            <th className="text-left pb-1.5 font-normal">Category</th>
            <th className="text-right pb-1.5 font-normal">Score</th>
            <th className="text-right pb-1.5 font-normal">vs Baseline</th>
            <th className="text-right pb-1.5 font-normal">Rank</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const roundId = specToRound[b.spec_id];
            const meta = roundId ? CATEGORY_META[roundId] : null;
            const isSota = b.rank === 1;
            return (
              <tr key={b.spec_id} className="border-b border-forge-border/40 last:border-0">
                <td className="py-1.5 font-mono text-white/80">{b.spec_id}</td>
                <td className="py-1.5">
                  {meta ? (
                    <span className={`${meta.color} font-medium`}>{meta.label}</span>
                  ) : (
                    <span className="text-forge-muted">—</span>
                  )}
                </td>
                <td className="py-1.5 text-right font-mono text-white">
                  {fmtScore(b.score, b.score_metric)}
                </td>
                <td className={`py-1.5 text-right font-mono ${fmtNorm(b.normalized_score).color}`}>{fmtNorm(b.normalized_score).text}</td>
                <td className="py-1.5 text-right">
                  {isSota ? (
                    <span className="text-yellow-400 font-bold">#1 ★</span>
                  ) : (
                    <span className="text-forge-muted">#{b.rank}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EntryRow({ entry, specToRound, expanded, onToggle, totalEntries, onSelect }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
  totalEntries: number;
  onSelect?: (contributor: string) => void;
}) {
  return (
    <div
      className={`bg-forge-surface border rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer transition-colors ${
        expanded ? "border-forge-accent/50" : "border-forge-border hover:border-forge-border/80"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 text-sm font-mono">
            <RankBadge rank={entry.rank} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-white">{entry.contributor}</div>
              {onSelect && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(entry.contributor); }}
                  className="text-xs text-forge-accent hover:underline"
                >
                  Details →
                </button>
              )}
            </div>
            <div className="text-xs text-forge-muted mt-0.5">
              {entry.specs_entered} spec{entry.specs_entered !== 1 ? "s" : ""}
              {" · "}
              {entry.total_wins} win{entry.total_wins !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {entry.overall_score !== undefined ? (() => {
              const { text, color } = fmtOverallScore(entry.overall_score);
              return (
                <>
                  <div className={`font-mono text-sm font-semibold ${color}`}>{text}</div>
                  <div className="text-xs text-forge-muted">overall</div>
                </>
              );
            })() : (() => {
              const { text, color } = fmtAvgRank(entry.avg_rank);
              return (
                <>
                  <div className={`font-mono text-sm font-semibold ${color}`}>{text}</div>
                  <div className="text-xs text-forge-muted">avg rank</div>
                </>
              );
            })()}
          </div>
          <div className={`text-forge-muted transition-transform ${expanded ? "rotate-180" : ""}`}>
            ▾
          </div>
        </div>
      </div>

      <ScoreBar score={entry.overall_score ?? (entry.avg_rank / (totalEntries || 1))} />

      <CategoryBreakdown entry={entry} specToRound={specToRound} />

      {expanded && (
        <SpecBreakdown entry={entry} specToRound={specToRound} />
      )}
    </div>
  );
}

export function OverallLeaderboard({ data, loading, rounds = [], onSelectAgent }: Props) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

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
          Average rank position across {data.total_specs} specs. #1.0 = first place on every entered spec. Click to expand.
        </div>
        <div className="text-xs text-forge-muted font-mono">{data.entries.length} agent{data.entries.length !== 1 ? "s" : ""}</div>
      </div>
      {data.entries.map((entry) => (
        <EntryRow
          key={entry.contributor}
          entry={entry}
          specToRound={specToRound}
          expanded={expandedAgent === entry.contributor}
          onToggle={() => setExpandedAgent(expandedAgent === entry.contributor ? null : entry.contributor)}
          totalEntries={data.entries.length}
          onSelect={onSelectAgent}
        />
      ))}
    </div>
  );
}
