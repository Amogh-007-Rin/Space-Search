"use client";

import { useState } from "react";
import Appbar from "@/components/Appbar";
import { api, type PredictionInput, type PredictionOutput } from "@/lib/api";

const FIELDS: {
  key: keyof PredictionInput;
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    key: "est_diameter_min",
    label: "Min Diameter (km)",
    placeholder: "e.g. 0.265",
    hint: "Minimum estimated diameter in kilometres",
  },
  {
    key: "est_diameter_max",
    label: "Max Diameter (km)",
    placeholder: "e.g. 0.594",
    hint: "Maximum estimated diameter in kilometres",
  },
  {
    key: "relative_velocity",
    label: "Relative Velocity (km/h)",
    placeholder: "e.g. 73588",
    hint: "Speed relative to Earth in km/h",
  },
  {
    key: "absolute_magnitude",
    label: "Absolute Magnitude (H)",
    placeholder: "e.g. 20.0",
    hint: "Lower value = larger / brighter object",
  },
  {
    key: "miss_distance",
    label: "Miss Distance (km)",
    placeholder: "e.g. 61438126",
    hint: "Closest distance to Earth centre in km",
  },
];

const EXAMPLE: PredictionInput = {
  est_diameter_min: 0.2658,
  est_diameter_max: 0.5943,
  relative_velocity: 73588,
  absolute_magnitude: 20.0,
  miss_distance: 61438126,
};

function ProbabilityBar({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100);
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "#64748b" }}>
        <span>Hazard Probability</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 7, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: "width .6s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function PredictPage() {
  const [form, setForm] = useState<Partial<PredictionInput>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof PredictionInput, val: string) => {
    const n = parseFloat(val);
    setForm((f) => ({ ...f, [key]: isNaN(n) ? undefined : n }));
    setResult(null);
    setError(null);
  };

  const isValid = FIELDS.every((f) => {
    const v = form[f.key];
    return v !== undefined && v > 0;
  });

  const loadExample = () => {
    setForm(EXAMPLE);
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const out = await api.predict(form as PredictionInput);
      setResult(out);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Appbar />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            Hazard Prediction
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Enter asteroid parameters to classify hazard level and estimate miss distance.
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", letterSpacing: ".04em", textTransform: "uppercase" }}>
              Asteroid Parameters
            </h2>
            <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={loadExample}>
              Load Example
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600, letterSpacing: ".04em" }}>
                  {f.label.toUpperCase()}
                </label>
                <input
                  className="input-field"
                  type="number"
                  step="any"
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ""}
                  onChange={(e) => update(f.key, e.target.value)}
                />
                <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{f.hint}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="btn-primary"
              style={{ padding: "12px 32px", fontSize: 15 }}
              onClick={submit}
              disabled={loading || !isValid}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="animate-spin-slow" style={{ display: "inline-block" }}>⟳</span>
                  Predicting…
                </span>
              ) : (
                "Run Prediction"
              )}
            </button>
            {Object.keys(form).length > 0 && (
              <button className="btn-ghost" onClick={() => { setForm({}); setResult(null); setError(null); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="card animate-fade-in"
            style={{ borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)", color: "#f87171", fontSize: 14, marginBottom: 24 }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="card animate-fade-in"
            style={{
              borderColor: result.hazardous ? "rgba(239,68,68,.35)" : "rgba(34,197,94,.35)",
              background: result.hazardous ? "rgba(239,68,68,.05)" : "rgba(34,197,94,.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: result.hazardous ? "rgba(239,68,68,.15)" : "rgba(34,197,94,.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {result.hazardous ? "⚠️" : "✅"}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: result.hazardous ? "#f87171" : "#4ade80", marginBottom: 4 }}>
                  {result.hazardous ? "HAZARDOUS OBJECT" : "SAFE OBJECT"}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Model classification result
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Predicted Miss Distance
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#a78bfa" }}>
                  {result.miss_distance_km.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>kilometres from Earth</div>
              </div>

              <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                  Hazard Probability
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: result.hazardous ? "#f87171" : "#4ade80" }}>
                  {Math.round(result.hazardous_probability * 100)}%
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>classification confidence</div>
              </div>
            </div>

            <ProbabilityBar prob={result.hazardous_probability} />

            <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(255,255,255,.03)", borderRadius: 8, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              <strong style={{ color: "#64748b" }}>Classifier:</strong> RandomForestClassifier ·{" "}
              <strong style={{ color: "#64748b" }}>Regressor:</strong> GradientBoostingRegressor (Optuna-tuned)
            </div>
          </div>
        )}

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 32 }}>
          {[
            {
              title: "Classification",
              body: "RandomForestClassifier predicts hazard/safe based on 7 engineered features including log-transformed diameter, velocity, and miss distance.",
              color: "#3b82f6",
            },
            {
              title: "Distance Regression",
              body: "GradientBoostingRegressor (104 trees, depth 7) estimates log miss distance, trained on combined train+val set after Optuna tuning.",
              color: "#a78bfa",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
