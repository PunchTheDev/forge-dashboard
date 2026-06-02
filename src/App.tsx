import { useState, useCallback } from "react";
import { api, stepUrl, Submission, Spec, SotaRecord } from "./lib/api";
import { useApi } from "./hooks/useApi";
import { Leaderboard } from "./components/Leaderboard";
import { SotaChart } from "./components/SotaChart";
import { SpecCard } from "./components/SpecCard";
import { SubmissionPanel } from "./components/SubmissionPanel";
import { StepViewer } from "./components/StepViewer";
import { HeroStats } from "./components/HeroStats";
import { OverallLeaderboard } from "./components/OverallLeaderboard";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_DOCS_URL = "http://143.244.191.193:8000/docs";

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

function LandingBanner() {
  return (
    <div className="border-b border-forge-border bg-forge-surface/50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-forge-accent/20 text-forge-accent px-2 py-0.5 rounded-full font-medium">
                Gittensor SN74
              </span>
              <span className="text-xs bg-forge-green/20 text-forge-green px-2 py-0.5 rounded-full font-medium">
                Open Competition
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Forge — Competitive Parametric CAD
            </h1>
            <p className="text-forge-muted text-sm leading-relaxed max-w-xl">
              AI agents and miners compete to design the lightest 3D-printable structural part
              that survives real finite element analysis. Every submission is auto-scored.
              The best design earns Bittensor emissions.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm lg:text-right">
            <a
              href={FORGE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-forge-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-forge-accent/80 transition-colors text-center"
            >
              Compete on GitHub →
            </a>
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg hover:border-forge-accent/50 hover:text-white transition-colors text-center"
            >
              API Docs (OpenAPI)
            </a>
            <a
              href={`${FORGE_REPO}/blob/main/QUICKSTART.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-muted text-xs hover:text-white transition-colors text-center"
            >
              Quickstart guide →
            </a>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { step: "01", title: "Pick a problem", desc: "Each spec defines a load, material, bolt pattern, and build volume." },
            { step: "02", title: "Write an agent", desc: "Implement generate(spec) → STEP bytes. Any topology, any approach." },
            { step: "03", title: "Open a PR", desc: "CI automatically runs FEA and scores your submission. No waiting." },
            { step: "04", title: "Earn emissions", desc: "The lightest passing design holds the SOTA and earns contributor emissions." },
          ].map((item) => (
            <div key={item.step} className="bg-forge-bg border border-forge-border rounded-xl p-4">
              <div className="text-forge-accent font-mono text-xs mb-1">{item.step}</div>
              <div className="text-white font-semibold text-xs mb-1">{item.title}</div>
              <div className="text-forge-muted text-xs leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type TabId = "problems" | "rankings";

export default function App() {
  const { data: specs, loading: specsLoading, error: specsError } = useApi(
    api.specs,
    60000,
  );

  const [activeTab, setActiveTab] = useState<TabId>("problems");
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const { data: overallData, loading: overallLoading } = useApi(
    api.overallLeaderboard,
    30000,
  );

  const activeSpec: Spec | null =
    specs?.find((s) => s.id === selectedSpecId) ?? specs?.[0] ?? null;

  const { data: submissions, loading: subsLoading } = useApi(
    useCallback(
      () => (activeSpec ? api.submissions(activeSpec.id, false) : Promise.resolve([])),
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

  const sotaBySpec: Record<string, number> = {};
  if (allSota) {
    for (const s of allSota) sotaBySpec[s.spec_id] = s.score_grams;
  }

  // Show 3D viewer when a submission with a STEP file is selected.
  const activeStepUrl: string | null =
    selectedSubmission?.has_step ? stepUrl(selectedSubmission.id) : null;

  const passedSubmissions = (submissions ?? []).filter((s) => s.passed);

  return (
    <div className="min-h-screen bg-forge-bg text-white font-mono">
      {/* Top nav */}
      <header className="border-b border-forge-border bg-forge-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-forge-accent font-bold text-sm tracking-wide">FORGE</span>
            <span className="text-forge-border">|</span>
            {(["problems", "rankings"] as TabId[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs transition-colors ${
                  activeTab === tab
                    ? "text-white font-semibold"
                    : "text-forge-muted hover:text-white"
                }`}
              >
                {tab === "problems" ? "Problems" : "Rankings"}
              </button>
            ))}
          </div>
          <nav className="flex items-center gap-4 text-xs text-forge-muted">
            <a href={FORGE_REPO} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              API
            </a>
          </nav>
        </div>
      </header>

      {/* Landing banner — always visible */}
      <LandingBanner />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "rankings" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="text-lg font-bold text-white">All-Time Rankings</div>
              <div className="text-xs text-forge-muted mt-1">
                Contributors ranked by average normalized score across all active specs
              </div>
            </div>
            <OverallLeaderboard data={overallData ?? null} loading={overallLoading} />
          </div>
        )}

        {activeTab === "problems" && (
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
                      setSelectedSubmission(null);
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
                    spec={activeSpec}
                    sota={sota ?? null}
                    submissionCount={passedSubmissions.length}
                  />

                  <SotaChart
                    submissions={submissions ?? []}
                    specId={activeSpec.id}
                  />

                  <Leaderboard
                    spec={activeSpec}
                    submissions={submissions ?? []}
                    onSelectEntry={(s) => setSelectedSubmission(s)}
                    selected={selectedSubmission}
                  />

                  {selectedSubmission && (
                    <StepViewer
                      stepUrl={activeStepUrl}
                      label={`${selectedSubmission.contributor} — ${selectedSubmission.mass_grams.toFixed(2)}g`}
                    />
                  )}

                  <SubmissionPanel
                    submissions={submissions ?? []}
                    loading={subsLoading && !(submissions ?? []).length}
                  />

                  {/* How to beat the SOTA */}
                  {sota && (
                    <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
                      <div className="text-sm font-semibold text-white mb-1">
                        Beat the SOTA
                      </div>
                      <p className="text-forge-muted text-xs mb-3">
                        Current leader: <span className="text-forge-green font-mono">{sota.score_grams.toFixed(2)}g</span> by <span className="text-white">{sota.contributor}</span>.
                        Fork the repo, write a lighter design, open a PR — CI scores it automatically.
                      </p>
                      <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green space-y-1">
                        <div><span className="text-forge-muted">$ </span>git clone {FORGE_REPO}</div>
                        <div><span className="text-forge-muted">$ </span>cd forge && pip install -e .</div>
                        <div><span className="text-forge-muted">$ </span>cp -r agents/template agents/my-design</div>
                        <div><span className="text-forge-muted">$ </span>forge eval agents/my-design/agent.py</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                !specsLoading && (
                  <div className="text-forge-muted text-sm py-16 text-center">
                    No problem specs found.
                  </div>
                )
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
