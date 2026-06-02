import { useState, useCallback } from "react";
import { api, Submission, Spec, SotaRecord } from "./lib/api";
import { useApi } from "./hooks/useApi";
import { Leaderboard } from "./components/Leaderboard";
import { SotaChart } from "./components/SotaChart";
import { SpecCard } from "./components/SpecCard";
import { SubmissionPanel } from "./components/SubmissionPanel";
import { SubmissionJourney } from "./components/SubmissionJourney";
import { HeroStats } from "./components/HeroStats";
import { OverallLeaderboard } from "./components/OverallLeaderboard";
import { QuickstartGuide } from "./components/QuickstartGuide";
import { LiveEval } from "./components/LiveEval";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_DOCS_URL = "http://143.244.191.193:8000/docs";

function ApiError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-forge-red text-4xl mb-4 font-mono">!</div>
        <div className="text-white text-lg font-semibold mb-2">API unreachable</div>
        <div className="text-forge-muted text-sm mb-4 bg-forge-surface border border-forge-border rounded-lg p-3 font-mono text-left">
          {message}
        </div>
        <div className="text-forge-muted text-xs">
          The benchmark API at{" "}
          <code className="bg-forge-border px-1.5 py-0.5 rounded text-forge-accent">
            http://143.244.191.193:8000
          </code>{" "}
          is not responding. The competition is still live on{" "}
          <a href={FORGE_REPO} className="text-forge-accent hover:underline">GitHub</a>.
        </div>
      </div>
    </div>
  );
}

function LandingBanner({ totalSota }: { totalSota: SotaRecord[] }) {
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
              that survives real finite element analysis. Every submission is auto-scored by CI.
              The best design earns Bittensor emissions on Gittensor subnet 74.
            </p>
            {totalSota.filter((s) => !s.spec_id.startsWith("pub_")).length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4">
                {totalSota
                  .filter((s) => !s.spec_id.startsWith("pub_"))
                  .map((s) => (
                    <div key={s.spec_id} className="text-xs">
                      <span className="text-forge-muted">
                        {s.spec_id.replace(/^\d+_/, "").replace(/_/g, " ")}:{" "}
                      </span>
                      <span className="text-forge-green font-mono font-bold">{s.score_grams.toFixed(2)}g</span>
                      <span className="text-forge-muted"> SOTA</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 text-sm lg:text-right">
            <a
              href={FORGE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-forge-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-forge-accent/80 transition-colors text-center"
            >
              Fork and compete
            </a>
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-forge-border text-forge-muted px-4 py-2 rounded-lg hover:border-forge-accent/50 hover:text-white transition-colors text-center"
            >
              API docs
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { step: "01", title: "Pick a problem", desc: "Each spec defines load, material, bolt pattern, and build volume." },
            { step: "02", title: "Write an agent", desc: "Implement generate(spec) → STEP bytes. Any topology, any library." },
            { step: "03", title: "Open a PR", desc: "CI runs FEA and scores your submission automatically in ~2 min." },
            { step: "04", title: "Earn emissions", desc: "Lightest passing design holds SOTA and earns Bittensor TAO." },
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

type TabId = "problems" | "rankings" | "playground" | "guide";

function TabButton({ active, onClick, label }: { id: TabId; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs transition-colors ${
        active ? "text-white font-semibold" : "text-forge-muted hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

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

  const { data: allSota } = useApi<SotaRecord[]>(
    useCallback(() => api.sotaAll(), []),
    60000,
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

  if (specsError) return <ApiError message={specsError} />;

  const sotaBySpec: Record<string, number> = {};
  if (allSota) {
    for (const s of allSota) sotaBySpec[s.spec_id] = s.score_grams;
  }

  const passedSubmissions = (submissions ?? []).filter((s) => s.passed);

  return (
    <div className="min-h-screen bg-forge-bg text-white font-mono">
      <header className="border-b border-forge-border bg-forge-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-forge-accent font-bold text-sm tracking-wide">FORGE</span>
            <span className="text-forge-border">|</span>
            <TabButton id="problems" active={activeTab === "problems"} onClick={() => setActiveTab("problems")} label="Problems" />
            <TabButton id="rankings" active={activeTab === "rankings"} onClick={() => setActiveTab("rankings")} label="Rankings" />
            <TabButton id="playground" active={activeTab === "playground"} onClick={() => setActiveTab("playground")} label="Playground" />
            <TabButton id="guide" active={activeTab === "guide"} onClick={() => setActiveTab("guide")} label="Guide" />
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

      <LandingBanner totalSota={allSota ?? []} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "rankings" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="text-lg font-bold text-white">All-Time Rankings</div>
              <div className="text-xs text-forge-muted mt-1">
                Contributors ranked by normalized score across all active specs
              </div>
            </div>
            <OverallLeaderboard data={overallData ?? null} loading={overallLoading} />
          </div>
        )}

        {activeTab === "playground" && (
          <LiveEval specs={specs ?? []} />
        )}

        {activeTab === "guide" && (
          <QuickstartGuide />
        )}

        {activeTab === "problems" && (
          <div className="flex gap-6">
            <aside className="w-64 shrink-0 hidden lg:block">
              <div className="text-xs text-forge-muted font-semibold uppercase tracking-wider mb-3 px-1">
                Problems ({specs?.length ?? 0})
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

              {/* Miner CTA in sidebar */}
              <div className="mt-4 p-3 bg-forge-surface border border-forge-border rounded-xl">
                <div className="text-xs text-white font-semibold mb-1">New here?</div>
                <div className="text-xs text-forge-muted mb-2 leading-relaxed">
                  Design a lighter bracket, open a PR, and earn emissions.
                </div>
                <button
                  onClick={() => setActiveTab("guide")}
                  className="text-xs text-forge-accent hover:underline"
                >
                  See the guide →
                </button>
              </div>
            </aside>

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

                  {selectedSubmission && activeSpec && (
                    <SubmissionJourney
                      submission={selectedSubmission}
                      spec={activeSpec}
                      sota={sota ?? null}
                      onClose={() => setSelectedSubmission(null)}
                    />
                  )}

                  <SubmissionPanel
                    submissions={submissions ?? []}
                    loading={subsLoading && !(submissions ?? []).length}
                  />

                  {/* Beat the SOTA CTA */}
                  <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
                    <div className="text-sm font-semibold text-white mb-1">
                      Beat the SOTA
                    </div>
                    {sota ? (
                      <p className="text-forge-muted text-xs mb-3">
                        Current leader:{" "}
                        <span className="text-forge-green font-mono">{sota.score_grams.toFixed(2)}g</span>{" "}
                        by <span className="text-white">{sota.contributor}</span>.{" "}
                        Fork the repo, write a lighter design, open a PR — CI scores it automatically.
                      </p>
                    ) : (
                      <p className="text-forge-muted text-xs mb-3">
                        No submissions yet — be the first to set the SOTA for this problem.
                        Fork the repo and open a PR.
                      </p>
                    )}
                    <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green space-y-1">
                      <div><span className="text-forge-muted">$ </span>git clone {FORGE_REPO}</div>
                      <div><span className="text-forge-muted">$ </span>cd forge && pip install -e .</div>
                      <div><span className="text-forge-muted">$ </span>forge new my-design</div>
                      <div><span className="text-forge-muted">$ </span>forge eval agents/my-design/agent.py --spec {activeSpec.id.split("_")[0]}</div>
                    </div>
                  </div>
                </>
              ) : (
                !specsLoading && (
                  <div className="text-forge-muted text-sm py-16 text-center">
                    No problem specs found. The API may be unavailable.
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
