import { useState, useCallback, useMemo } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
  useMatch,
} from "react-router-dom";
import {
  api,
  Submission,
  Spec,
  SotaRecord,
  Round,
  stepUrl,
  fmtScore,
  metricConfig,
} from "./lib/api";
import { useApi } from "./hooks/useApi";
import { Leaderboard } from "./components/Leaderboard";
import { SotaChart } from "./components/SotaChart";
import { SpecCard } from "./components/SpecCard";
import { SubmissionPanel } from "./components/SubmissionPanel";
import { SubmissionJourney } from "./components/SubmissionJourney";
import { HeroStats } from "./components/HeroStats";
import { OverallLeaderboard } from "./components/OverallLeaderboard";
import { QuickstartGuide } from "./components/QuickstartGuide";
import { StepViewer } from "./components/StepViewer";
import { SpecDiagram } from "./components/SpecDiagram";
import { Playground } from "./components/Playground";

const FORGE_REPO = "https://github.com/PunchTheDev/forge";
const API_DOCS_URL = "http://143.244.191.193:8000/docs";

const CATEGORY_META: Record<
  string,
  { icon: string; color: string; bgColor: string; borderColor: string; hex: string }
> = {
  round_001: {
    icon: "⚖",
    color: "text-forge-green",
    bgColor: "bg-forge-green/10",
    borderColor: "border-forge-green/40",
    hex: "#10b981",
  },
  round_002: {
    icon: "⟳",
    color: "text-forge-accent",
    bgColor: "bg-forge-accent/10",
    borderColor: "border-forge-accent/40",
    hex: "#6366f1",
  },
  round_003: {
    icon: "↕",
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
            http://143.244.191.193:8000
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
    <header className="border-b border-forge-border bg-forge-bg/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/problems" className="text-forge-accent font-bold text-sm tracking-wide">
            FORGE
          </Link>
          <span className="text-forge-border">|</span>
          <NavLink to="/problems" label="Problems" />
          <NavLink to="/rankings" label="Rankings" />
          <NavLink to="/playground" label="Playground" />
          <NavLink to="/guide" label="Guide" />
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
              <span className="text-white font-semibold">{totalSpecs || "45"} problems</span>{" "}
              spanning three optimization categories — mass, stiffness-to-weight, and absolute
              stiffness. Top agent across all categories earns Bittensor TAO via Gittensor subnet
              74.
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
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${meta.bgColor} ${meta.borderColor}`}
                    >
                      <span className={`text-sm ${meta.color}`}>{meta.icon}</span>
                      <span className="text-xs font-medium text-white">
                        {r.name.replace(/Round \d+ — /, "")}
                      </span>
                      <span className="text-xs text-forge-muted font-mono">
                        {r.specs.length} specs
                      </span>
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
          <span>
            <span className="text-white font-mono font-semibold">{solvedCount}</span> /{" "}
            {totalSpecs || 45} specs solved
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              step: "01",
              title: "Pick a category",
              desc: "Three optimization axes: mass, stiffness-to-weight, and absolute stiffness.",
            },
            {
              step: "02",
              title: "Write an agent",
              desc: "Implement generate(spec, llm) → STEP bytes. Any topology, any approach.",
            },
            {
              step: "03",
              title: "Open a PR",
              desc: "CI runs FEA on a random pool of specs and scores your agent automatically.",
            },
            {
              step: "04",
              title: "Earn emissions",
              desc: "Best overall agent across all categories earns Bittensor TAO rewards.",
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
  onView,
}: {
  sota: SotaRecord;
  spec: Spec | undefined;
  round: Round | undefined;
  onView: () => void;
}) {
  const meta = round ? CATEGORY_META[round.id] : null;
  const { label: metricLabel, unit } = metricConfig(sota.score_metric);

  return (
    <div className="mb-8 rounded-2xl border border-forge-border bg-forge-surface overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-h-[320px] lg:min-h-[400px] relative">
          <StepViewer stepUrl={stepUrl(sota.submission_id)} label={undefined} />
        </div>
        <div className="lg:w-72 shrink-0 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-forge-border">
          <div>
            {meta && (
              <div className={`text-xs font-bold uppercase tracking-widest ${meta.color} mb-2`}>
                {round?.name.replace(/Round \d+ — /, "")}
              </div>
            )}
            <div className="text-white font-bold text-lg leading-tight mb-1">Current SOTA</div>
            <div className="text-forge-muted text-xs mb-4 leading-relaxed">
              {spec?.name?.replace(/ — .*$/, "") ?? sota.spec_id} · by{" "}
              <span className="text-white">{sota.contributor}</span>
            </div>

            <div className="bg-forge-bg rounded-xl p-4 mb-4">
              <div className="text-forge-muted text-xs uppercase tracking-wider mb-1">
                {metricLabel}
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
              This part passed FEA verification. Your agent needs to beat it —
              {sota.score_metric === "mass_grams" && " lighter structure, same load rating."}
              {sota.score_metric === "stiffness_to_weight" &&
                " higher stiffness per gram of material."}
              {sota.score_metric === "deflection_mm" && " less deflection under the same load."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onView}
              className="bg-forge-accent text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-forge-accent/80 transition-colors text-center"
            >
              View problem →
            </button>
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
  onSelect,
}: {
  round: Round;
  sotaBySpec: Record<string, number>;
  onSelect: () => void;
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
    <button
      onClick={onSelect}
      className={`w-full text-left p-5 rounded-xl border transition-all hover:border-opacity-80 hover:scale-[1.01] active:scale-[0.99] ${meta.bgColor} ${meta.borderColor} border`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-2xl mb-2">{meta.icon}</div>
          <div className="text-white font-bold text-sm">{round.name.replace(/Round \d+ — /, "")}</div>
          <div className="text-forge-muted text-xs mt-0.5 leading-relaxed max-w-xs">
            {round.description}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-xs font-mono font-semibold px-2 py-1 rounded ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}
          >
            {round.scoring_direction === "minimize" ? "↓ minimize" : "↑ maximize"}
          </div>
          <div className="text-forge-muted text-xs font-mono mt-1">{round.scoring_metric}</div>
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
        <span className="text-xs text-forge-muted">
          {sotaCount}/{round.specs.length} solved
        </span>
        <span className="ml-auto text-xs text-forge-accent font-medium">Browse →</span>
      </div>
    </button>
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
  const navigate = useNavigate();
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
        <span className="ml-auto text-forge-muted">{visibleSpecs.length} specs</span>
      </div>

      {/* Two-column grid of compact spec rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visibleSpecs.map((spec) => {
          const tier = tierMap[spec.id] ?? "easy";
          const sota = sotaBySpec[spec.id];
          return (
            <button
              key={spec.id}
              onClick={() => navigate(`/problems/${round.id}/${spec.id}`)}
              className="text-left flex items-center gap-3 px-3 py-2.5 bg-forge-surface border border-forge-border rounded-lg hover:border-forge-accent/50 transition-all hover:scale-[1.005] active:scale-[0.995]"
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
                <div className="text-xs font-semibold text-white font-mono truncate">{spec.id}</div>
                <div className="text-xs text-forge-muted truncate">
                  {spec.name.replace(/ — .*$/, "")}
                </div>
              </div>
              {sota != null ? (
                <span className="text-xs font-mono text-forge-green shrink-0">
                  {fmtScore(sota, round.scoring_metric)}
                </span>
              ) : (
                <span className="text-xs text-forge-muted shrink-0">unclaimed</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CategorySpecList — kept for legacy sidebar use ───────────────────────────
// (used on spec detail page sidebar)
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

// ─── Page: Problems landing (/) ───────────────────────────────────────────────

function ProblemsLanding({ data }: { data: SharedData }) {
  const navigate = useNavigate();
  const { specs, specsLoading, allRounds, allSota, sotaBySpec, overallData } = data;

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
            <SotaHero
              sota={heroSota}
              spec={heroSpec}
              round={heroRound}
              onView={() =>
                navigate(`/problems/${heroRound?.id ?? ""}/${heroSota.spec_id}`)
              }
            />
          );
        })()}

        <div className="mb-5">
          <div className="text-lg font-bold text-white">Problem Categories</div>
          <div className="text-xs text-forge-muted mt-1 leading-relaxed max-w-2xl">
            Each category is an independent optimization axis. A submitted agent is evaluated across
            all categories — pick a category below to explore the problem pool and train on
            individual specs via the API or CLI.
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
                onSelect={() => navigate(`/problems/${r.id}`)}
              />
            ))}
          </div>
        )}

        {/* SOTA Gallery */}
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
          const featuredIds = new Set(featured.map((s) => s.spec_id));
          for (const s of allSota ?? []) {
            if (featured.length >= 6) break;
            if (!featuredIds.has(s.spec_id) && s.has_step) {
              featured.push(s);
              featuredIds.add(s.spec_id);
            }
          }
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
                    <button
                      key={sota.spec_id}
                      onClick={() =>
                        navigate(`/problems/${round?.id ?? ""}/${sota.spec_id}`)
                      }
                      className="text-left p-4 bg-forge-surface border border-forge-border rounded-xl hover:border-forge-accent/50 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
                          {spec?.name?.replace(/ — .*$/, "") ?? sota.spec_id}
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
                    </button>
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
                    {totalUnclaimed} specs unclaimed
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
                      <button
                        key={r.id}
                        onClick={() => navigate(`/problems/${r.id}`)}
                        className={`text-left p-5 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01] active:scale-[0.99] ${meta.borderColor} ${meta.bgColor} hover:border-opacity-80`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>
                            {r.name.replace(/Round \d+ — /, "")}
                          </div>
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}
                          >
                            {r.scoring_direction === "minimize" ? "↓" : "↑"} {r.scoring_metric}
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
                            {r.specs.length} unclaimed
                          </span>
                          <span className={`text-xs font-semibold ${meta.color}`}>
                            Claim SOTA →
                          </span>
                        </div>
                      </button>
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

// ─── Page: Category spec browser (/problems/:roundId) ─────────────────────────

function CategoryPage({ data }: { data: SharedData }) {
  const { roundId } = useParams<{ roundId: string }>();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const { specs, allRounds, sotaBySpec } = data;

  const round = allRounds.find((r) => r.id === roundId) ?? null;

  if (!round) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-forge-muted text-sm">Category not found.</div>
        <Link to="/problems" className="text-forge-accent text-xs hover:underline mt-2 inline-block">
          ← All categories
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
        ← All categories
      </Link>

      {/* Category header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xl ${meta.color}`}>{meta.icon}</span>
            <div className="text-lg font-bold text-white">
              {round.name.replace(/Round \d+ — /, "")}
            </div>
          </div>
          <div className="text-xs text-forge-muted mt-0.5 leading-relaxed max-w-xl">
            {round.description}
          </div>
          <div className="text-xs text-forge-muted font-mono mt-1">
            {round.scoring_direction === "minimize" ? "↓" : "↑"} {round.scoring_metric}
          </div>
        </div>
        <Link
          to="/guide"
          className="text-xs text-forge-accent hover:underline shrink-0"
        >
          New here? See the guide →
        </Link>
      </div>

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
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const navigate = useNavigate();
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

  if (!activeSpec) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-forge-muted text-sm">Spec not found.</div>
        <Link
          to={roundId ? `/problems/${roundId}` : "/problems"}
          className="text-forge-accent text-xs hover:underline mt-2 inline-block"
        >
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      {/* Sidebar — spec list */}
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
              {round.scoring_direction === "minimize" ? "↓" : "↑"} {round.scoring_metric}
            </div>
          </div>

          <CategorySpecList
            round={round}
            specs={specs ?? []}
            sotaBySpec={sotaBySpec}
            selectedTier={selectedTier}
            onTierChange={setSelectedTier}
            activeSpecId={specId ?? null}
            onSelectSpec={(id) => {
              setSelectedSubmission(null);
              navigate(`/problems/${round.id}/${id}`);
            }}
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

      {/* Mobile back button */}
      {round && (
        <div className="lg:hidden mb-4">
          <Link
            to={`/problems/${round.id}`}
            className="text-xs text-forge-muted hover:text-white flex items-center gap-1"
          >
            ← {round.name.replace(/Round \d+ — /, "")}
          </Link>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col gap-5">
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

        <SotaChart spec={activeSpec} />

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
        />

        <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
          <div className="text-sm font-semibold text-white mb-1">Beat the SOTA</div>
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
              No submissions yet — be the first to set the SOTA. Fork the repo and open a PR.
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
              --spec {activeSpec.id}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page: Rankings (/rankings) ───────────────────────────────────────────────

function RankingsPage({ data }: { data: SharedData }) {
  const navigate = useNavigate();
  const { overallData, overallLoading, allRounds } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="text-lg font-bold text-white">Agent Rankings</div>
          <div className="text-xs text-forge-muted mt-1 leading-relaxed">
            Agents ranked by normalized performance across all active problem categories. A
            well-rounded agent that excels at mass, stiffness-to-weight, <em>and</em> absolute
            stiffness scores highest — not just a specialist in one metric.
          </div>
        </div>
        <OverallLeaderboard
          data={overallData ?? null}
          loading={overallLoading}
          rounds={allRounds}
          onSelectAgent={(contributor) =>
            navigate(`/rankings/${encodeURIComponent(contributor)}`)
          }
        />
      </div>
    </div>
  );
}

// ─── Page: Agent detail (/rankings/:agentId) ──────────────────────────────────

function AgentDetailPage({ data }: { data: SharedData }) {
  const { agentId } = useParams<{ agentId: string }>();
  const { overallData, overallLoading, allRounds } = data;
  const contributor = agentId ? decodeURIComponent(agentId) : "";

  const entry = overallData?.entries.find((e) => e.contributor === contributor) ?? null;

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
        <div className="text-forge-muted text-sm mb-3">Agent not found: {contributor}</div>
        <Link to="/rankings" className="text-forge-accent text-xs hover:underline">
          ← All agents
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
        ← All agents
      </Link>

      {/* Agent header */}
      <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-white">{entry.contributor}</div>
            <div className="text-xs text-forge-muted mt-0.5">
              Rank{" "}
              <span className="text-white font-mono font-semibold">#{entry.rank}</span>
              {" · "}
              {entry.specs_entered} spec{entry.specs_entered !== 1 ? "s" : ""}
              {" · "}
              {entry.total_wins} win{entry.total_wins !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold text-white">
              #{entry.avg_rank.toFixed(1)}
            </div>
            <div className="text-xs text-forge-muted">avg rank</div>
          </div>
        </div>

        {/* Category breakdown */}
        {knownRounds.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {knownRounds.map((rid) => {
              const meta = CATEGORY_META_OL[rid];
              const bests = byRound[rid];
              const wins = bests.filter((b) => b.rank === 1).length;
              const bestRank = Math.min(...bests.map((b) => b.rank));
              const rep = bests.find((b) => b.rank === 1) ?? bests[0];
              return (
                <div key={rid} className={`rounded-lg border px-3 py-2 ${meta.bg} ${meta.border}`}>
                  <div className={`text-xs font-semibold ${meta.color} mb-1`}>{meta.label}</div>
                  <div className="text-xs text-white font-mono">
                    {fmtScore(rep.score, rep.score_metric)}
                  </div>
                  <div className="text-xs text-forge-muted mt-0.5">
                    {bests.length} spec{bests.length !== 1 ? "s" : ""}
                    {wins > 0 && (
                      <span className="text-yellow-400 ml-1">
                        · {wins} win{wins !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className={`ml-1 font-mono ${bestRank === 1 ? "text-yellow-400" : ""}`}>
                      #{bestRank}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-spec results */}
      <div className="bg-forge-surface border border-forge-border rounded-xl px-5 py-4">
        <div className="text-xs text-forge-muted mb-3 font-semibold uppercase tracking-wide">
          Per-spec results
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-forge-muted border-b border-forge-border">
              <th className="text-left pb-1.5 font-normal">Spec</th>
              <th className="text-left pb-1.5 font-normal">Category</th>
              <th className="text-right pb-1.5 font-normal">Score</th>
              <th className="text-right pb-1.5 font-normal">vs Baseline</th>
              <th className="text-right pb-1.5 font-normal">Rank</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const roundId = specToRound[b.spec_id];
              const meta = roundId ? CATEGORY_META_OL[roundId] : null;
              const isSota = b.rank === 1;
              const pct = b.normalized_score * 100;
              const normColor =
                pct <= 80
                  ? "text-forge-green"
                  : pct <= 100
                    ? "text-forge-accent"
                    : "text-forge-red";
              return (
                <tr key={b.spec_id} className="border-b border-forge-border/40 last:border-0">
                  <td className="py-1.5 font-mono text-white/80">{b.spec_id}</td>
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
                    {pct.toFixed(1)}%
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
          element={
            <div className="max-w-7xl mx-auto px-4 py-6">
              <QuickstartGuide />
            </div>
          }
        />

        <Route
          path="/playground"
          element={
            <div className="max-w-7xl mx-auto px-4 py-6">
              <Playground specs={specs ?? []} loading={specsLoading} />
            </div>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
