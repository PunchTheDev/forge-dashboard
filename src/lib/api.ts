const BASE = import.meta.env.VITE_API_URL ?? "/api";

/** Public API base URL — use this in components that display it to users. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface SpecConstraints {
  load_newtons: number;
  load_point_mm: number[];
  safety_factor: number;
  bolt_pattern_mm: number[][];
  bolt_diameter_clearance_mm: number;
  mount_face_x_mm: number;
  build_volume_mm: number[];
  max_overhang_deg: number;
  min_wall_thickness_mm: number;
}

export interface SpecScoring {
  metric: string;
  direction: string;
  baseline_mass_grams?: number;
  baseline_stiffness_to_weight?: number;
  baseline_deflection_mm?: number;
}

export interface MetricConfig {
  label: string;
  unit: string;
  decimals: number;
  baselineKey: keyof SpecScoring;
}

export const METRIC_CONFIG: Record<string, MetricConfig> = {
  mass_grams:          { label: "Mass",             unit: "g",        decimals: 2, baselineKey: "baseline_mass_grams" },
  volume_mm3:          { label: "Volume",            unit: "mm³",      decimals: 0, baselineKey: "baseline_mass_grams" },
  stiffness_to_weight: { label: "Stiffness/weight", unit: "N/(mm·g)", decimals: 3, baselineKey: "baseline_stiffness_to_weight" },
  deflection_mm:       { label: "Deflection",       unit: "mm",       decimals: 4, baselineKey: "baseline_deflection_mm" },
};

export function metricConfig(metric: string): MetricConfig {
  return METRIC_CONFIG[metric] ?? { label: metric, unit: "", decimals: 3, baselineKey: "baseline_mass_grams" };
}

export function fmtScore(value: number, metric: string): string {
  const { decimals, unit } = metricConfig(metric);
  return unit ? `${value.toFixed(decimals)} ${unit}` : value.toFixed(decimals);
}

export function specBaseline(scoring: SpecScoring): number | null {
  const { baselineKey } = metricConfig(scoring.metric);
  const v = scoring[baselineKey];
  return typeof v === "number" ? v : null;
}

export interface Spec {
  id: string;
  version: string;
  name: string;
  description: string;
  material: string;
  constraints: SpecConstraints;
  scoring: SpecScoring;
  tier: string | null;
  round_id: string | null;
}

export interface Submission {
  id: string;
  spec_id: string;
  agent_path: string;
  contributor: string;
  commit_hash: string;
  mass_grams: number;
  score: number | null;
  score_metric: string;
  score_direction: string;
  fea_stress_mpa: number;
  fea_allowable_mpa: number;
  passed: boolean;
  pr_number: number | null;
  notes: string | null;
  submitted_at: string;
  has_step: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  submission_id: string;
  contributor: string;
  agent_path: string;
  mass_grams: number;
  score: number;
  score_metric: string;
  score_direction: string;
  fea_stress_mpa: number;
  commit_hash: string;
  submitted_at: string;
  pr_number: number | null;
  has_step: boolean;
}

interface LeaderboardResponse {
  spec_id: string;
  entries: LeaderboardEntry[];
}

export interface SotaHistoryPoint {
  score: number;
  contributor: string;
  agent_path: string;
  submitted_at: string;
}

export interface SotaRecord {
  spec_id: string;
  submission_id: string;
  has_step: boolean;
  score_grams: number;
  score: number;
  score_metric: string;
  score_direction: string;
  agent: string;
  contributor: string;
  fea_stress_mpa: number;
  fea_allowable_mpa: number;
  commit_hash: string;
  submitted_at: string;
  note: string | null;
}

export interface OverallSpecBest {
  spec_id: string;
  rank: number;
  mass_grams: number;
  score: number;
  score_metric: string;
  normalized_score: number;
  submission_id: string;
  submitted_at: string;
}

export interface OverallEntry {
  rank: number;
  contributor: string;
  specs_entered: number;
  total_wins: number;
  avg_rank: number;
  overall_score?: number; // mean normalized score across ALL active specs; < 1.0 = beating baseline
  best: OverallSpecBest[];
}

export interface OverallLeaderboard {
  total_specs: number;
  entries: OverallEntry[];
}

// Yield stress by material key (MPa), matching forge benchmark/materials.py
const YIELD_STRESS: Record<string, number> = {
  pla: 50,
  petg: 40,
  aluminum_6061: 276,
  stainless_316: 205,
  steel_mild: 250,
};

/** Allowable stress for a spec = material yield / safety factor. */
export function allowableStress(spec: Spec): number {
  return (YIELD_STRESS[spec.material] ?? 50) / spec.constraints.safety_factor;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** URL for the raw STEP bytes of a submission — used by the 3D viewer. */
export function stepUrl(submissionId: string): string {
  return `${BASE}/submissions/${submissionId}/step`;
}

export interface RoundSpec {
  id: string;
  tier: string;
}

export interface Round {
  id: string;
  name: string;
  description: string;
  status: string;
  starts: string;
  ends: string | null;
  scoring_metric: string;
  scoring_direction: string;
  specs: RoundSpec[];
  notes: string | null;
}

export interface EvalPreviewResult {
  passed: boolean;
  score: number | null;
  score_metric: string;
  score_direction: string;
  stage: string;
  reason: string;
  fea_stress_mpa: number | null;
  fea_allowable_mpa: number | null;
  fea_element_count: number | null;
  fea_load_node_count: number | null;
  fea_convergence_deviation: number | null;
  fea_displacement_mm: number | null;
  similarity: number | null;
  elapsed_seconds: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().then((d) => d?.detail ?? res.statusText).catch(() => res.statusText);
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  specs: () => get<Spec[]>("/specs"),
  spec: (id: string) => get<Spec>(`/specs/${id}`),
  submissions: (specId?: string, passedOnly = false) =>
    get<Submission[]>(
      `/submissions?passed_only=${passedOnly}${specId ? `&spec_id=${specId}` : ""}`,
    ),
  leaderboard: (specId: string) =>
    get<LeaderboardResponse>(`/leaderboard/${specId}`).then((r) => r.entries),
  sota: (specId: string) => get<SotaRecord>(`/sota/${specId}`),
  sotaHistory: (specId: string) => get<SotaHistoryPoint[]>(`/sota/${specId}/history`),
  sotaAll: () => get<SotaRecord[]>("/sota"),
  overallLeaderboard: () => get<OverallLeaderboard>("/leaderboard/overall"),
  health: () => get<{ status: string }>("/health"),
  evalPreview: (agentCode: string, specId: string) =>
    post<EvalPreviewResult>("/eval/preview", { agent_code: agentCode, spec_id: specId }),
  activeRounds: () => get<Round[]>("/rounds/active"),
};
