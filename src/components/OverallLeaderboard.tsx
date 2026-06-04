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


/** Display overall score — rank-aware coloring so #1 agent is always green. */
function fmtOverallScore(score: number, rank: number): { text: string; color: string } {
  // Rank-1 is always green regardless of score (few competitors = high score even at top).
  if (rank === 1) return { text: score.toFixed(3), color: "text-forge-green" };
  if (score <= 0.80) return { text: score.toFixed(3), color: "text-forge-green" };
  if (score <= 0.95) return { text: score.toFixed(3), color: "text-forge-accent" };
  return { text: score.toFixed(3), color: "text-forge-muted" };
}

function fmtAvgRank(avg: number): { text: string; color: string } {
  if (avg <= 1.5) return { text: `#${avg.toFixed(1)}`, color: "text-forge-green" };
  if (avg <= 3.0) return { text: `#${avg.toFixed(1)}`, color: "text-forge-accent" };
  return { text: `#${avg.toFixed(1)}`, color: "text-forge-red" };
}

/** Breadth bar: fills proportionally to problems entered — more problems = wider bar. */
function ScoreBar({ specsEntered, totalSpecs }: { specsEntered: number; totalSpecs: number }) {
  const fill = totalSpecs > 0 ? Math.min(1, specsEntered / totalSpecs) : 0;
  // Color: green ≥50%, amber 20–49%, slate <20%
  const color = fill >= 0.5 ? "#22c55e" : fill >= 0.2 ? "#f59e0b" : "#64748b";
  return (
    <div>
      <div
        className="w-full bg-forge-border rounded-full h-1.5"
        title={`Coverage: ${specsEntered} of ${totalSpecs} problems entered. Unentered problems auto-score 1.0 (worst).`}
      >
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${Math.max(fill * 100, fill > 0 ? 2 : 0)}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-forge-muted mt-0.5">
        {specsEntered}/{totalSpecs} problems covered
      </div>
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
              {bests.length} problem{bests.length !== 1 ? "s" : ""}
              {wins > 0 && <span className="text-yellow-400 ml-1">· {wins} SOTA claim{wins !== 1 ? "s" : ""}</span>}
              <span className={`ml-1 font-mono ${bestRank === 1 ? "text-yellow-400" : ""}`}>#{bestRank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function EntryRow({ entry, specToRound, totalSpecs, onSelect }: {
  entry: OverallEntry;
  specToRound: Record<string, string>;
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
              {entry.specs_entered}/{totalSpecs} problem{entry.specs_entered !== 1 ? "s" : ""} entered
              {" · "}
              {entry.total_wins} SOTA claim{entry.total_wins !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {entry.overall_score !== undefined ? (() => {
              const { text, color } = fmtOverallScore(entry.overall_score, entry.rank);
              return (
                <>
                  <div className={`font-mono text-sm font-semibold ${color}`}>{text}</div>
                  <div className="text-xs text-forge-muted">score <span className="text-forge-muted/60">(↓ better)</span></div>
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

      <ScoreBar specsEntered={entry.specs_entered} totalSpecs={totalSpecs} />

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
          Click an agent to see their per-problem breakdown.
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

            totalSpecs={data.total_specs}
            onSelect={onSelectAgent}
          />
        ))
      )}
    </div>
  );
}
