"use client";

import { useEffect, useState } from "react";
import Appbar from "@/components/Appbar";
import { api, type ModelMetadata } from "@/lib/api";

function MetricPill({ label, value, color = "#60a5fa" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 16px", background: "rgba(255,255,255,.03)", borderRadius: 8, minWidth: 100 }}>
      <span style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function ParamTag({ k, v }: { k: string; v: string | number }) {
  return (
    <div style={{ display: "inline-flex", gap: 0, borderRadius: 6, overflow: "hidden", fontSize: 12, border: "1px solid #1e293b" }}>
      <span style={{ background: "#0f172a", color: "#64748b", padding: "4px 10px", fontWeight: 600 }}>{k}</span>
      <span style={{ background: "#111827", color: "#94a3b8", padding: "4px 10px", fontFamily: "monospace" }}>
        {typeof v === "number" && !Number.isInteger(v) ? v.toFixed(4) : String(v)}
      </span>
    </div>
  );
}

function FeatureChip({ name }: { name: string }) {
  return (
    <span style={{
      display: "inline-block",
      background: "rgba(59,130,246,.08)",
      color: "#60a5fa",
      border: "1px solid rgba(59,130,246,.2)",
      borderRadius: 6,
      padding: "3px 10px",
      fontSize: 12,
      fontFamily: "monospace",
    }}>
      {name}
    </span>
  );
}

function PipelineStep({ step, i, total }: { step: string; i: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "rgba(59,130,246,.15)",
        border: "1px solid rgba(59,130,246,.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "#60a5fa", flexShrink: 0,
      }}>
        {i + 1}
      </div>
      <span style={{ fontSize: 13, color: "#94a3b8" }}>{step}</span>
      {i < total - 1 && (
        <span style={{ color: "#334155", fontSize: 16, flexShrink: 0 }}>→</span>
      )}
    </div>
  );
}

export default function ModelPage() {
  const [meta, setMeta] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .modelInfo()
      .then(setMeta)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load model info"))
      .finally(() => setLoading(false));
  }, []);

  const pipelineSteps = meta?.pipeline.split(" → ") ?? [];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Appbar />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            Model Information
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Training metadata, hyperparameters, and test-set performance for the deployed models.
          </p>
        </div>

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[0, 1].map((i) => (
              <div key={i} className="card" style={{ height: 320, background: "rgba(255,255,255,.03)", animation: "pulse-glow 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        )}

        {error && (
          <div className="card" style={{ color: "#f87171", textAlign: "center", padding: 40 }}>
            ⚠ {error} — make sure the API server is running.
          </div>
        )}

        {meta && (
          <div className="animate-fade-in">
            {/* Trained at */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, color: "#475569", fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              Models trained at: <span style={{ color: "#64748b" }}>{new Date(meta.trained_at).toLocaleString()}</span>
            </div>

            {/* Models grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

              {/* Classifier */}
              <div className="card" style={{ borderColor: "rgba(59,130,246,.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(59,130,246,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    🌲
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{meta.classifier.model}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>Hazard Classifier</div>
                  </div>
                  <span className="badge-safe" style={{ marginLeft: "auto" }}>Active</span>
                </div>

                {/* Metrics */}
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  <MetricPill label="F1 Weighted"  value={meta.classifier.test_f1_weighted.toFixed(4)}  color="#60a5fa" />
                  <MetricPill label="AUC-ROC"      value={meta.classifier.test_auc_roc.toFixed(4)}      color="#818cf8" />
                  <MetricPill label="Accuracy"     value={meta.classifier.test_accuracy.toFixed(4)}     color="#34d399" />
                </div>

                {/* Hyperparams */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: ".05em", marginBottom: 10 }}>
                    HYPERPARAMETERS
                  </div>
                  {Object.keys(meta.classifier.hyperparams).length === 0 ? (
                    <div style={{ fontSize: 13, color: "#334155", fontStyle: "italic" }}>
                      Baseline model — no hyperparameter tuning applied (non-tunable family selected)
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(meta.classifier.hyperparams).map(([k, v]) => (
                        <ParamTag key={k} k={k} v={v} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "#334155", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  Selected from: <code style={{ color: "#475569" }}>{meta.classifier.selected_from}</code>
                </div>
              </div>

              {/* Regressor */}
              <div className="card" style={{ borderColor: "rgba(167,139,250,.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(167,139,250,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    📈
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{meta.regressor.model}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>Miss Distance Regressor</div>
                  </div>
                  <span className="badge-safe" style={{ marginLeft: "auto" }}>Active</span>
                </div>

                {/* Metrics */}
                <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                  <MetricPill label="R²"           value={meta.regressor.test_r2.toFixed(4)}       color="#a78bfa" />
                  <MetricPill label="RMSE (log)"   value={meta.regressor.test_rmse_log.toFixed(4)} color="#f472b6" />
                  <MetricPill label="RMSE (km)"    value={`${(meta.regressor.test_rmse_km / 1e6).toFixed(1)}M`} color="#fb923c" />
                </div>

                {/* Hyperparams */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: ".05em", marginBottom: 10 }}>
                    TUNED HYPERPARAMETERS (Optuna TPE, 50 trials)
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(meta.regressor.hyperparams).map(([k, v]) => (
                      <ParamTag key={k} k={k} v={v} />
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#334155", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  Trained on: train + val combined after tuning ·{" "}
                  Selected from: <code style={{ color: "#475569" }}>{meta.regressor.selected_from}</code>
                </div>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              {[
                { title: "Classifier Features", features: meta.features.clf_features, color: "#3b82f6" },
                { title: "Regressor Features",  features: meta.features.reg_features, color: "#a78bfa" },
              ].map(({ title, features, color }) => (
                <div key={title} className="card">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14, letterSpacing: ".03em" }}>
                    {title.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {features.map((f) => (
                      <FeatureChip key={f} name={f} />
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#334155" }}>
                    {features.length} features · engineered from raw NEO measurements
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 18, letterSpacing: ".03em" }}>
                MLOPS PIPELINE
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {pipelineSteps.map((step, i) => (
                  <PipelineStep key={step} step={step} i={i} total={pipelineSteps.length} />
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
                Automated Apache Airflow pipeline: raw CSV → feature engineering → baseline training →
                model selection → Optuna hyperparameter tuning → artifact extraction → FastAPI serving.
              </div>
            </div>

            {/* R² note */}
            <div className="card" style={{ marginTop: 20, borderColor: "rgba(245,158,11,.2)", background: "rgba(245,158,11,.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>
                ⚠ Note on Regressor R²
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                The low R² (~0.17) on miss distance is expected — NEO miss distances follow a near-uniform distribution
                (no strong predictor correlates with where in its orbit an asteroid happens to be). The classifier
                performance (F1 ≈ 0.91, AUC ≈ 0.92) is the primary production metric for this system.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
