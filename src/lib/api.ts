const BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface Spec {
  id: string;
  name: string;
  description: string;
  load_n: number;
  material: string;
  max_stress_mpa: number;
  build_volume_mm: [number, number, number];
  bolt_holes: number;
  created_at: string;
}

export interface Submission {
  id: number;
  spec_id: string;
  contributor: string;
  commit_hash: string;
  mass_g: number;
  max_stress_mpa: number;
  passed: boolean;
  error: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  contributor: string;
  mass_g: number;
  max_stress_mpa: number;
  commit_hash: string;
  created_at: string;
  submission_id: number;
}

export interface SotaRecord {
  spec_id: string;
  contributor: string;
  mass_g: number;
  max_stress_mpa: number;
  commit_hash: string;
  updated_at: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  specs: () => get<Spec[]>("/specs"),
  spec: (id: string) => get<Spec>(`/specs/${id}`),
  submissions: (specId?: string) =>
    get<Submission[]>(specId ? `/submissions?spec_id=${specId}` : "/submissions"),
  leaderboard: (specId: string) => get<LeaderboardEntry[]>(`/leaderboard/${specId}`),
  sota: (specId: string) => get<SotaRecord>(`/sota/${specId}`),
  sotaAll: () => get<SotaRecord[]>("/sota"),
  health: () => get<{ status: string }>("/health"),
};
