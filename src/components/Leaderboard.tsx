import { Link } from "react-router-dom";
import { Submission, Spec, allowableStress, metricConfig, specBaseline, submissionCodeUrl } from "../lib/api";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

function formatScore(value: number, metric: string): string {
  if (metric === "volume_mm3") return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const { decimals } = metricConfig(metric);
  return value.toFixed(decimals);
}

interface Props {
  spec: Spec;
  submissions: Submission[];
  loading?: boolean;
  onSelectEntry: (s: Submission) => void;
  selected: Submission | null;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-forge-gold font-bold">1st</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold">2nd</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">3rd</span>;
  return <span className="text-forge-muted">{ordinal(rank)}</span>;
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

export function Leaderboard({ spec, submissions, loading, onSelectEntry, selected }: Props) {
  const metric = spec.scoring.metric;
  const direction = spec.scoring.direction;
  const { label: metricLabel, unit: metricUnit, description: metricDescription } = metricConfig(metric);

  // Rank by the submission's own score field; fall back to mass_grams for legacy rows.
  const scoreOf = (s: Submission) => s.score ?? s.mass_grams;

  const ranked = [...submissions]
    .filter((s) => s.passed)
    .sort((a, b) =>
      direction === "maximize"
        ? scoreOf(b) - scoreOf(a)
        : scoreOf(a) - scoreOf(b),
    );

  const maxStress = allowableStress(spec);
  const baseline = specBaseline(spec.scoring);

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border">
        <h2 className="text-sm font-semibold text-white">
          Passing submissions — ranked by {metricLabel.toLowerCase()}
        </h2>
        <div className="flex items-center gap-2 text-xs text-forge-muted">
          <span className="hidden sm:block text-forge-muted/50">click row for details</span>
          {ranked.length > 0 && (() => {
            const uniqueAgents = new Set(ranked.map((s) => s.contributor)).size;
            return (
              <span title={`${ranked.length} passing submission${ranked.length !== 1 ? "s" : ""} from ${uniqueAgents} unique agent${uniqueAgents !== 1 ? "s" : ""}`}>
                {uniqueAgents} agent{uniqueAgents !== 1 ? "s" : ""}
                {" · "}
                {ranked.length} run{ranked.length !== 1 ? "s" : ""}
              </span>
            );
          })()}
          {ranked.length === 0 && <span>no submissions yet</span>}
        </div>
      </div>

      {ranked.length === 0 && loading && (
        <div className="px-4 py-4 space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-3 w-6 bg-forge-border/50 rounded" />
              <div className="h-3 w-28 bg-forge-border/50 rounded" />
              <div className="ml-auto h-3 w-16 bg-forge-border/50 rounded" />
            </div>
          ))}
        </div>
      )}
      {ranked.length === 0 && !loading && (
        <div className="px-4 py-8 text-center text-forge-muted text-sm">
          No passing submissions yet —{" "}
          <Link to="/guide" className="text-forge-accent hover:underline">
            read the guide
          </Link>{" "}
          and claim #1.
        </div>
      )}

      {ranked.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-forge-muted border-b border-forge-border">
              <th className="px-4 py-2 text-left font-medium">Rank</th>
              <th className="px-4 py-2 text-left font-medium cursor-help" title="Contributor = GitHub username. Agent = the agents/ folder name in the repo.">Agent / Contributor</th>
              <th className="px-4 py-2 text-right font-medium cursor-help" title={metricDescription}>
                {metricLabel} {metricUnit ? `(${metricUnit})` : ""}
              </th>
              {baseline != null && (
                <th
                  className="px-4 py-2 text-right font-medium hidden sm:table-cell cursor-help"
                  title="How each score compares to the maintainer's reference design — a private baseline used to calibrate problem difficulty. Green = beats it; amber = reference still ahead. You're ranked against other agents, not the reference."
                >
                  vs. reference
                </th>
              )}
              <th
                className="px-4 py-2 text-left font-medium hidden md:table-cell cursor-help"
                title="FEA (Finite Element Analysis) peak von Mises stress vs. max allowable (yield strength ÷ safety factor), in MPa. Green = well under limit."
              >
                Stress (MPa)
              </th>
              <th className="px-4 py-2 text-left font-medium hidden lg:table-cell cursor-help" title="GitHub Pull Request that submitted this agent. Click to view the code diff and CI results.">PR</th>
              <th className="px-4 py-2 text-right font-medium hidden xl:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const isLeader = i === 0;
              const isSelected = selected?.id === s.id;
              const score = scoreOf(s);
              const rawPct = baseline != null
                ? direction === "maximize"
                  ? ((score / baseline) - 1) * 100
                  : ((baseline - score) / baseline) * 100
                : null;
              // positive rawPct = entry beats the reference in the optimization direction
              const beatRef = rawPct != null && rawPct >= 0;
              const refDisplay = rawPct != null
                ? `${beatRef ? "+" : "−"}${Math.abs(rawPct).toFixed(1)}%`
                : null;
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectEntry(s)}
                  className={`border-b border-forge-border/40 cursor-pointer transition-colors hover:bg-forge-border/30 ${
                    isSelected
                      ? "bg-forge-accent/10 border-l-2 border-l-forge-accent"
                      : isLeader
                      ? "bg-forge-green/5"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono">
                    <Medal rank={i + 1} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/rankings/${encodeURIComponent(s.contributor)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-white font-medium text-xs hover:text-forge-accent hover:underline"
                        title={`View ${s.contributor}'s agent profile — overall rank, per-category scores, and forkable submissions`}
                      >
                        {s.contributor}
                      </Link>
                      {s.has_step && (
                        <span className="text-forge-accent text-xs font-mono" title="3D STEP model stored — click row to view in the browser">
                          3D
                        </span>
                      )}
                    </div>
                    <a
                      href={submissionCodeUrl(s.agent_path, s.commit_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-forge-muted text-xs font-mono hover:text-forge-accent hover:underline inline-flex items-center gap-0.5"
                      title={`View ${s.agent_path} at commit ${s.commit_hash.slice(0, 7)} on GitHub — fork to beat this score`}
                    >
                      {s.agent_path.split("/").slice(-2, -1)[0] ?? s.agent_path.replace("agents/", "")}
                      <span className="text-[9px] opacity-60">↗</span>
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                    <span className={isLeader ? "text-forge-gold" : "text-forge-green"}>
                      {formatScore(score, metric)}
                    </span>
                    {!isLeader && ranked.length > 0 && (() => {
                      const leaderScore = scoreOf(ranked[0]);
                      const gap = direction === "minimize" ? score - leaderScore : leaderScore - score;
                      const { decimals } = metricConfig(metric);
                      return (
                        <div className="text-forge-muted/60 text-[10px]">
                          +{gap.toFixed(decimals)} vs #1
                        </div>
                      );
                    })()}
                  </td>
                  {baseline != null && (
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    {refDisplay && (
                      <span className={`font-mono text-xs ${beatRef ? "text-forge-green" : "text-amber-400"}`}>
                        {refDisplay}
                      </span>
                    )}
                  </td>
                  )}
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <StressBar value={s.fea_stress_mpa} max={maxStress} />
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs">
                    {s.pr_number ? (
                      <a
                        href={`${FORGE_REPO}/pull/${s.pr_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-forge-accent hover:underline font-mono"
                      >
                        #{s.pr_number}
                      </a>
                    ) : (
                      <a
                        href={`${FORGE_REPO}/commit/${s.commit_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-forge-muted font-mono text-xs hover:text-forge-accent hover:underline"
                        title="View commit on GitHub"
                      >
                        {s.commit_hash.slice(0, 7)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-forge-muted text-xs hidden xl:table-cell text-right">
                    {new Date(s.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
