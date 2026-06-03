import { Submission, metricConfig } from "../lib/api";

interface Props {
  submissions: Submission[];
  loading: boolean;
  onSelect?: (s: Submission) => void;
}

function StatusBadge({ passed, notes }: { passed: boolean; notes: string | null }) {
  if (passed)
    return (
      <span className="text-xs bg-forge-green/20 text-forge-green px-2 py-0.5 rounded-full">
        passed
      </span>
    );
  return (
    <span
      title={notes ?? "failed"}
      className="text-xs bg-forge-red/20 text-forge-red px-2 py-0.5 rounded-full"
    >
      failed
    </span>
  );
}

export function SubmissionPanel({ submissions, loading, onSelect }: Props) {
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 20);

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border">
        <h2 className="text-sm font-semibold text-white">Recent submissions</h2>
      </div>

      {loading && !submissions.length && (
        <div className="px-4 py-6 text-center text-forge-muted text-sm">Loading…</div>
      )}

      {!loading && recent.length === 0 && (
        <div className="px-4 py-6 text-center text-forge-muted text-sm">
          No submissions yet.
        </div>
      )}

      <div className="divide-y divide-forge-border/40">
        {recent.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect?.(s)}
            className={`px-4 py-2.5 flex items-center gap-3${onSelect ? " cursor-pointer hover:bg-forge-border/20 transition-colors" : ""}`}
          >
            <StatusBadge passed={s.passed} notes={s.notes} />
            <span className="text-white text-sm font-medium shrink-0">{s.contributor}</span>
            {s.passed && (() => {
              const v = s.score ?? s.mass_grams;
              const { unit, decimals } = metricConfig(s.score_metric);
              return (
                <span className="font-mono text-forge-green text-sm tabular-nums shrink-0">
                  {v.toFixed(decimals)} {unit}
                </span>
              );
            })()}
            <span className="font-mono text-forge-muted text-xs shrink-0 hidden sm:block">
              {s.commit_hash.slice(0, 7)}
            </span>
            <span className="text-forge-muted text-xs ml-auto shrink-0 hidden md:block">
              {new Date(s.submitted_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
