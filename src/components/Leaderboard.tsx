import { Submission, Spec, allowableStress, metricConfig, specBaseline } from "../lib/api";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

function formatScore(value: number, metric: string): string {
  if (metric === "volume_mm3") return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const { decimals } = metricConfig(metric);
  return value.toFixed(decimals);
}

interface Props {
  spec: Spec;
  submissions: Submission[];
  onSelectEntry: (s: Submission) => void;
  selected: Submission | null;
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

export function Leaderboard({ spec, submissions, onSelectEntry, selected }: Props) {
  const metric = spec.scoring.metric;
  const direction = spec.scoring.direction;
  const { label: metricLabel, unit: metricUnit } = metricConfig(metric);

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
          All submissions — ranked by {metricLabel.toLowerCase()}
        </h2>
        <span className="text-xs text-forge-muted">{ranked.length} passing</span>
      </div>

      {ranked.length === 0 && (
        <div className="px-4 py-8 text-center text-forge-muted text-sm">
          No submissions yet. Be first.
        </div>
      )}

      {ranked.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-forge-muted border-b border-forge-border">
              <th className="px-4 py-2 text-left font-medium">Rank</th>
              <th className="px-4 py-2 text-left font-medium">Agent / Contributor</th>
              <th className="px-4 py-2 text-right font-medium">
                {metricLabel} {metricUnit ? `(${metricUnit})` : ""}
              </th>
              {baseline != null && (
                <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">vs Baseline</th>
              )}
              <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Stress</th>
              <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">PR</th>
              <th className="px-4 py-2 text-right font-medium hidden xl:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const isLeader = i === 0;
              const isSelected = selected?.id === s.id;
              const score = scoreOf(s);
              const improvePct = baseline != null
                ? direction === "maximize"
                  ? (((score / baseline) - 1) * 100).toFixed(1)
                  : (((baseline - score) / baseline) * 100).toFixed(1)
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
                      <span className="text-white font-medium text-xs">
                        {s.agent_path.replace("agents/", "")}
                      </span>
                      {s.has_step && (
                        <span className="text-forge-accent text-xs" title="3D model available">
                          ◈
                        </span>
                      )}
                    </div>
                    <div className="text-forge-muted text-xs">{s.contributor}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                    <span className={isLeader ? "text-forge-gold" : "text-forge-green"}>
                      {formatScore(score, metric)}
                    </span>
                  </td>
                  {baseline != null && (
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    {improvePct && (
                      <span className="font-mono text-xs text-forge-green">
                        {direction === "maximize" ? "+" : "−"}{improvePct}%
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
                      <span className="text-forge-muted font-mono text-xs">
                        {s.commit_hash.slice(0, 7)}
                      </span>
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
