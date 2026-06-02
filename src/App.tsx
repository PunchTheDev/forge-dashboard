import { useState, useCallback, useMemo } from "react";
import { api, Submission, Spec, SotaRecord, Round, stepUrl, fmtScore } from "./lib/api";
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
import { StepViewer } from "./components/StepViewer";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_DOCS_URL = "http://143.244.191.193:8000/docs";

const CATEGORY_META: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  round_001: { icon: "⚖", color: "text-forge-green", bgColor: "bg-forge-green/10", borderColor: "border-forge-green/40" },
  round_002: { icon: "⟳", color: "text-forge-accent", bgColor: "bg-forge-accent/10", borderColor: "border-forge-accent/40" },
  round_003: { icon: "↕", color: "text-forge-red",    bgColor: "bg-forge-red/10",    borderColor: "border-forge-red/40" },
};

const TIER_COLORS: Record<string, string> = {
  easy:   "text-forge-green",
  medium: "text-forge-accent",
  hard:   "text-forge-red",
};

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
          Benchmark API at{" "}
          <code className="bg-forge-border px-1.5 py-0.5 rounded text-forge-accent">
            http://143.244.191.193:8000
          </code>{" "}
          is not responding. Competition is still live on{" "}
          <a href={FORGE_REPO} className="text-forge-accent hover:underline">GitHub</a>.
        </div>
      </div>
    </div>
  );
}

