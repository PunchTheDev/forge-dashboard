import { useState, useCallback, useMemo, lazy, Suspense, useEffect, Component } from "react";
import type { ReactNode } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useParams,
  useMatch,
  useSearchParams,
} from "react-router-dom";
import {
  api,
  API_BASE_URL,
  Submission,
  Spec,
  SotaRecord,
  Round,
  RoundLeaderboard,
  stepUrl,
  fmtScore,
  metricConfig,
  specLabel,
} from "./lib/api";
import { useApi } from "./hooks/useApi";
import { Leaderboard } from "./components/Leaderboard";
import { SubmissionPanel } from "./components/SubmissionPanel";
import { SubmissionJourney } from "./components/SubmissionJourney";
import { HeroStats } from "./components/HeroStats";
import { OverallLeaderboard } from "./components/OverallLeaderboard";
import { QuickstartGuide } from "./components/QuickstartGuide";
import { SpecDiagram } from "./components/SpecDiagram";
import { Playground } from "./components/Playground";

// Heavy bundles — lazy-loaded so they don't block the initial page render.
// three.js (~464 KB) only loads when a STEP model is actually displayed.
// recharts (~524 KB) only loads when the SOTA history chart is rendered.
const StepViewer = lazy(() => import("./components/StepViewer").then((m) => ({ default: m.StepViewer })));
const SotaChart = lazy(() => import("./components/SotaChart").then((m) => ({ default: m.SotaChart })));

function ChartSkeleton() {
  return <div className="h-48 rounded-xl bg-forge-surface border border-forge-border animate-pulse" />;
}

function ViewerSkeleton() {
  return <div className="w-full min-h-[320px] rounded-xl bg-forge-surface border border-forge-border animate-pulse" />;
}

/**
 * Local error boundary for the 3D viewer — catches WebGL context failures
 * (headless Chrome, servers without GPU, old hardware) and falls back to
 * the provided fallback node (typically a SpecDiagram) so the rest of the
 * page stays functional.
 */
class StepViewerBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) return this.props.fallback;
    return this.props.children;
  }
}

const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_DOCS_URL = `${API_BASE_URL}/docs`;

const CATEGORY_META: Record<
  string,
  { icon: string; tooltip: string; color: string; bgColor: string; borderColor: string; hex: string }
> = {
  round_001: {
    icon: "⚖",
    tooltip: "Mass optimization — minimize total part weight while surviving the applied load",
    color: "text-forge-green",
    bgColor: "bg-forge-green/10",
    borderColor: "border-forge-green/40",
    hex: "#10b981",
  },
  round_002: {
    icon: "⊕",
    tooltip: "Stiffness/weight ratio — maximize structural stiffness per gram of material used",
    color: "text-forge-accent",
    bgColor: "bg-forge-accent/10",
    borderColor: "border-forge-accent/40",
    hex: "#6366f1",
  },
  round_003: {
    icon: "↕",
    tooltip: "Deflection minimization — minimize load-point displacement under the applied force",
    color: "text-forge-red",
    bgColor: "bg-forge-red/10",
    borderColor: "border-forge-red/40",
    hex: "#ef4444",
  },
};

const TIER_COLORS: Record<string, string> = {
  easy: "text-forge-green",
  medium: "text-forge-accent",
  hard: "text-forge-red",
};

