const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface NEORecord {
  id: number;
  name: string;
  est_diameter_min: number;
  est_diameter_max: number;
  relative_velocity: number;
  miss_distance: number;
  orbiting_body: string;
  sentry_object: boolean;
  absolute_magnitude: number;
  hazardous: boolean;
}

export interface NEOListResponse {
  total: number;
  offset: number;
  limit: number;
  count: number;
  data: NEORecord[];
}

export interface NEOSearchResponse {
  query: string;
  total: number;
  count: number;
  data: NEORecord[];
}

export interface NEOStats {
  total_records: number;
  hazardous_count: number;
  safe_count: number;
  hazardous_percentage: number;
  velocity_avg_kmph: number;
  velocity_max_kmph: number;
  miss_distance_avg_km: number;
  miss_distance_min_km: number;
  diameter_min_avg_km: number;
  diameter_max_avg_km: number;
  absolute_magnitude_avg: number;
}

export interface PredictionInput {
  est_diameter_min: number;
  est_diameter_max: number;
  relative_velocity: number;
  absolute_magnitude: number;
  miss_distance: number;
}

export interface PredictionOutput {
  hazardous: boolean;
  hazardous_probability: number;
  miss_distance_km: number;
}

export interface BatchPredictionResponse {
  count: number;
  predictions: PredictionOutput[];
}

export interface ModelClassifierMeta {
  model: string;
  selected_from: string;
  hyperparams: Record<string, number | string>;
  test_f1_weighted: number;
  test_auc_roc: number;
  test_accuracy: number;
}

export interface ModelRegressorMeta {
  model: string;
  selected_from: string;
  hyperparams: Record<string, number | string>;
  test_r2: number;
  test_rmse_log: number;
  test_rmse_km: number;
}

export interface ModelMetadata {
  trained_at: string;
  classifier: ModelClassifierMeta;
  regressor: ModelRegressorMeta;
  features: {
    clf_features: string[];
    reg_features: string[];
  };
  pipeline: string;
}

export interface HealthResponse {
  message: string;
  healthy: boolean;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => apiFetch<HealthResponse>("/"),

  modelInfo: () => apiFetch<ModelMetadata>("/model/info"),

  predict: (input: PredictionInput) =>
    apiFetch<PredictionOutput>("/predict", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  predictBatch: (inputs: PredictionInput[]) =>
    apiFetch<BatchPredictionResponse>("/neo/predict-batch", {
      method: "POST",
      body: JSON.stringify(inputs),
    }),

  neoAll: (limit = 50, offset = 0) =>
    apiFetch<NEOListResponse>(`/neo/info/all?limit=${limit}&offset=${offset}`),

  neoById: (id: number) =>
    apiFetch<NEORecord>(`/neo/info/${id}`),

  neoHazardous: (limit = 50, offset = 0) =>
    apiFetch<NEOListResponse>(`/neo/hazardous?limit=${limit}&offset=${offset}`),

  neoSafe: (limit = 50, offset = 0) =>
    apiFetch<NEOListResponse>(`/neo/safe?limit=${limit}&offset=${offset}`),

  neoStats: () => apiFetch<NEOStats>("/neo/stats"),

  neoSearch: (name: string, limit = 50) =>
    apiFetch<NEOSearchResponse>(`/neo/search?name=${encodeURIComponent(name)}&limit=${limit}`),
};
