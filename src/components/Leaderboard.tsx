import { api, LeaderboardEntry, Spec } from "../lib/api";
import { useApi } from "../hooks/useApi";

interface Props {
  spec: Spec;
  onSelectEntry: (entry: LeaderboardEntry) => void;
  selected: LeaderboardEntry | null;
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-forge-gold font-bold">1st</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold">2nd</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">3rd</span>;
  return <span className="text-forge-muted">{rank}th</span>;
}

function StressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct < 60 ? "bg-forge-green" : pct < 85 ? "bg-yellow-500" : "bg-forge-red";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-forge-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-forge-muted tabular-nums">
        {value.toFixed(1)}/{max.toFixed(0)}
      </span>
    </div>
  );
}

export function Leaderboard({ spec, onSelectEntry, selected }: Props) {
  const { data: entries, loading, error, refresh } = useApi(
    () => api.leaderboard(spec.id),
    15000,
  );

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border">
        <h2 className="text-sm font-semibold text-white">Leaderboard</h2>
        <button
          onClick={refresh}
          className="text-xs text-forge-muted hover:text-white transition-colors"
        >
          refresh
        </button>
      </div>

      {loading && !entries && (
        <div className="px-4 py-8 text-center text-forge-muted text-sm">Loading…</div>
      )}

      {error && (
        <div className="px-4 py-4 text-forge-red text-sm">
          API unavailable — {error}
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="px-4 py-8 text-center text-forge-muted text-sm">
          No submissions yet. Be first.
        </div>
      )}

      {entries && entries.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-forge-muted border-b border-forge-border">
              <th className="px-4 py-2 text-left font-medium">Rank</th>
              <th className="px-4 py-2 text-left font-medium">Contributor</th>
              <th className="px-4 py-2 text-right font-medium">Mass (g)</th>
              <th className="px-4 py-2 text-left font-medium">Stress</th>
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Commit</th>
              <th className="px-4 py-2 text-right font-medium hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.submission_id}
                onClick={() => onSelectEntry(e)}
                className={`border-b border-forge-border/40 cursor-pointer transition-colors hover:bg-forge-border/30 ${
                  selected?.submission_id === e.submission_id
                    ? "bg-forge-accent/10 border-l-2 border-l-forge-accent"
                    : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono">
                  <Medal rank={e.rank} />
                </td>
                <td className="px-4 py-2.5 text-white font-medium">{e.contributor}</td>
                <td className="px-4 py-2.5 text-right font-mono text-forge-green font-semibold tabular-nums">
                  {e.mass_g.toFixed(2)}
                </td>
                <td className="px-4 py-2.5">
                  <StressBar value={e.max_stress_mpa} max={spec.max_stress_mpa} />
                </td>
                <td className="px-4 py-2.5 font-mono text-forge-muted hidden md:table-cell text-xs">
                  {e.commit_hash.slice(0, 7)}
                </td>
                <td className="px-4 py-2.5 text-forge-muted text-xs hidden lg:table-cell text-right">
                  {new Date(e.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