// ─── Shared data shape passed down to pages ───────────────────────────────────
interface SharedData {
  specs: Spec[] | null;
  specsLoading: boolean;
  allRounds: Round[];
  allSota: SotaRecord[] | null;
  sotaBySpec: Record<string, number>;
  overallData: import("./lib/api").OverallLeaderboard | null;
  overallLoading: boolean;
  roundSolvedCount: number;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

/** Redirect /rounds/:roundId and /round/:roundId → /problems/:roundId */
function RoundRedirect() {
  const { roundId } = useParams<{ roundId: string }>();
  return <Navigate to={`/problems/${roundId ?? ""}`} replace />;
}

function NotFoundPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="text-forge-muted font-mono text-5xl mb-4">404</div>
      <div className="text-white text-lg font-semibold mb-2">Page not found</div>
      <div className="text-forge-muted text-sm mb-6">
        That URL doesn't exist. Check the address or head back to a known page.
      </div>
      <div className="flex items-center justify-center gap-4 text-xs">
        <Link to="/problems" className="text-forge-accent hover:underline">Problems</Link>
        <Link to="/rankings" className="text-forge-accent hover:underline">Rankings</Link>
        <Link to="/guide" className="text-forge-accent hover:underline">Guide</Link>
      </div>
    </div>
  );
}

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
            {API_BASE_URL}
          </code>{" "}
          is not responding. Competition is still live on{" "}
          <a href={FORGE_REPO} className="text-forge-accent hover:underline">
            GitHub
          </a>
          .
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function NavLink({ to, label }: { to: string; label: string }) {
  const match = useMatch({ path: to, end: to === "/" });
  // For /problems, match any sub-path too
  const subMatch = useMatch({ path: `${to}/*`, end: false });
  const active = !!match || !!subMatch;
  return (
    <Link
      to={to}
      className={`text-xs transition-colors ${
        active ? "text-white font-semibold" : "text-forge-muted hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function Header() {
  return (
    <header className="border-b border-forge-border bg-forge-bg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-forge-accent font-bold text-sm tracking-wide">
            FORGE
          </Link>
          <span className="text-forge-border">|</span>
          <NavLink to="/problems" label="Home" />
          <NavLink to="/rankings" label="Rankings" />
          <NavLink to="/explorer" label="Explorer" />
          <NavLink to="/guide" label="Guide" />
        </div>
        <nav className="hidden sm:flex items-center gap-4 text-xs text-forge-muted">
          <a
            href={FORGE_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            API
          </a>
        </nav>
      </div>
    </header>
  );
}

// ─── LandingBanner ────────────────────────────────────────────────────────────

function LandingBanner({
  activeRounds,
  agentCount,
  solvedCount,
}: {
  activeRounds: Round[];
  agentCount: number;
  solvedCount: number;
}) {
  const totalSpecs = activeRounds.reduce((n, r) => n + r.specs.length, 0);
  return (
    <div className="border-b border-forge-border bg-forge-surface/50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs text-forge-muted/70 cursor-help border-b border-dotted border-forge-muted/30"
                title="Gittensor is Bittensor subnet 74 — an incentive layer where AI agents earn TAO token rewards for solving engineering optimization benchmarks. Top-performing agents in Forge earn a share of the subnet's TAO emissions."
              >
                Gittensor SN74
              </span>
              <span className="text-forge-muted/40 text-xs">·</span>
              <span className="text-xs text-forge-muted/70">
                Open Competition
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Forge — Competitive CAD Benchmark
            </h1>
            <p className="text-forge-muted text-sm leading-relaxed max-w-xl">
              AI agents compete to design optimal 3D-printable structural brackets.{" "}
              Build the best well-rounded CAD optimization agent. Your agent is evaluated across{" "}
              <span className="text-white font-semibold">{totalSpecs || "45"} problems</span>{" "}
              spanning three optimization categories — mass, stiffness/weight, and deflection.
              Top agent across all categories earns{" "}
              <span
                className="cursor-help border-b border-dotted border-forge-muted/50"
                title="TAO is the native token of the Bittensor network. Subnet 74 (Gittensor) distributes TAO to agents proportional to their benchmark performance — the better your agent scores, the more it earns."
              >Bittensor TAO</span>{" "}
              via Gittensor subnet 74.
            </p>

            {activeRounds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {activeRounds.map((r) => {
                  const meta = CATEGORY_META[r.id] ?? {
                    icon: "·",
                    color: "text-forge-muted",
                    bgColor: "bg-forge-surface",
                    borderColor: "border-forge-border",
                  };
                  return (
                    <Link
                      key={r.id}
                      to={`/problems/${r.id}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:opacity-80 ${meta.bgColor} ${meta.borderColor}`}
                    >
                      <span className={`text-sm ${meta.color}`} title={meta.tooltip}>{meta.icon}</span>
                      <span className="text-xs font-medium text-white">
                        {r.name.replace(/Round \d+ — /, "")}
                      </span>
                      <span className="text-xs text-forge-muted font-mono">
                        {r.specs.length} problems
                      </span>
                    </Link>
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
            <Link
              to="/guide"
              className="border border-forge-green/50 text-forge-green px-4 py-2 rounded-lg hover:border-forge-green hover:bg-forge-green/10 transition-colors text-center font-semibold"
            >
              New? See the guide →
            </Link>
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

        <div className="mt-5 flex items-center gap-4 text-xs text-forge-muted">
          <span>
            <span className="text-white font-mono font-semibold">{totalSpecs || 45}</span> problems
          </span>
          <span className="text-forge-border">·</span>
          <span>
            <span className="text-white font-mono font-semibold">{agentCount || 0}</span> agent
            {agentCount !== 1 ? "s" : ""} competing
          </span>
          <span className="text-forge-border">·</span>
          <span
            className="cursor-help border-b border-dotted border-forge-muted/30"
            title="'Claimed' means at least one agent has a passing FEA submission for that problem — its geometry fits in the build volume, passes wall-thickness and overhang checks, and survives structural analysis. Unclaimed problems are wide open."
          >
            <span className="text-white font-mono font-semibold">{(totalSpecs || 45) - solvedCount}</span>{" "}
            problem{((totalSpecs || 45) - solvedCount) !== 1 ? "s" : ""} open
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              step: "01",
              title: "Choose your approach",
              desc: "Browse the three challenge types — minimize mass, maximize stiffness-per-gram, or minimize deflection. Your agent competes across all simultaneously.",
            },
            {
              step: "02",
              title: "Write an agent",
              desc: "Implement generate(spec, llm) → STEP bytes. Any topology, any approach. See the guide for the full API.",
            },
            {
              step: "03",
              title: "Open a PR",
              desc: "PR CI runs a quick FEA check (1 easy problem per category) and posts a score table. Full scoring across all 45 problems runs after merge.",
            },
            {
              step: "04",
              title: "Earn TAO rewards",
              desc: "Best overall agent across all categories earns Bittensor TAO — the on-chain token distributed by Gittensor's incentive mechanism.",
            },
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

// ─── SotaHero ─────────────────────────────────────────────────────────────────

function SotaHero({
  sota,
  spec,
  round,
}: {
  sota: SotaRecord;
  spec: Spec | undefined;
  round: Round | undefined;
}) {
  const meta = round ? CATEGORY_META[round.id] : null;
  const { label: metricLabel, unit } = metricConfig(sota.score_metric);

  return (
    <div className="mb-8 rounded-2xl border border-forge-border bg-forge-surface overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-h-[320px] lg:min-h-[400px] relative">
          {sota.has_step ? (
            <StepViewerBoundary fallback={spec ? <div className="h-full flex flex-col p-5 gap-3"><div className="text-xs text-forge-muted uppercase tracking-wider opacity-60 shrink-0">Problem constraints</div><div className="flex-1 flex items-center"><SpecDiagram spec={spec} /></div></div> : <ViewerSkeleton />}>
              <Suspense fallback={<ViewerSkeleton />}>
                <StepViewer stepUrl={stepUrl(sota.submission_id)} label={undefined} material={spec?.material} />
              </Suspense>
            </StepViewerBoundary>
          ) : spec ? (
            <div className="h-full flex flex-col p-5 gap-3">
              <div className="text-xs text-forge-muted uppercase tracking-wider opacity-60 shrink-0">
                Problem constraints
              </div>
              <div className="flex-1 flex items-center">
                <SpecDiagram spec={spec} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-forge-muted text-sm">
              No preview available
            </div>
          )}
        </div>
        <div className="lg:w-72 shrink-0 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-forge-border">
          <div>
            {meta && (
              <div className={`text-xs font-bold uppercase tracking-widest ${meta.color} mb-2`}>
                {round?.name.replace(/Round \d+ — /, "")}
              </div>
            )}
            <div className="text-white font-bold text-lg leading-tight mb-1">
              {spec ? specLabel(spec) : sota.spec_id}
            </div>
            <div className="text-forge-muted text-xs mb-4 leading-relaxed">
              Current best score · by{" "}
              <span className="text-white">{sota.contributor}</span>
            </div>

            <div className="bg-forge-bg rounded-xl p-4 mb-4">
              <div className="text-forge-muted text-xs uppercase tracking-wider mb-1">
                Current best {metricLabel}
              </div>
              <div
                className={`font-mono text-3xl font-bold tabular-nums ${meta?.color ?? "text-forge-green"}`}
              >
                {sota.score.toFixed(
                  sota.score_metric === "stiffness_to_weight"
                    ? 3
                    : sota.score_metric === "deflection_mm"
                      ? 4
                      : 2,
                )}
              </div>
              <div className="text-forge-muted text-xs mt-0.5">{unit}</div>
            </div>

            <p className="text-forge-muted text-xs leading-relaxed mb-4">
              This part passed real FEA (CalculiX). Your agent generates a fresh bracket
              per-problem — beat this score on this problem and all others to win.
              {sota.score_metric === "mass_grams" && " Lightest structure that survives the load wins."}
              {sota.score_metric === "stiffness_to_weight" &&
                " Highest stiffness-per-gram wins."}
              {sota.score_metric === "deflection_mm" && " Least deflection under load wins."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to={`/problems/${round?.id ?? ""}/${sota.spec_id}`}
              className="bg-forge-accent text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-forge-accent/80 transition-colors text-center"
            >
              View problem →
            </Link>
            <a
              href={FORGE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-forge-border text-forge-muted px-4 py-2.5 rounded-lg text-sm hover:border-forge-accent/50 hover:text-white transition-colors text-center"
            >
              Fork and compete
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  round,
  sotaBySpec,
}: {
  round: Round;
  sotaBySpec: Record<string, number>;
}) {
  const meta = CATEGORY_META[round.id] ?? {
    icon: "·",
    color: "text-forge-muted",
    bgColor: "bg-forge-surface",
    borderColor: "border-forge-border",
  };
  const tiers = ["easy", "medium", "hard"];
  const tierCounts = Object.fromEntries(
    tiers.map((t) => [t, round.specs.filter((s) => s.tier === t).length]),
  );
  const sotaCount = round.specs.filter((s) => sotaBySpec[s.id] !== undefined).length;

  return (
    <Link
      to={`/problems/${round.id}`}
      className={`block p-5 rounded-xl border transition-all hover:border-opacity-80 hover:scale-[1.01] active:scale-[0.99] ${meta.bgColor} ${meta.borderColor} border`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-2xl mb-2" title={meta.tooltip}>{meta.icon}</div>
          <div className="text-white font-bold text-sm">{round.name.replace(/Round \d+ — /, "")}</div>
          <div className="text-forge-muted text-xs mt-0.5 leading-relaxed max-w-xs">
            {round.description}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-xs font-mono font-semibold px-2 py-1 rounded ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}
          >
            {round.scoring_direction === "minimize" ? "↓" : "↑"} {metricConfig(round.scoring_metric).label}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex gap-3">
          {tiers
            .filter((t) => tierCounts[t] > 0)
            .map((t) => (
              <span key={t} className={`text-xs font-mono ${TIER_COLORS[t]}`}>
                {tierCounts[t]} {t}
              </span>
            ))}
        </div>
        <span className="text-forge-border">·</span>
        <span className="text-xs text-forge-muted" title="'Claimed' = at least one passing FEA submission exists">
          {sotaCount}/{round.specs.length} claimed
        </span>
        <span className="ml-auto text-xs text-forge-accent font-medium">Browse →</span>
      </div>
    </Link>
  );
}

// ─── CompactSpecTable — replaces sidebar card dump ────────────────────────────

function CompactSpecTable({
  round,
  specs,
  sotaBySpec,
  selectedTier,
  onTierChange,
}: {
  round: Round;
  specs: Spec[];
  sotaBySpec: Record<string, number>;
  selectedTier: string | null;
  onTierChange: (tier: string | null) => void;
}) {
  const roundSpecIds = new Set(round.specs.map((s) => s.id));
  const tierMap = Object.fromEntries(round.specs.map((s) => [s.id, s.tier]));

  const TIER_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  const visibleSpecs = specs
    .filter((s) => {
      if (!roundSpecIds.has(s.id)) return false;
      if (selectedTier && tierMap[s.id] !== selectedTier) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = TIER_ORDER[tierMap[a.id] ?? ""] ?? 3;
      const tb = TIER_ORDER[tierMap[b.id] ?? ""] ?? 3;
      return ta !== tb ? ta - tb : a.id.localeCompare(b.id);
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
        <span className="ml-auto text-forge-muted">{visibleSpecs.length} problems</span>
      </div>

      {/* Two-column grid of compact spec rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleSpecs.map((spec) => {
          const tier = tierMap[spec.id] ?? "easy";
          const sota = sotaBySpec[spec.id];
          return (
            <Link
              key={spec.id}
              to={`/problems/${round.id}/${spec.id}`}
              className="flex items-center gap-3 px-3 py-2.5 bg-forge-surface border border-forge-border rounded-lg hover:border-forge-accent/50 transition-all hover:scale-[1.005] active:scale-[0.995]"
            >
              <span
                className={`text-xs font-mono shrink-0 px-1.5 py-0.5 rounded border capitalize ${
                  tier === "easy"
                    ? "text-forge-green border-forge-green/30 bg-forge-green/10"
                    : tier === "medium"
                      ? "text-forge-accent border-forge-accent/30 bg-forge-accent/10"
                      : "text-forge-red border-forge-red/30 bg-forge-red/10"
                }`}
              >
                {tier}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{specLabel(spec)}</div>
                <div className="text-[10px] font-mono text-forge-muted/50 truncate" title={`CLI: forge eval ... --spec ${spec.id}`}>{spec.id}</div>
              </div>
              {sota != null ? (
                <span className="text-xs font-mono text-forge-green shrink-0">
                  {fmtScore(sota, round.scoring_metric)}
                </span>
              ) : (
                <span className="text-xs text-amber-400/60 font-semibold shrink-0 px-1.5 py-0.5 border border-amber-400/20 rounded" title="No winner yet — first passing submission claims #1">unclaimed</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── SidebarSpecList — compact nav rows for the spec detail sidebar ───────────

const TIER_DOT: Record<string, string> = {
  easy: "bg-forge-green",
  medium: "bg-forge-accent",
  hard: "bg-forge-red",
};

function SidebarSpecList({
  round,
  specs,
  sotaBySpec,
  activeSpecId,
  onClearSelection,
}: {
  round: Round;
  specs: Spec[];
  sotaBySpec: Record<string, number>;
  activeSpecId: string | null;
  /** Called before navigating — use to clear any local selection state. */
  onClearSelection: () => void;
}) {
  const roundSpecIds = new Set(round.specs.map((s) => s.id));
  const tierMap = Object.fromEntries(round.specs.map((s) => [s.id, s.tier]));
  const tiers = ["easy", "medium", "hard"].filter((t) => round.specs.some((s) => s.tier === t));

  return (
    <div className="flex flex-col gap-3">
      {tiers.map((tier) => {
        const tierSpecs = specs.filter(
          (s) => roundSpecIds.has(s.id) && tierMap[s.id] === tier,
        );
        if (!tierSpecs.length) return null;
        return (
          <div key={tier}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 px-1 ${TIER_COLORS[tier]}`}>
              {tier}
            </div>
            <div className="flex flex-col gap-0.5">
              {tierSpecs.map((spec) => {
                const sota = sotaBySpec[spec.id];
                const isActive = spec.id === activeSpecId;
                return (
                  <Link
                    key={spec.id}
                    to={`/problems/${round.id}/${spec.id}`}
                    onClick={onClearSelection}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-forge-accent/15 border border-forge-accent/30 text-white"
                        : "hover:bg-forge-surface text-forge-muted hover:text-white"
                    }`}
                  >
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TIER_DOT[tier]}`} />
                    <span className="text-xs flex-1 min-w-0 truncate" title={specLabel(spec)}>{specLabel(spec)}</span>
                    {sota != null ? (
                      <span className="shrink-0 text-forge-green font-mono text-xs">
                        {fmtScore(sota, round.scoring_metric)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-forge-accent/50 text-xs font-semibold" title="No winner yet — first to pass FEA claims it">
                        open
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page: Problems landing (/) ───────────────────────────────────────────────

function ProblemsLanding({ data }: { data: SharedData }) {
  const { specs, specsLoading, allRounds, allSota, sotaBySpec, overallData } = data;

  useEffect(() => {
    document.title = "Forge — Competitive CAD Benchmark";
  }, []);

  return (
    <>
      <LandingBanner
        activeRounds={allRounds}
        agentCount={overallData?.entries.length ?? 0}
        solvedCount={data.roundSolvedCount}
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Featured SOTA hero */}
        {(() => {
          const heroSota = (allSota ?? []).find((s) => {
            if (!s.has_step) return false;
            return allRounds.some((r) => r.specs.some((sp) => sp.id === s.spec_id));
          });
          if (!heroSota) return null;
          const heroRound = allRounds.find((r) =>
            r.specs.some((sp) => sp.id === heroSota.spec_id),
          );
          const heroSpec = specs?.find((sp) => sp.id === heroSota.spec_id);
          return (
            <>
              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-forge-accent">
                  Spotlight
                </div>
                <div className="text-sm text-white font-semibold mt-0.5">
                  Best agent design so far — one problem
                </div>
                <div className="text-xs text-forge-muted mt-0.5 leading-relaxed max-w-2xl">
                  This is the current top-scoring submission on one of the {allRounds.length} active competition
                  categories. Open it to see the full leaderboard, FEA results, and the agent code that beat it.
                </div>
              </div>
              <SotaHero
                sota={heroSota}
                spec={heroSpec}
                round={heroRound}
              />
            </>
          );
        })()}

        <div className="mb-5">
          <div className="text-lg font-bold text-white">Problem Categories</div>
          <div className="text-xs text-forge-muted mt-1 leading-relaxed max-w-2xl">
            Each category is an independent optimization axis. A submitted agent is evaluated across
            all categories — pick a category below to explore the problem pool and train on
            individual problems via the API or CLI.
          </div>
        </div>

        {/* Category grid */}
        {specsLoading && !allRounds.length ? (
          <div className="text-forge-muted text-sm py-8">Loading categories…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {allRounds.map((r) => (
              <CategoryCard
                key={r.id}
                round={r}
                sotaBySpec={sotaBySpec}
              />
            ))}
          </div>
        )}

        {/* SOTA Gallery — round leaders only */}
        {(() => {
          const seenRounds = new Set<string>();
          const featured: SotaRecord[] = [];
          for (const s of allSota ?? []) {
            const round = allRounds.find((r) => r.specs.some((sp) => sp.id === s.spec_id));
            if (round && !seenRounds.has(round.id)) {
              seenRounds.add(round.id);
              featured.push(s);
            }
          }
          // Only show round-linked SOTAs; if none exist yet, skip the gallery
          if (!featured.length) return null;
          return (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-semibold text-white">Current Leaders</div>
                <span className="text-xs text-forge-muted">— best per category</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {featured.map((sota) => {
                  const spec = specs?.find((sp) => sp.id === sota.spec_id);
                  const round = allRounds.find((r) =>
                    r.specs.some((sp) => sp.id === sota.spec_id),
                  );
                  const meta = round ? CATEGORY_META[round.id] : null;
                  return (
                    <Link
                      key={sota.spec_id}
                      to={`/problems/${round?.id ?? ""}/${sota.spec_id}`}
                      className="p-4 bg-forge-surface border border-forge-border rounded-xl hover:border-forge-accent/50 transition-all hover:scale-[1.01] active:scale-[0.99] block"
                    >
                      {spec && (
                        <div className="mb-3 pointer-events-none">
                          <SpecDiagram spec={spec} compact />
                        </div>
                      )}
                      {meta && (
                        <div className={`text-xs font-semibold ${meta.color} mb-1`}>
                          {round?.name.replace(/Round \d+ — /, "")}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white leading-snug line-clamp-1">
                          {spec ? specLabel(spec) : sota.spec_id}
                        </span>
                        <span
                          className={`font-mono font-semibold text-sm shrink-0 ${meta?.color ?? "text-forge-green"}`}
                        >
                          {fmtScore(sota.score, sota.score_metric)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-forge-muted">
                          by <span className="text-white">{sota.contributor}</span>
                        </span>
                        <span className="text-xs text-forge-accent">
                          {sota.has_step ? "View 3D →" : "Explore →"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Open Challenges */}
        {allRounds.length > 0 &&
          (() => {
            const solvedSpecIds = new Set((allSota ?? []).map((s) => s.spec_id));
            const roundsWithGaps = allRounds
              .map((r) => {
                const solved = r.specs.filter((sp) => solvedSpecIds.has(sp.id)).length;
                const unclaimed = r.specs.length - solved;
                return { round: r, solved, unclaimed };
              })
              .filter(({ unclaimed }) => unclaimed > 0);
            if (!roundsWithGaps.length) return null;
            const totalUnclaimed = roundsWithGaps.reduce((n, { unclaimed }) => n + unclaimed, 0);
            return (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-sm font-semibold text-white">Open Challenges</div>
                  <span className="text-xs text-forge-accent font-mono">
                    {totalUnclaimed} open
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roundsWithGaps.map(({ round: r, solved, unclaimed }) => {
                    const meta = CATEGORY_META[r.id] ?? {
                      icon: "·",
                      color: "text-forge-muted",
                      bgColor: "bg-forge-surface",
                      borderColor: "border-forge-border",
                      hex: "#6b7280",
                    };
                    const pct = Math.round((solved / r.specs.length) * 100);
                    return (
                      <Link
                        key={r.id}
                        to={`/problems/${r.id}`}
                        className={`p-5 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01] active:scale-[0.99] block ${meta.borderColor} ${meta.bgColor} hover:border-opacity-80`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>
                            {r.name.replace(/Round \d+ — /, "")}
                          </div>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}
                          >
                            {r.scoring_direction === "minimize" ? "↓" : "↑"} {metricConfig(r.scoring_metric).label}
                          </span>
                        </div>
                        <div className="w-full bg-forge-border rounded-full h-1 mb-3">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: meta.hex }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-forge-muted font-mono">
                            <span className="text-white font-semibold">{unclaimed}</span> /{" "}
                            {r.specs.length} open
                          </span>
                          <span
                            className={`text-xs font-semibold ${meta.color}`}
                          >
                            Compete →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </div>
    </>
  );
}

// ─── Round standings mini-panel ────────────────────────────────────────────────

function RoundStandingsPanel({ lb }: { lb: RoundLeaderboard }) {
  const topN = lb.entries.slice(0, 5);
  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-forge-border">
        <span className="text-xs font-semibold text-white uppercase tracking-wider">
          Round standings
        </span>
        <span className="text-xs text-forge-muted">
          {lb.entries.length} competitor{lb.entries.length !== 1 ? "s" : ""} · {lb.total_specs} problems
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-forge-muted border-b border-forge-border">
            <th className="px-4 py-1.5 text-left font-medium">Rank</th>
            <th className="px-4 py-1.5 text-left font-medium">Contributor</th>
            <th className="px-4 py-1.5 text-right font-medium" title="Problems where this agent holds the top score (#1 SOTA)">SOTA claims</th>
            <th className="px-4 py-1.5 text-right font-medium hidden sm:table-cell" title="Mean normalized rank across all problems in this round (0 = best, 1 = worst). Lower is better.">Round score</th>
          </tr>
        </thead>
        <tbody>
          {topN.map((e) => (
            <tr key={e.contributor} className="border-b border-forge-border/30">
              <td className="px-4 py-1.5 font-mono text-forge-muted">#{e.rank}</td>
              <td className="px-4 py-1.5">
                <Link
                  to={`/rankings/${encodeURIComponent(e.contributor)}`}
                  className="text-forge-accent hover:underline"
                >
                  {e.contributor}
                </Link>
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums">
                <span className={e.total_wins > 0 ? "text-forge-green font-semibold" : "text-forge-muted"}>
                  {e.total_wins} / {lb.total_specs}
                </span>
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums font-mono hidden sm:table-cell text-forge-muted">
                {e.overall_score != null ? e.overall_score.toFixed(3) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page: Category spec browser (/problems/:roundId) ─────────────────────────

function CategoryPage({ data }: { data: SharedData }) {
  const { roundId } = useParams<{ roundId: string }>();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { specs, allRounds, sotaBySpec } = data;

  const round = allRounds.find((r) => r.id === roundId) ?? null;

  const roundId_ = roundId ?? "";
  const { data: roundLb } = useApi(
    () => round ? api.roundLeaderboard(roundId_) : Promise.resolve(null),
    60000,
  );

  // useEffect must be called unconditionally (Rules of Hooks) — before any
  // early returns below. When round is null the title is left unchanged.
  const roundLabel = round ? round.name.replace(/Round \d+ — /, "") : "";
  useEffect(() => {
    if (!roundLabel) return;
    document.title = `${roundLabel} — Forge`;
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, [roundLabel]);

  if (!round) {
    // Legacy URL pattern: /problems/:specId (pre-round routing).
    // If roundId matches a spec that belongs to a known round, redirect there.
    const ownerRound = allRounds.find((r) => r.specs.some((sp) => sp.id === roundId));
    if (ownerRound) {
      return <Navigate to={`/problems/${ownerRound.id}/${roundId}`} replace />;
    }
    // Legacy spec not in any active round — render directly without round context.
    if (specs?.find((s) => s.id === roundId)) {
      return <Navigate to={`/problems/_legacy/${roundId}`} replace />;
    }
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-forge-muted text-sm">Category not found.</div>
        <Link to="/problems" className="text-forge-accent text-xs hover:underline mt-2 inline-block">
          ← Problems
        </Link>
      </div>
    );
  }

  const meta = CATEGORY_META[round.id] ?? {
    icon: "·",
    color: "text-forge-muted",
    bgColor: "bg-forge-surface",
    borderColor: "border-forge-border",
    hex: "#6b7280",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Link
        to="/problems"
        className="text-xs text-forge-muted hover:text-white mb-4 flex items-center gap-1 transition-colors"
      >
        ← Problems
      </Link>

      {/* Category header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xl ${meta.color}`} title={meta.tooltip}>{meta.icon}</span>
            <div>
              <div className="text-xs text-forge-muted font-mono uppercase tracking-wider mb-0.5">
                {round.name.match(/Round \d+/)?.[0] ?? round.id}
              </div>
              <h1 className="text-lg font-bold text-white">
                {round.name.replace(/Round \d+ — /, "")}
              </h1>
            </div>
          </div>
          <div className="text-xs text-forge-muted mt-0.5 leading-relaxed max-w-xl">
            {round.description}
          </div>
          <div className="text-xs text-forge-muted font-mono mt-1">
            {round.scoring_direction === "minimize" ? "↓" : "↑"} {metricConfig(round.scoring_metric).label}
          </div>
        </div>
        <Link
          to="/guide"
          className="text-xs text-forge-accent hover:underline shrink-0"
        >
          New here? See the guide →
        </Link>
      </div>

      {/* Round standings — only shown when there are competitors */}
      {roundLb && roundLb.entries.length > 0 && (
        <div className="mb-5">
          <RoundStandingsPanel lb={roundLb} />
        </div>
      )}

      <CompactSpecTable
        round={round}
        specs={specs ?? []}
        sotaBySpec={sotaBySpec}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
      />
    </div>
  );
}

// ─── Page: Spec detail (/problems/:roundId/:specId) ───────────────────────────

function SpecDetailPage({ data }: { data: SharedData }) {
  const { roundId, specId } = useParams<{ roundId: string; specId: string }>();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { specs, allRounds, sotaBySpec } = data;

  const round = allRounds.find((r) => r.id === roundId) ?? null;
  const activeSpec = specs?.find((s) => s.id === specId) ?? null;

  const { data: submissions, loading: subsLoading } = useApi(
    useCallback(
      () => (specId ? api.submissions(specId, false) : Promise.resolve([])),
      [specId],
    ),
    15000,
  );

  const { data: sota } = useApi<SotaRecord | null>(
    useCallback(
      () => (specId ? api.sota(specId).catch(() => null) : Promise.resolve(null)),
      [specId],
    ),
    15000,
  );

  const passedSubmissions = (submissions ?? []).filter((s) => s.passed);

  const specShortName = activeSpec ? specLabel(activeSpec) : undefined;
  useEffect(() => {
    if (specShortName) document.title = `${specShortName} — Forge`;
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, [specShortName]);

  if (!activeSpec) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-forge-muted text-sm mb-2">Problem not found — check the ID or browse all problems.</div>
        <Link
          to={roundId ? `/problems/${roundId}` : "/problems"}
          className="text-forge-accent text-xs hover:underline"
        >
          ← Browse all problems
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      {/* Sidebar — spec list (desktop only) */}
      {round && (
        <aside className="w-64 shrink-0 hidden lg:block">
          <Link
            to={`/problems/${round.id}`}
            className="text-xs text-forge-muted hover:text-white mb-3 flex items-center gap-1 transition-colors"
          >
            ← {round.name.replace(/Round \d+ — /, "")}
          </Link>
          <div className="mb-3 px-1">
            <div className="text-xs font-semibold text-white">
              {round.name.replace(/Round \d+ — /, "")}
            </div>
            <div className="text-xs text-forge-muted mt-0.5 font-mono">
              {round.scoring_direction === "minimize" ? "↓" : "↑"} {metricConfig(round.scoring_metric).label}
            </div>
          </div>

          <SidebarSpecList
            round={round}
            specs={specs ?? []}
            sotaBySpec={sotaBySpec}
            activeSpecId={specId ?? null}
            onClearSelection={() => setSelectedSubmission(null)}
          />

          <div className="mt-4 p-3 bg-forge-surface border border-forge-border rounded-xl">
            <div className="text-xs text-white font-semibold mb-1">New here?</div>
            <div className="text-xs text-forge-muted mb-2 leading-relaxed">
              Write an agent, open a PR — CI scores it automatically.
            </div>
            <Link to="/guide" className="text-xs text-forge-accent hover:underline">
              See the guide →
            </Link>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Mobile back button — inside main so it stacks above content, not inline with sidebar */}
        {round && (
          <div className="lg:hidden">
            <Link
              to={`/problems/${round.id}`}
              className="text-xs text-forge-muted hover:text-white flex items-center gap-1"
            >
              ← {round.name.replace(/Round \d+ — /, "")}
            </Link>
          </div>
        )}
        <HeroStats
          spec={activeSpec}
          sota={sota ?? null}
          submissionCount={passedSubmissions.length}
          round={round}
        />

        {sota?.has_step ? (
          <StepViewerBoundary fallback={activeSpec ? <SpecDiagram spec={activeSpec} /> : <ViewerSkeleton />}>
            <Suspense fallback={<ViewerSkeleton />}>
              <StepViewer
                stepUrl={stepUrl(sota.submission_id)}
                label={`Current best — ${fmtScore(sota.score, sota.score_metric)} by ${sota.contributor}`}
                material={activeSpec?.material}
                fallback={activeSpec ? <SpecDiagram spec={activeSpec} /> : undefined}
              />
            </Suspense>
          </StepViewerBoundary>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Spec constraint diagram — always shown */}
            {activeSpec && (
              <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-forge-border">
                  <h2 className="text-sm font-semibold text-white">Problem constraints</h2>
                  <p className="text-xs text-forge-muted mt-0.5">
                    Build volume · mounting face · load point · bolt pattern
                  </p>
                </div>
                <div className="p-4">
                  <SpecDiagram spec={activeSpec} />
                </div>
              </div>
            )}
            {/* 3D viewer placeholder — shown until a winning STEP is stored */}
            <div className="bg-forge-surface border border-forge-border border-dashed rounded-xl flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[220px]">
              <div className="text-forge-muted text-3xl select-none">⬡</div>
              <div className="text-sm font-semibold text-forge-muted">3D model</div>
              <p className="text-xs text-forge-muted max-w-xs leading-relaxed">
                The winning submission's STEP file renders here once an agent beats this problem.
                Submit a design via PR to be first.
              </p>
            </div>
          </div>
        )}

        <Suspense fallback={<ChartSkeleton />}>
          <SotaChart spec={activeSpec} />
        </Suspense>

        <Leaderboard
          spec={activeSpec}
          submissions={submissions ?? []}
          onSelectEntry={(s) => setSelectedSubmission(s)}
          selected={selectedSubmission}
        />

        {selectedSubmission && (
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
          onSelect={setSelectedSubmission}
        />

        <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-white">Beat the current best</div>
            <Link
              to={`/explorer?spec=${activeSpec.id}`}
              className="text-xs text-forge-accent hover:underline"
            >
              View in Explorer →
            </Link>
          </div>
          {sota ? (
            <p className="text-forge-muted text-xs mb-3">
              Current leader:{" "}
              <span className="text-forge-green font-mono">
                {fmtScore(sota.score, sota.score_metric)}
              </span>{" "}
              by <span className="text-white">{sota.contributor}</span>. Fork the repo, write a
              better design, open a PR.
            </p>
          ) : (
            <p className="text-forge-muted text-xs mb-3">
              No submissions yet — be the first. Fork the repo, run FEA locally, and open a PR.
            </p>
          )}
          <div className="bg-forge-bg rounded-lg p-3 font-mono text-xs text-forge-green space-y-1">
            <div>
              <span className="text-forge-muted">$ </span>git clone {FORGE_REPO}
            </div>
            <div>
              <span className="text-forge-muted">$ </span>cd forge && pip install -e .
            </div>
            <div>
              <span className="text-forge-muted">$ </span>forge new my-agent
            </div>
            <div>
              <span className="text-forge-muted">$ </span>forge eval agents/my-agent/agent.py
              --spec {activeSpec.id} --docker
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-forge-muted">
            <span>Problem definition (JSON):</span>
            <a
              href={`${API_BASE_URL}/specs/${activeSpec.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-forge-accent hover:underline font-mono"
            >
              GET /specs/{activeSpec.id}
            </a>
            <span className="ml-2">Full API:</span>
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-forge-accent hover:underline font-mono"
            >
              /docs
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page: Rankings (/rankings) ───────────────────────────────────────────────

function RankingsPage({ data }: { data: SharedData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { overallData, overallLoading, allRounds } = data;

  // Persist tab in URL (?tab=round_001) so per-category standings can be linked
  const activeRoundTab = searchParams.get("tab") ?? null;
  const setActiveRoundTab = (roundId: string | null) => {
    if (roundId) setSearchParams({ tab: roundId }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    document.title = "Agent Rankings — Forge";
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, []);

  // Load round leaderboard when a round tab is selected
  const activeRoundId = activeRoundTab ?? "";
  const { data: roundLb, loading: roundLbLoading } = useApi(
    useCallback(
      () => activeRoundId ? api.roundLeaderboard(activeRoundId) : Promise.resolve(null),
      [activeRoundId],
    ),
    30000,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <h1 className="text-lg font-bold text-white">Agent Rankings</h1>
          <div className="text-xs text-forge-muted mt-1 leading-relaxed">
            Agents ranked by <strong className="text-white">overall score</strong> — mean
            percentile across all{" "}
            <strong className="text-white">{overallData?.total_specs ?? 45} active problems</strong>{" "}
            spanning mass, stiffness/weight, and deflection.{" "}
            <strong className="text-white">0.0 = best</strong> (top of every problem),{" "}
            <strong className="text-white">1.0 = worst</strong> (bottom or not entered).
          </div>
          <div className="mt-2 px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-muted leading-relaxed">
            <strong className="text-white">How scores work:</strong> Every unentered problem
            counts as <span className="text-forge-accent font-mono">1.0</span> (worst).
            A sole entrant on a problem scores{" "}
            <span className="text-forge-green font-mono">~0.5</span> (50th percentile by default).
            Example: (3 × 0.5 + 42 × 1.0) ÷ 45 ≈{" "}
            <span className="text-white font-mono">0.967</span> — appears poor (close to 1.0 = worst)
            because 42/45 problems are unclaimed. Beat more problems to lower your score.
          </div>
        </div>

        {/* Round tabs — scrollable on mobile */}
        <div className="overflow-x-auto mb-4 border-b border-forge-border">
        <div className="flex items-center gap-1 pb-2 min-w-max whitespace-nowrap">
          <button
            onClick={() => setActiveRoundTab(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              !activeRoundTab
                ? "bg-forge-accent text-white"
                : "text-forge-muted hover:text-white"
            }`}
          >
            Overall
          </button>
          {allRounds.map((r) => {
            const meta = CATEGORY_META[r.id];
            const label = r.name.replace(/Round \d+ — /, "");
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoundTab(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeRoundTab === r.id
                    ? `${meta?.color ?? "text-white"} bg-forge-surface border ${meta?.borderColor ?? "border-forge-border"}`
                    : "text-forge-muted hover:text-white"
                }`}
              >
                {meta && <span>{meta.icon}</span>}
                {label}
              </button>
            );
          })}
        </div>
        </div>

        {/* Content — overall or round-specific */}
        {activeRoundTab ? (
          <div>
            {roundLbLoading && !roundLb ? (
              <div className="text-forge-muted text-sm py-6 text-center">Loading round rankings…</div>
            ) : roundLb ? (
              <RoundStandingsPanel lb={roundLb} />
            ) : (
              <div className="text-forge-muted text-sm py-6 text-center">No data for this round yet.</div>
            )}
          </div>
        ) : (
          <>
            <OverallLeaderboard
              data={overallData ?? null}
              loading={overallLoading}
              rounds={allRounds}
            />
            {!overallLoading && (overallData?.entries.length ?? 0) < 5 && (
              <div className="mt-8 border border-forge-border/50 border-dashed rounded-xl px-6 py-5 text-center">
                {(overallData?.entries.length ?? 0) === 0 ? (
                  <div className="text-sm text-white font-semibold mb-1">Be the first to compete</div>
                ) : (
                  <div className="text-sm text-white font-semibold mb-1">
                    {(overallData?.total_specs ?? 45) - (overallData?.entries.flatMap(e => e.best).length ?? 0)} problems still unclaimed — grab one
                  </div>
                )}
                <div className="text-xs text-forge-muted mb-3">
                  {(overallData?.total_specs ?? 45)} active problems across mass, stiffness/weight, and deflection.{" "}
                  {(overallData?.entries.length ?? 0) > 0
                    ? "Fork the SOTA agent and beat it."
                    : "No SOTA claimed yet — first submission wins."}
                </div>
                <Link
                  to="/guide"
                  className="inline-block text-xs bg-forge-accent/10 border border-forge-accent/40 text-forge-accent rounded-lg px-4 py-2 hover:bg-forge-accent/20 transition-colors"
                >
                  Read the quickstart guide →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page: Agent detail (/rankings/:agentId) ──────────────────────────────────

function AgentDetailPage({ data }: { data: SharedData }) {
  const { agentId } = useParams<{ agentId: string }>();
  const { overallData, overallLoading, allRounds, specs, sotaBySpec } = data;
  const contributor = agentId ? decodeURIComponent(agentId) : "";
  const [unenteredExpanded, setUnenteredExpanded] = useState(false);

  const entry = overallData?.entries.find((e) => e.contributor === contributor) ?? null;

  useEffect(() => {
    if (contributor) document.title = `${contributor} — Forge Rankings`;
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, [contributor]);

  const specToRound = useMemo(() => {
    const map: Record<string, string> = {};
    for (const round of allRounds) {
      for (const spec of round.specs) map[spec.id] = round.id;
    }
    return map;
  }, [allRounds]);

  const CATEGORY_META_OL: Record<string, { label: string; color: string; bg: string; border: string }> = {
    round_001: { label: "Mass",             color: "text-forge-green",  bg: "bg-forge-green/10",  border: "border-forge-green/30" },
    round_002: { label: "Stiffness/Weight", color: "text-forge-accent", bg: "bg-forge-accent/10", border: "border-forge-accent/30" },
    round_003: { label: "Deflection",       color: "text-forge-red",    bg: "bg-forge-red/10",    border: "border-forge-red/30" },
  };

  if (overallLoading && !overallData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-forge-muted text-sm">
        Loading agent data…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/rankings" className="text-xs text-forge-muted hover:text-white mb-4 flex items-center gap-1">
          ← Rankings
        </Link>
        <div className="text-sm font-semibold text-white mb-1">Agent not found</div>
        <p className="text-xs text-forge-muted mb-4 leading-relaxed">
          <span className="font-mono text-forge-accent">{contributor}</span> hasn't submitted to any active round yet,
          or the name doesn't match. Check the spelling or{" "}
          <Link to="/guide" className="text-forge-accent hover:underline">read the guide</Link> to submit your first entry.
        </p>
        <Link
          to="/rankings"
          className="text-xs text-forge-accent hover:underline"
        >
          Browse all agents →
        </Link>
      </div>
    );
  }

  const byRound: Record<string, typeof entry.best> = {};
  for (const b of entry.best) {
    const rid = specToRound[b.spec_id] ?? "other";
    if (!byRound[rid]) byRound[rid] = [];
    byRound[rid].push(b);
  }
  const knownRounds = Object.keys(CATEGORY_META_OL).filter((rid) => byRound[rid]?.length);

  const sorted = [...entry.best].sort((a, b) => a.spec_id.localeCompare(b.spec_id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        to="/rankings"
        className="text-xs text-forge-muted hover:text-white mb-5 flex items-center gap-1 transition-colors"
      >
        ← Rankings
      </Link>

      {/* Agent header */}
      <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">{entry.contributor}</h1>
            <div className="text-xs text-forge-muted mt-0.5">
              Rank{" "}
              <span className="text-white font-mono font-semibold">#{entry.rank}</span>
              {" · "}
              {entry.specs_entered} problem{entry.specs_entered !== 1 ? "s" : ""} entered
              {" · "}
              {entry.total_wins} SOTA claim{entry.total_wins !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="text-right">
            {entry.overall_score != null ? (
              <>
                <div className="font-mono text-sm font-semibold text-white">
                  {entry.overall_score.toFixed(3)}
                </div>
                <div className="text-xs text-forge-muted">overall score</div>
              </>
            ) : (
              <>
                <div className="font-mono text-sm font-semibold text-white">
                  #{entry.avg_rank.toFixed(1)}
                </div>
                <div className="text-xs text-forge-muted">avg rank</div>
              </>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        {knownRounds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            {knownRounds.map((rid) => {
              const meta = CATEGORY_META_OL[rid];
              const bests = byRound[rid];
              const wins = bests.filter((b) => b.rank === 1).length;
              const bestRank = Math.min(...bests.map((b) => b.rank));
              const rep = bests.find((b) => b.rank === 1) ?? bests[0];
              return (
                <div key={rid} className={`rounded-lg border px-3 py-2 ${meta.bg} ${meta.border}`}>
                  <div className={`text-xs font-semibold ${meta.color} mb-1 truncate`}>{meta.label}</div>
                  <div className="text-xs text-white font-mono">
                    {fmtScore(rep.score, rep.score_metric)}
                  </div>
                  <div className="text-xs text-forge-muted mt-0.5">
                    {bests.length} problem{bests.length !== 1 ? "s" : ""}
                    {wins > 0 && (
                      <span className="text-yellow-400">
                        {" · "}{wins} SOTA claim{wins !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className={`font-mono ${bestRank === 1 ? "text-yellow-400" : ""}`}>
                      {" "}#{bestRank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-problem results */}
      <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
        <div className="text-xs text-forge-muted mb-3 font-semibold uppercase tracking-wide">
          Results by problem
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-forge-muted border-b border-forge-border">
              <th className="text-left pb-1.5 font-normal">Problem</th>
              <th className="text-left pb-1.5 font-normal">Category</th>
              <th className="text-right pb-1.5 font-normal">Score</th>
              <th className="text-right pb-1.5 font-normal" title="rank / (agents + 1) — lower is better">Percentile</th>
              <th className="text-right pb-1.5 font-normal">Rank</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const roundId = specToRound[b.spec_id];
              const meta = roundId ? CATEGORY_META_OL[roundId] : null;
              const isSota = b.rank === 1;
              const pct = b.normalized_score * 100;
              // normalized_score = rank / (agents + 1). If sole entrant: 1 / (1+1) = 0.5
              const isSoleEntrant = b.rank === 1 && Math.abs(b.normalized_score - 0.5) < 0.001;
              const normColor =
                pct <= 80
                  ? "text-forge-green"
                  : pct <= 100
                    ? "text-forge-accent"
                    : "text-forge-red";
              const fullSpec = specs?.find((s) => s.id === b.spec_id);
              const problemLabel = fullSpec ? specLabel(fullSpec) : b.spec_id;
              return (
                <tr key={b.spec_id} className="border-b border-forge-border/40 last:border-0">
                  <td className="py-1.5">
                    {roundId ? (
                      <Link
                        to={`/problems/${roundId}/${b.spec_id}`}
                        className="text-forge-accent hover:underline"
                      >
                        {problemLabel}
                      </Link>
                    ) : (
                      <span className="text-white/80">{problemLabel}</span>
                    )}
                  </td>
                  <td className="py-1.5">
                    {meta ? (
                      <span className={`${meta.color} font-medium`}>{meta.label}</span>
                    ) : (
                      <span className="text-forge-muted">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono text-white">
                    {fmtScore(b.score, b.score_metric)}
                  </td>
                  <td className={`py-1.5 text-right font-mono ${normColor}`}>
                    {isSoleEntrant ? (
                      <span title="Only agent on this problem — auto-scored at 50th percentile (rank ÷ (agents + 1))">
                        Sole entrant
                      </span>
                    ) : (
                      `${pct.toFixed(1)}%`
                    )}
                  </td>
                  <td className="py-1.5 text-right">
                    {isSota ? (
                      <span className="text-yellow-400 font-bold">#1 ★</span>
                    ) : (
                      <span className="text-forge-muted">#{b.rank}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unentered problems — show what's dragging the overall score up */}
      {(() => {
        const enteredIds = new Set(entry.best.map((b) => b.spec_id));
        const unenteredByRound = allRounds
          .map((r) => ({
            round: r,
            specs: r.specs.filter((s) => !enteredIds.has(s.id)),
          }))
          .filter(({ specs: s }) => s.length > 0);

        if (!unenteredByRound.length) return null;

        const totalUnentered = unenteredByRound.reduce((n, { specs: s }) => n + s.length, 0);

        return (
          <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
            <button
              onClick={() => setUnenteredExpanded((v) => !v)}
              className="w-full flex items-center justify-between mb-1 text-left hover:opacity-80 transition-opacity"
            >
              <div className="text-xs font-semibold text-white">
                {totalUnentered} unentered problems
                <span className="ml-1 text-forge-muted font-normal">— each auto-scores 1.0 (worst)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs text-forge-muted cursor-help underline decoration-dotted decoration-forge-muted/50"
                  title="Each unentered problem contributes 1.0 (worst possible percentile) to your overall score. Beat more problems to lower your score."
                >
                  why this matters
                </span>
                <span className="text-forge-muted text-xs">{unenteredExpanded ? "▲" : "▼"}</span>
              </div>
            </button>
            {unenteredExpanded && (
              <>
                <p className="text-xs text-forge-muted mb-3 leading-relaxed">
                  These problems count as 1.0 in your overall score — the worst possible. Submitting
                  any passing design immediately improves your ranking.
                </p>
                <div className="flex flex-col gap-3">
                  {unenteredByRound.map(({ round, specs: rSpecs }) => {
                    const meta = CATEGORY_META_OL[round.id];
                    return (
                      <div key={round.id}>
                        {meta && (
                          <div className={`text-xs font-semibold ${meta.color} mb-1.5`}>
                            {meta.label} — {rSpecs.length} open
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {rSpecs.map((rs) => {
                            const sota = sotaBySpec[rs.id];
                            const fullSpec = (specs ?? []).find((s) => s.id === rs.id);
                            return (
                              <Link
                                key={rs.id}
                                to={`/problems/${round.id}/${rs.id}`}
                                className="flex items-center gap-2 px-2.5 py-1.5 bg-forge-bg border border-forge-border/50 rounded-lg hover:border-forge-accent/40 transition-all text-xs"
                              >
                                <span
                                  className={`shrink-0 font-mono capitalize ${TIER_COLORS[rs.tier] ?? "text-forge-muted"}`}
                                >
                                  {rs.tier}
                                </span>
                                <span className="flex-1 min-w-0 font-mono text-white/70 break-words">
                                  {fullSpec ? specLabel(fullSpec) : rs.id}
                                </span>
                                {sota != null ? (
                                  <span className="shrink-0 text-forge-muted font-mono">
                                    SOTA: {fmtScore(sota, round.scoring_metric)}
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-forge-accent font-mono text-xs font-semibold">
                                    open →
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Page wrappers: Guide + Explorer (add document.title) ─────────────────────

function GuidePage({ specs, loading }: { specs: Spec[]; loading: boolean }) {
  useEffect(() => {
    document.title = "Guide — Forge";
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, []);
  void specs; void loading;
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <QuickstartGuide />
    </div>
  );
}

function ExplorerPage({ specs, loading, sotaBySpec }: { specs: Spec[]; loading: boolean; sotaBySpec: Record<string, number> }) {
  useEffect(() => {
    document.title = "Explorer — Forge";
    return () => { document.title = "Forge — Competitive CAD Benchmark"; };
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Playground specs={specs} loading={loading} sotaBySpec={sotaBySpec} />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { data: specs, loading: specsLoading, error: specsError } = useApi(api.specs, 60000);

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

  const sotaBySpec = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allSota ?? []) map[s.spec_id] = s.score;
    return map;
  }, [allSota]);

  const roundSolvedCount = useMemo(() => {
    const roundSpecIds = new Set(activeRounds.flatMap((r) => r.specs.map((s) => s.id)));
    return (allSota ?? []).filter((s) => roundSpecIds.has(s.spec_id)).length;
  }, [activeRounds, allSota]);

  if (specsError) return <ApiError message={specsError} />;

  const sharedData: SharedData = {
    specs: specs ?? null,
    specsLoading,
    allRounds: activeRounds,
    allSota: allSota ?? null,
    sotaBySpec,
    overallData: overallData ?? null,
    overallLoading,
    roundSolvedCount,
  };

  return (
    <div className="min-h-screen bg-forge-bg text-white font-mono">
      <Header />

      <Routes>
        <Route path="/" element={<Navigate to="/problems" replace />} />

        <Route path="/problems" element={<ProblemsLanding data={sharedData} />} />
        {/* Legacy route: /problems/_legacy/:specId for specs not in any active round */}
        <Route path="/problems/_legacy/:specId" element={<SpecDetailPage data={sharedData} />} />
        <Route path="/problems/:roundId" element={<CategoryPage data={sharedData} />} />
        <Route path="/problems/:roundId/:specId" element={<SpecDetailPage data={sharedData} />} />

        <Route
          path="/rankings"
          element={<RankingsPage data={sharedData} />}
        />
        <Route
          path="/rankings/:agentId"
          element={<AgentDetailPage data={sharedData} />}
        />

        <Route
          path="/guide"
          element={<GuidePage specs={specs ?? []} loading={specsLoading} />}
        />

        <Route
          path="/explorer"
          element={<ExplorerPage specs={specs ?? []} loading={specsLoading} sotaBySpec={sotaBySpec} />}
        />

        {/* Aliases — common URL guesses */}
        <Route path="/leaderboard" element={<Navigate to="/rankings" replace />} />
        <Route path="/leaderboard/*" element={<Navigate to="/rankings" replace />} />
        {/* Playground → Explorer redirect (old URL) */}
        <Route path="/playground" element={<Navigate to="/explorer" replace />} />
        <Route path="/playground/*" element={<Navigate to="/explorer" replace />} />
        {/* Rounds — /rounds and /round/:id both map to /problems */}
        <Route path="/rounds" element={<Navigate to="/problems" replace />} />
        <Route path="/rounds/:roundId" element={<RoundRedirect />} />
        <Route path="/round/:roundId" element={<RoundRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
