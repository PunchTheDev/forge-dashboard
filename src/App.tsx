import { useState, useCallback } from "react";
import { api, LeaderboardEntry, Spec, SotaRecord } from "./lib/api";
import { useApi } from "./hooks/useApi";
import { Leaderboard } from "./components/Leaderboard";
import { SotaChart } from "./components/SotaChart";
import { SpecCard } from "./components/SpecCard";
import { SubmissionPanel } from "./components/SubmissionPanel";
import { StepViewer } from "./components/StepViewer";
import { HeroStats } from "./components/HeroStats";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";

function ApiError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-forge-red text-4xl mb-4">⚠</div>
        <div className="text-white text-lg font-semibold mb-2">API unreachable</div>
        <div className="text-forge-muted text-sm mb-4">{message}</div>
        <div className="text-forge-muted text-xs">
          Start forge-api with{" "}
          <code className="bg-forge-border px-1.5 py-0.5 rounded">
            docker-compose up
          </code>{" "}
          or set{" "}
          <code className="bg-forge-border px-1.5 py-0.5 rounded">VITE_API_URL</code>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { data: specs, loading: specsLoading, error: specsError } = useApi(
    api.specs,
    60000,
  );

  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  const activeSpec: Spec | null =
    specs?.find((s) => s.id === selectedSpecId) ?? specs?.[0] ?? null;

  const { data: submissions, loading: subsLoading } = useApi(
    useCallback(
      () => (activeSpec ? api.submissions(activeSpec.id) : Promise.resolve([])),
      [activeSpec],
    ),
    15000,
  );

  const { data: sota } = useApi<SotaRecord | null>(
    useCallback(
      () =>
        activeSpec
          ? api.sota(activeSpec.id).catch(() => null)
          : Promise.resolve(null),
      [activeSpec],
    ),
    15000,
  );

  const { data: allSota } = useApi<SotaRecord[]>(
    useCallback(() => api.sotaAll(), []),
    60000,
  );

  if (specsError) return <ApiError message={specsError} />;

  // Build spec -> sota map for sidebar
  const sotaBySpec: Record<string, number> = {};
  if (allSota) {
    for (const s of allSota) sotaBySpec[s.spec_id] = s.mass_g;
  }

  // STEP URL: in future, forge-api will serve /submissions/{id}/step
  // For now we show the viewer only when a step URL is actually available
  const stepUrl: string | null = null; // TODO: wire when API endpoint added

  return (
    <div className="min-h-screen bg-forge-bg text-white font-mono">
      {/* Top nav */}
      <header className="border-b border-forge-border bg-forge-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-forge-accent font-bold text-sm tracking-wide">FORGE</span>
            <span className="text-forge-border">|</span>
            <span className="text-forge-muted text-xs">Gittensor SN74</span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-forge-muted">
            <a
              href={FORGE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href={`${FORGE_REPO}#contributing`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Contribute
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar: spec selector */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="text-xs text-forge-muted font-semibold uppercase tracking-wider mb-3 px-1">
              Problems
            </div>
            {specsLoading && !specs && (
              <div className="text-forge-muted text-sm px-1">Loading…</div>
            )}
            <div className="flex flex-col gap-2">
              {specs?.map((spec) => (
                <SpecCard
                  key={spec.id}
                  spec={spec}
                  sotaMass={sotaBySpec[spec.id]}
                  isSelected={activeSpec?.id === spec.id}
                  onClick={() => {
                    setSelectedSpecId(spec.id);
                    setSelectedEntry(null);
                  }}
                />
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 flex flex-col gap-5">
            {activeSpec ? (
              <>
                <HeroStats
                  sota={sota ?? null}
                  submissionCount={submissions?.length ?? 0}
                  specName={activeSpec.name}
                />

                <SotaChart
                  submissions={submissions ?? []}
                  specId={activeSpec.id}
                />

                <Leaderboard
                  spec={activeSpec}
                  onSelectEntry={(e) => setSelectedEntry(e)}
                  selected={selectedEntry}
                />

                {selectedEntry && (
                  <StepViewer
                    stepUrl={stepUrl}
                    label={`${selectedEntry.contributor} — ${selectedEntry.mass_g.toFixed(2)}g`}
                  />
                )}

                <SubmissionPanel
                  submissions={submissions ?? []}
                  loading={subsLoading && !(submissions ?? []).length}
                />

                {/* Reproduce button */}
                {sota && (
                  <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
                    <div className="text-sm font-semibold text-white mb-2">
                      Reproduce SOTA
                    </div>
                    <p className="text-forge-muted text-xs mb-3">
                      Run the current best locally and verify the score matches.
                    </p>
                    <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green space-y-1">
                      <div>
                        <span className="text-forge-muted">$ </span>git clone{" "}
                        {FORGE_REPO}
                      </div>
                      <div>
                        <span className="text-forge-muted">$ </span>cd forge
                      </div>
                      <div>
                        <span className="text-forge-muted">$ </span>git checkout{" "}
                        {sota.commit_hash.slice(0, 7)}
                      </div>
                      <div>
                        <span className="text-forge-muted">$ </span>python cli.py
                        eval agents/sota/agent.py
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-forge-muted">
                      Expected:{" "}
                      <span className="text-forge-green font-mono">
                        {sota.mass_g.toFixed(2)}g
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              !specsLoading && (
                <div className="text-forge-muted text-sm py-16 text-center">
                  No problem specs found. Start forge-api and seed the database.
                </div>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
