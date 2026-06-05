import { Link } from "react-router-dom";
import { Submission, metricConfig, submissionCodeUrl } from "../lib/api";

interface Props {
  submissions: Submission[];
  loading: boolean;
  onSelect?: (s: Submission) => void;
}

function StatusBadge({ passed }: { passed: boolean }) {
  if (passed)
    return (
      <span className="text-xs bg-forge-green/20 text-forge-green px-2 py-0.5 rounded-full">
        passed
      </span>
    );
  return (
    <span className="text-xs bg-forge-red/20 text-forge-red px-2 py-0.5 rounded-full">
      failed
    </span>
  );
}

const SHOW_LIMIT = 20;

export function SubmissionPanel({ submissions, loading, onSelect }: Props) {
  const sorted = [...submissions]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  const recent = sorted.slice(0, SHOW_LIMIT);
  const hasMore = sorted.length > SHOW_LIMIT;

  const passedCount = sorted.filter((s) => s.passed).length;
  const failedCount = sorted.length - passedCount;

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">All submissions</h2>
        <span className="text-xs text-forge-muted">
          {sorted.length === 0 ? "none yet" : hasMore
            ? `showing ${SHOW_LIMIT} of ${sorted.length}`
            : <>
                <span className="text-forge-green">{passedCount} passed</span>
                {failedCount > 0 && <span className="text-forge-muted"> · {failedCount} failed</span>}
              </>}
        </span>
      </div>

      {loading && !submissions.length && (
        <div className="divide-y divide-forge-border/40 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <div className="h-4 w-12 bg-forge-border/50 rounded-full" />
              <div className="h-3 w-20 bg-forge-border/50 rounded" />
              <div className="h-3 w-16 bg-forge-border/40 rounded ml-1" />
              <div className="ml-auto h-3 w-24 bg-forge-border/30 rounded hidden md:block" />
            </div>
          ))}
        </div>
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
            <StatusBadge passed={s.passed} />
            <Link
              to={`/rankings/${encodeURIComponent(s.contributor)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-white text-sm font-medium shrink-0 hover:text-forge-accent hover:underline"
              title={`View ${s.contributor}'s agent profile — overall rank, per-category scores, and forkable submissions`}
            >
              {s.contributor}
            </Link>
            {s.passed ? (() => {
              const v = s.score ?? s.mass_grams;
              const { unit, decimals } = metricConfig(s.score_metric);
              return (
                <span className="font-mono text-forge-green text-sm tabular-nums shrink-0">
                  {v.toFixed(decimals)} {unit}
                </span>
              );
            })() : (() => {
              const failMatch = s.notes?.match(/\| fail \[(\w+)\]: (.+)$/);
              const failReason = failMatch?.[2] ?? s.notes ?? undefined;
              const display = failReason ? failReason : onSelect ? "see details →" : null;
              return display ? (
                <span
                  className="text-forge-muted text-xs truncate max-w-[160px]"
                  title={failReason ?? "Click row for failure details"}
                >
                  {display}
                </span>
              ) : null;
            })()}
            <a
              href={submissionCodeUrl(s.agent_path, s.commit_hash)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-forge-muted hover:text-forge-accent hover:underline text-xs shrink-0 hidden sm:block"
              title={`View ${s.agent_path} at this commit on GitHub`}
            >
              {s.commit_hash.slice(0, 7)}
            </a>
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
