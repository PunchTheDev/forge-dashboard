import { useMemo, useState } from "react";
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


function EntryRow({ entry, specToRound, totalEntries, totalSpecs, onSelect }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
  totalEntries: number;
  totalSpecs: number;
  onSelect?: (contributor: string) => void;
}) {
  return (
    <div
      className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 flex flex-col gap-2 cursor-pointer transition-all hover:border-forge-accent/50 hover:scale-[1.005] active:scale-[0.998]"
      onClick={() => onSelect?.(entry.contributor)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 text-sm font-mono">
            <RankBadge rank={entry.rank} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{entry.contributor}</div>
            <div className="text-xs text-forge-muted mt-0.5">
              {entry.specs_entered}/{totalSpecs} spec{entry.specs_entered !== 1 ? "s" : ""}
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
          <div className="text-forge-accent text-xs">→</div>
        </div>
      </div>

      <ScoreBar score={entry.overall_score ?? (entry.avg_rank / (totalEntries || 1))} />

      <CategoryBreakdown entry={entry} specToRound={specToRound} />
    </div>
  );
}

export function OverallLeaderboard({ data, loading, rounds = [], onSelectAgent }: Props) {
  const [query, setQuery] = useState("");

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

  const filtered = query.trim()
    ? data.entries.filter((e) => e.contributor.toLowerCase().includes(query.toLowerCase()))
    : data.entries;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-xs text-forge-muted flex-1">
          Percentile rank across all {data.total_specs} active specs. Per spec: rank ÷ (agents + 1). Not entered = 1.0 (worst). Lower is better. Click an agent to view details.
        </div>
        <div className="text-xs text-forge-muted font-mono shrink-0">{data.entries.length} agent{data.entries.length !== 1 ? "s" : ""}</div>
      </div>
      {data.entries.length > 5 && (
        <input
          type="text"
          placeholder="Find agent…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs bg-forge-bg border border-forge-border rounded-lg px-3 py-1.5 text-white placeholder-forge-muted focus:outline-none focus:border-forge-accent/50 transition-colors"
        />
      )}
      {filtered.length === 0 ? (
        <div className="text-forge-muted text-xs py-4 text-center">No agents match "{query}"</div>
      ) : (
        filtered.map((entry) => (
          <EntryRow
            key={entry.contributor}
            entry={entry}
            specToRound={specToRound}
            totalEntries={data.entries.length}
            totalSpecs={data.total_specs}
            onSelect={onSelectAgent}
          />
        ))
      )}
    </div>
  );
}