/** Landing hero — focused on agent well-roundedness. */
function LandingBanner({ activeRounds }: { activeRounds: Round[] }) {
  const totalSpecs = activeRounds.reduce((n, r) => n + r.specs.length, 0);
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
              Build the best well-rounded CAD optimization agent. Your agent is evaluated across{" "}
              <span className="text-white font-semibold">{totalSpecs || "45"} problems</span> spanning
              three optimization categories — mass, stiffness-to-weight, and absolute stiffness.
              Top agent across all categories earns Bittensor TAO via Gittensor subnet 74.
            </p>

            {/* Category pills */}
            {activeRounds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {activeRounds.map((r) => {
                  const meta = CATEGORY_META[r.id] ?? { icon: "·", color: "text-forge-muted", bgColor: "bg-forge-surface", borderColor: "border-forge-border" };
                  return (
                    <div key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${meta.bgColor} ${meta.borderColor}`}>
                      <span className={`text-sm ${meta.color}`}>{meta.icon}</span>
                      <span className="text-xs font-medium text-white">{r.name.replace(/Round \d+ — /, "")}</span>
                      <span className="text-xs text-forge-muted font-mono">{r.specs.length} specs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 text-sm">
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

        {/* How it works */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { step: "01", title: "Pick a category", desc: "Three optimization axes: mass, stiffness-to-weight, and absolute stiffness." },
            { step: "02", title: "Write an agent", desc: "Implement generate(spec, llm) → STEP bytes. Any topology, any approach." },
            { step: "03", title: "Open a PR", desc: "CI runs FEA on a random pool of specs and scores your agent automatically." },
            { step: "04", title: "Earn emissions", desc: "Best overall agent across all categories earns Bittensor TAO rewards." },
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

/** Category overview card — click to browse specs in that round. */
function CategoryCard({ round, sotaBySpec, onSelect }: {
  round: Round;
  sotaBySpec: Record<string, number>;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[round.id] ?? { icon: "·", color: "text-forge-muted", bgColor: "bg-forge-surface", borderColor: "border-forge-border" };
  const tiers = ["easy", "medium", "hard"];
  const tierCounts = Object.fromEntries(
    tiers.map((t) => [t, round.specs.filter((s) => s.tier === t).length]),
  );
  const sotaCount = round.specs.filter((s) => sotaBySpec[s.id] !== undefined).length;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-5 rounded-xl border transition-all hover:border-opacity-80 hover:scale-[1.01] active:scale-[0.99] ${meta.bgColor} ${meta.borderColor} border`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className={`text-2xl mb-2`}>{meta.icon}</div>
          <div className="text-white font-bold text-sm">{round.name.replace(/Round \d+ — /, "")}</div>
          <div className="text-forge-muted text-xs mt-0.5 leading-relaxed max-w-xs">
            {round.description}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xs font-mono font-semibold px-2 py-1 rounded ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}>
            {round.scoring_direction === "minimize" ? "↓ minimize" : "↑ maximize"}
          </div>
          <div className="text-forge-muted text-xs font-mono mt-1">{round.scoring_metric}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex gap-3">
          {tiers.filter((t) => tierCounts[t] > 0).map((t) => (
            <span key={t} className={`text-xs font-mono ${TIER_COLORS[t]}`}>
              {tierCounts[t]} {t}
            </span>
          ))}
        </div>
        <span className="text-forge-border">·</span>
        <span className="text-xs text-forge-muted">
          {sotaCount}/{round.specs.length} solved
        </span>
        <span className="ml-auto text-xs text-forge-accent font-medium">Browse →</span>
      </div>
    </button>
  );
}

/** Sidebar spec list within a category, grouped by tier. */
function CategorySpecList({
  round,
  specs,
  sotaBySpec,
  selectedTier,
  onTierChange,
  activeSpecId,
  onSelectSpec,
}: {
  round: Round;
  specs: Spec[];
  sotaBySpec: Record<string, number>;
  selectedTier: string | null;
  onTierChange: (tier: string | null) => void;
  activeSpecId: string | null;
  onSelectSpec: (specId: string) => void;
}) {
  const roundSpecIds = new Set(round.specs.map((s) => s.id));
  const tierMap = Object.fromEntries(round.specs.map((s) => [s.id, s.tier]));

  const visibleSpecs = specs.filter((s) => {
    if (!roundSpecIds.has(s.id)) return false;
    if (selectedTier && tierMap[s.id] !== selectedTier) return false;
    return true;
  });

  const tiers = ["easy", "medium", "hard"].filter((t) => round.specs.some((s) => s.tier === t));

  return (
    <div className="flex flex-col gap-3">
      {/* Tier filter */}
      <div className="flex items-center gap-1 text-xs">
        <button
          onClick={() => onTierChange(null)}
          className={`px-2.5 py-1 rounded-lg transition-colors ${!selectedTier ? "bg-forge-accent text-white font-semibold" : "text-forge-muted hover:text-white"}`}
        >
          All
        </button>
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => onTierChange(t)}
            className={`px-2.5 py-1 rounded-lg transition-colors capitalize ${selectedTier === t ? `${TIER_COLORS[t]} font-semibold bg-forge-surface` : "text-forge-muted hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="text-xs text-forge-muted px-1">
        {visibleSpecs.length} spec{visibleSpecs.length !== 1 ? "s" : ""}
      </div>

      {visibleSpecs.map((spec) => (
        <SpecCard
          key={spec.id}
          spec={spec}
          sotaMass={sotaBySpec[spec.id]}
          isSelected={activeSpecId === spec.id}
          onClick={() => onSelectSpec(spec.id)}
        />
      ))}
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
  const { data: specs, loading: specsLoading, error: specsError } = useApi(api.specs, 60000);

  const [activeTab, setActiveTab] = useState<TabId>("problems");
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const { data: overallData, loading: overallLoading } = useApi(api.overallLeaderboard, 30000);

  const { data: allSota } = useApi<SotaRecord[]>(
    useCallback(() => api.sotaAll(), []),
    60000,
  );

  const { data: allRounds } = useApi<Round[]>(
    useCallback(() => api.activeRounds().catch(() => []), []),
    300000,
  );

  const activeRounds = allRounds ?? [];

  // Map spec_id → sota score and tier from rounds data
  const sotaBySpec = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allSota ?? []) map[s.spec_id] = s.score;
    return map;
  }, [allSota]);

  // Derive active spec — when category changes, auto-select first spec in that category
  const categorySpecs = useMemo(() => {
    if (!specs || !selectedRoundId) return specs ?? [];
    const round = activeRounds.find((r) => r.id === selectedRoundId);
    if (!round) return specs;
    const roundIds = new Set(round.specs.map((s) => s.id));
    return specs.filter((s) => roundIds.has(s.id));
  }, [specs, selectedRoundId, activeRounds]);

  const activeSpec: Spec | null =
    specs?.find((s) => s.id === selectedSpecId) ?? null;

  const { data: submissions, loading: subsLoading } = useApi(
    useCallback(
      () => (activeSpec ? api.submissions(activeSpec.id, false) : Promise.resolve([])),
      [activeSpec],
    ),
    15000,
  );

  const { data: sota } = useApi<SotaRecord | null>(
    useCallback(
      () => activeSpec ? api.sota(activeSpec.id).catch(() => null) : Promise.resolve(null),
      [activeSpec],
    ),
    15000,
  );

  const passedSubmissions = (submissions ?? []).filter((s) => s.passed);

  function selectCategory(roundId: string) {
    setSelectedRoundId(roundId);
    setSelectedTier(null);
    setSelectedSpecId(null);
    setSelectedSubmission(null);
  }

  function clearCategory() {
    setSelectedRoundId(null);
    setSelectedTier(null);
    setSelectedSpecId(null);
    setSelectedSubmission(null);
  }

  if (specsError) return <ApiError message={specsError} />;

  const selectedRound = activeRounds.find((r) => r.id === selectedRoundId) ?? null;

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

      <LandingBanner activeRounds={activeRounds} />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Rankings ── */}
        {activeTab === "rankings" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="text-lg font-bold text-white">Agent Rankings</div>
              <div className="text-xs text-forge-muted mt-1 leading-relaxed">
                Agents ranked by normalized performance across all active problem categories.
                A well-rounded agent that excels at mass, stiffness-to-weight, <em>and</em> absolute
                stiffness scores highest — not just a specialist in one metric.
              </div>
            </div>
            <OverallLeaderboard data={overallData ?? null} loading={overallLoading} rounds={activeRounds} />
          </div>
        )}

        {/* ── Playground ── */}
        {activeTab === "playground" && (
          <LiveEval specs={specs ?? []} />
        )}

        {/* ── Guide ── */}
        {activeTab === "guide" && (
          <QuickstartGuide />
        )}

        {/* ── Problems ── */}
        {activeTab === "problems" && (
          <>
            {/* Category overview */}
            {!selectedRoundId && (
              <div>
                <div className="mb-5">
                  <div className="text-lg font-bold text-white">Problem Categories</div>
                  <div className="text-xs text-forge-muted mt-1 leading-relaxed max-w-2xl">
                    Each category is an independent optimization axis. A submitted agent is evaluated
                    across all categories — pick a category below to explore the problem pool and
                    train on individual specs via the API or CLI.
                  </div>
                </div>

                {/* Category grid */}
                {specsLoading && !activeRounds.length ? (
                  <div className="text-forge-muted text-sm py-8">Loading categories…</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {activeRounds.map((r) => (
                      <CategoryCard
                        key={r.id}
                        round={r}
                        sotaBySpec={sotaBySpec}
                        onSelect={() => selectCategory(r.id)}
                      />
                    ))}
                  </div>
                )}

                {/* SOTA Gallery — specs with winning 3D STEP designs */}
                {(allSota ?? []).some((s) => s.has_step) && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-sm font-semibold text-white">Top Solutions</div>
                      <span className="text-xs text-forge-muted">— view winning 3D designs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(allSota ?? [])
                        .filter((s) => s.has_step)
                        .slice(0, 4)
                        .map((sota) => {
                          const spec = specs?.find((sp) => sp.id === sota.spec_id);
                          return (
                            <button
                              key={sota.spec_id}
                              onClick={() => {
                                setSelectedSpecId(sota.spec_id);
                                setSelectedRoundId(null);
                                setSelectedSubmission(null);
                              }}
                              className="text-left p-4 bg-forge-surface border border-forge-border rounded-xl hover:border-forge-accent/50 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-forge-green/20 text-forge-green px-1.5 py-0.5 rounded font-mono">3D</span>
                                <span className="text-xs text-forge-muted font-mono">{sota.spec_id}</span>
                              </div>
                              <div className="text-xs font-semibold text-white mb-1 leading-snug line-clamp-2">
                                {spec?.name ?? sota.spec_id}
                              </div>
                              <div className="text-xs text-forge-muted mt-2">
                                <span className="text-forge-green font-mono font-semibold">
                                  {fmtScore(sota.score, sota.score_metric)}
                                </span>
                                {" "}by <span className="text-white">{sota.contributor}</span>
                              </div>
                              <div className="text-xs text-forge-accent mt-1.5">View 3D →</div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Open Challenges — rounds with no SOTA submissions yet */}
                {activeRounds.length > 0 && (() => {
                  const solvedRoundIds = new Set(
                    (allSota ?? []).map((s) => {
                      const round = activeRounds.find((r) => r.specs.some((sp) => sp.id === s.spec_id));
                      return round?.id;
                    }).filter(Boolean)
                  );
                  const openRounds = activeRounds.filter((r) => !solvedRoundIds.has(r.id));
                  if (!openRounds.length) return null;
                  return (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-sm font-semibold text-white">Open Challenges</div>
                        <span className="text-xs text-forge-accent font-mono">unclaimed — be first</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {openRounds.map((r) => {
                          const meta = CATEGORY_META[r.id] ?? { icon: "·", color: "text-forge-muted", bgColor: "bg-forge-surface", borderColor: "border-forge-border" };
                          return (
                            <button
                              key={r.id}
                              onClick={() => selectCategory(r.id)}
                              className={`text-left p-5 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01] active:scale-[0.99] ${meta.borderColor} ${meta.bgColor} hover:border-opacity-80`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>
                                  {r.name.replace(/Round \d+ — /, "")}
                                </div>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}>
                                  {r.scoring_direction === "minimize" ? "↓" : "↑"} {r.scoring_metric}
                                </span>
                              </div>
                              <div className="text-forge-muted text-xs leading-relaxed mb-3">
                                {r.description}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-forge-muted font-mono">{r.specs.length} specs open</span>
                                <span className={`text-xs font-semibold ${meta.color}`}>Claim SOTA →</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* API/CLI access panel */}
                <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 max-w-2xl">
                  <div className="text-sm font-semibold text-white mb-2">Train your agent on the problem pool</div>
                  <div className="text-xs text-forge-muted mb-3 leading-relaxed">
                    Fetch any spec by ID to test locally. The eval harness runs the same FEA pipeline
                    as CI — deterministic, reproducible.
                  </div>
                  <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs space-y-1">
                    <div><span className="text-forge-muted"># list all specs</span></div>
                    <div><span className="text-forge-muted">$ </span><span className="text-forge-green">curl http://143.244.191.193:8000/specs</span></div>
                    <div className="mt-2"><span className="text-forge-muted"># run local eval on a specific spec</span></div>
                    <div><span className="text-forge-muted">$ </span><span className="text-forge-green">forge eval agents/my-agent/agent.py --spec r01_001_easy</span></div>
                    <div className="mt-2"><span className="text-forge-muted"># fetch active rounds and their spec pools</span></div>
                    <div><span className="text-forge-muted">$ </span><span className="text-forge-green">curl http://143.244.191.193:8000/rounds/active</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Standalone spec view — from gallery, no round context */}
            {selectedSpecId && !selectedRoundId && activeSpec && (
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={() => { setSelectedSpecId(null); setSelectedSubmission(null); }}
                  className="text-xs text-forge-muted hover:text-white mb-5 flex items-center gap-1 transition-colors"
                >
                  ← All categories
                </button>
                <HeroStats spec={activeSpec} sota={sota ?? null} submissionCount={passedSubmissions.length} />
                {sota?.has_step && (
                  <div className="mt-5">
                    <StepViewer
                      stepUrl={stepUrl(sota.submission_id)}
                      label={`SOTA — ${fmtScore(sota.score, sota.score_metric)} by ${sota.contributor}`}
                    />
                  </div>
                )}
                <div className="mt-5"><SotaChart submissions={submissions ?? []} spec={activeSpec} /></div>
                <div className="mt-5">
                  <Leaderboard
                    spec={activeSpec}
                    submissions={submissions ?? []}
                    onSelectEntry={(s) => setSelectedSubmission(s)}
                    selected={selectedSubmission}
                  />
                </div>
                {selectedSubmission && (
                  <div className="mt-5">
                    <SubmissionJourney
                      submission={selectedSubmission}
                      spec={activeSpec}
                      sota={sota ?? null}
                      onClose={() => setSelectedSubmission(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Category detail — spec browser */}
            {selectedRoundId && selectedRound && (
              <div className="flex gap-6">
                {/* Sidebar */}
                <aside className="w-64 shrink-0 hidden lg:block">
                  {/* Back + category header */}
                  <button
                    onClick={clearCategory}
                    className="text-xs text-forge-muted hover:text-white mb-3 flex items-center gap-1 transition-colors"
                  >
                    ← All categories
                  </button>
                  <div className="mb-3 px-1">
                    <div className="text-xs font-semibold text-white">
                      {selectedRound.name.replace(/Round \d+ — /, "")}
                    </div>
                    <div className="text-xs text-forge-muted mt-0.5 font-mono">
                      {selectedRound.scoring_direction === "minimize" ? "↓" : "↑"} {selectedRound.scoring_metric}
                    </div>
                  </div>

                  <CategorySpecList
                    round={selectedRound}
                    specs={specs ?? []}
                    sotaBySpec={sotaBySpec}
                    selectedTier={selectedTier}
                    onTierChange={setSelectedTier}
                    activeSpecId={selectedSpecId}
                    onSelectSpec={(id) => {
                      setSelectedSpecId(id);
                      setSelectedSubmission(null);
                    }}
                  />

                  <div className="mt-4 p-3 bg-forge-surface border border-forge-border rounded-xl">
                    <div className="text-xs text-white font-semibold mb-1">New here?</div>
                    <div className="text-xs text-forge-muted mb-2 leading-relaxed">
                      Write an agent, open a PR — CI scores it automatically.
                    </div>
                    <button
                      onClick={() => setActiveTab("guide")}
                      className="text-xs text-forge-accent hover:underline"
                    >
                      See the guide →
                    </button>
                  </div>
                </aside>

                {/* Mobile: back button + spec list */}
                <div className="lg:hidden mb-4 w-full">
                  <button onClick={clearCategory} className="text-xs text-forge-muted hover:text-white mb-3 flex items-center gap-1">
                    ← All categories
                  </button>
                  {!selectedSpecId && (
                    <CategorySpecList
                      round={selectedRound}
                      specs={specs ?? []}
                      sotaBySpec={sotaBySpec}
                      selectedTier={selectedTier}
                      onTierChange={setSelectedTier}
                      activeSpecId={selectedSpecId}
                      onSelectSpec={(id) => {
                        setSelectedSpecId(id);
                        setSelectedSubmission(null);
                      }}
                    />
                  )}
                </div>

                {/* Main content */}
                <main className="flex-1 min-w-0 flex flex-col gap-5">
                  {!selectedSpecId ? (
                    /* Desktop: prompt to select from sidebar */
                    <div className="hidden lg:block py-8 text-center">
                      <div className="text-forge-muted text-sm mb-2">
                        {categorySpecs.length} spec{categorySpecs.length !== 1 ? "s" : ""} in this category
                      </div>
                      <div className="text-forge-muted text-xs">
                        Select a problem from the sidebar to view its details and leaderboard.
                      </div>
                    </div>
                  ) : activeSpec ? (
                    <>
                      <HeroStats
                        spec={activeSpec}
                        sota={sota ?? null}
                        submissionCount={passedSubmissions.length}
                      />

                      {sota?.has_step && (
                        <StepViewer
                          stepUrl={stepUrl(sota.submission_id)}
                          label={`SOTA — ${fmtScore(sota.score, sota.score_metric)} by ${sota.contributor}`}
                        />
                      )}

                      <SotaChart submissions={submissions ?? []} spec={activeSpec} />

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

                      <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
                        <div className="text-sm font-semibold text-white mb-1">Beat the SOTA</div>
                        {sota ? (
                          <p className="text-forge-muted text-xs mb-3">
                            Current leader:{" "}
                            <span className="text-forge-green font-mono">{fmtScore(sota.score, sota.score_metric)}</span>{" "}
                            by <span className="text-white">{sota.contributor}</span>.{" "}
                            Fork the repo, write a better design, open a PR.
                          </p>
                        ) : (
                          <p className="text-forge-muted text-xs mb-3">
                            No submissions yet — be the first to set the SOTA. Fork the repo and open a PR.
                          </p>
                        )}
                        <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green space-y-1">
                          <div><span className="text-forge-muted">$ </span>git clone {FORGE_REPO}</div>
                          <div><span className="text-forge-muted">$ </span>cd forge && pip install -e .</div>
                          <div><span className="text-forge-muted">$ </span>forge new my-agent</div>
                          <div><span className="text-forge-muted">$ </span>forge eval agents/my-agent/agent.py --spec {activeSpec.id}</div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </main>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
