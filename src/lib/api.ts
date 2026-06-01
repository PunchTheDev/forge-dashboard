const BASE = import.meta.env.VITE_API_URL ?? "/api";

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
  baseline_mass_grams: number;
}

export interface Spec {
  id: string;
  version: string;
  name: string;
  description: string;
  material: string;
  constraints: SpecConstraints;
  scoring: SpecScoring;
}

export interface Submission {
  id: string;
  spec_id: string;
  agent_path: string;
  contributor: string;
  commit_hash: string;
  mass_grams: number;
  fea_stress_mpa: number;
  fea_allowable_mpa: number;
  passed: boolean;
  pr_number: number | null;
  notes: string | null;
  submitted_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  contributor: string;
  agent_path: string;
  mass_grams: number;
  fea_stress_mpa: number;
  commit_hash: string;
  submitted_at: string;
  pr_number: number | null;
}

interface LeaderboardResponse {
  spec_id: string;
  entries: LeaderboardEntry[];
}

export interface SotaRecord {
  spec_id: string;
  score_grams: number;
  agent: string;
  contributor: string;
  fea_stress_mpa: number;
  fea_allowable_mpa: number;
  commit_hash: string;
  submitted_at: string;
  note: string | null;
}

// Yield stress by material key (MPa), matching forge benchmark/materials.py
const YIELD_STRESS: Record<string, number> = {
  pla: 50,
  petg: 40,
  aluminum_6061: 276,
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
  sotaAll: () => get<SotaRecord[]>("/sota"),
  health: () => get<{ status: string }>("/health"),
};
