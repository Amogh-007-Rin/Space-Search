"use client";

import { useState } from "react";
import Appbar from "@/components/Appbar";
import { api, type PredictionInput, type PredictionOutput } from "@/lib/api";

type AsteroidRow = PredictionInput & { id: string };
type ResultRow = PredictionOutput & { id: string; index: number };

const EMPTY_ROW = (): AsteroidRow => ({
  id: Math.random().toString(36).slice(2),
  est_diameter_min: 0,
  est_diameter_max: 0,
  relative_velocity: 0,
  absolute_magnitude: 0,
  miss_distance: 0,
});

const EXAMPLES: AsteroidRow[] = [
  { id: "ex1", est_diameter_min: 0.2658, est_diameter_max: 0.5943, relative_velocity: 73588,  absolute_magnitude: 20.0, miss_distance: 61438126  },
  { id: "ex2", est_diameter_min: 0.05,   est_diameter_max: 0.11,   relative_velocity: 22000,  absolute_magnitude: 24.0, miss_distance: 5000000   },
  { id: "ex3", est_diameter_min: 1.5,    est_diameter_max: 3.56,   relative_velocity: 54823,  absolute_magnitude: 16.1, miss_distance: 11256645  },
];

const COLS: { key: keyof PredictionInput; label: string; placeholder: string }[] = [
  { key: "est_diameter_min",   label: "Min Diam (km)",   placeholder: "0.265" },
  { key: "est_diameter_max",   label: "Max Diam (km)",   placeholder: "0.594" },
  { key: "relative_velocity",  label: "Velocity (km/h)", placeholder: "73588" },
  { key: "absolute_magnitude", label: "Magnitude",       placeholder: "20.0"  },
  { key: "miss_distance",      label: "Miss Dist (km)",  placeholder: "61438126" },
];

function StatusBadge({ h }: { h: boolean }) {
  return h ? <span className="badge-hazardous">⚠ Hazardous</span> : <span className="badge-safe">✓ Safe</span>;
}

export default function BatchPredictPage() {
  const [rows, setRows] = useState<AsteroidRow[]>([EMPTY_ROW()]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: string, key: keyof PredictionInput, val: string) => {
    const n = parseFloat(val);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: isNaN(n) ? 0 : n } : r)));
    setResults(null);
  };

  const addRow = () => {
    if (rows.length >= 100) return;
    setRows((rs) => [...rs, EMPTY_ROW()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((rs) => rs.filter((r) => r.id !== id));
    setResults(null);
  };

  const loadExamples = () => {
    setRows(EXAMPLES);
    setResults(null);
    setError(null);
  };

  const isValid = rows.every((r) =>
    COLS.every((c) => {
      const v = r[c.key];
      return v !== undefined && v > 0;
    })
  );

  const submit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const inputs: PredictionInput[] = rows.map(({ id: _id, ...rest }) => rest);
      const { predictions } = await api.predictBatch(inputs);
      setResults(predictions.map((p, i) => ({ ...p, id: rows[i].id, index: i + 1 })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Batch prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const hazCount = results ? results.filter((r) => r.hazardous).length : 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Appbar />

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            Batch Prediction
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Classify up to 100 asteroids in a single request. Each row is one asteroid.
          </p>
        </div>

        {/* Input table */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: "7px 16px" }} onClick={addRow} disabled={rows.length >= 100}>
              + Add Row
            </button>
            <button className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={loadExamples}>
              Load Examples
            </button>
            <span style={{ color: "#334155", fontSize: 13, marginLeft: "auto" }}>
              {rows.length} / 100 rows
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "#334155", fontSize: 11, fontWeight: 600, letterSpacing: ".04em", width: 40 }}>
                    #
                  </th>
                  {COLS.map((c) => (
                    <th key={c.key} style={{ padding: "10px 14px", textAlign: "left", color: "#475569", fontSize: 11, fontWeight: 600, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
                      {c.label.toUpperCase()}
                    </th>
                  ))}
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(30,41,59,.5)" }} className="neo-row">
                    <td style={{ padding: "8px 14px", color: "#334155", fontSize: 12, fontFamily: "monospace" }}>
                      {idx + 1}
                    </td>
                    {COLS.map((c) => (
                      <td key={c.key} style={{ padding: "6px 8px" }}>
                        <input
                          className="input-field"
                          type="number"
                          step="any"
                          placeholder={c.placeholder}
                          value={row[c.key] || ""}
                          onChange={(e) => updateRow(row.id, c.key, e.target.value)}
                          style={{ padding: "7px 10px", fontSize: 13, minWidth: 110 }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: "6px 8px" }}>
                      <button
                        className="btn-danger"
                        style={{ padding: "5px 10px", fontSize: 13 }}
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Submit */}
          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="btn-primary"
              style={{ padding: "11px 28px", fontSize: 14 }}
              onClick={submit}
              disabled={loading || !isValid}
            >
              {loading ? "Predicting…" : `Run Batch (${rows.length})`}
            </button>
            {results && (
              <button className="btn-ghost" onClick={() => { setResults(null); setError(null); }}>
                Clear Results
              </button>
            )}
            {!isValid && (
              <span style={{ fontSize: 12, color: "#475569" }}>Fill all fields (values must be &gt; 0)</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card animate-fade-in" style={{ borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)", color: "#f87171", marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="animate-fade-in">
            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Total Processed", value: results.length, color: "#60a5fa" },
                { label: "Hazardous", value: hazCount, color: "#f87171" },
                { label: "Safe", value: results.length - hazCount, color: "#4ade80" },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Results table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
                Prediction Results
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["#", "Status", "Hazard Probability", "Predicted Miss Distance (km)", "Probability Bar"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", whiteSpace: "nowrap" }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const pct = Math.round(r.hazardous_probability * 100);
                      const barColor = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
                      return (
                        <tr key={r.id} className="neo-row" style={{ borderBottom: "1px solid rgba(30,41,59,.5)" }}>
                          <td style={{ padding: "10px 16px", color: "#334155", fontFamily: "monospace" }}>{r.index}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <StatusBadge h={r.hazardous} />
                          </td>
                          <td style={{ padding: "10px 16px", fontWeight: 600, color: r.hazardous ? "#f87171" : "#4ade80" }}>
                            {pct}%
                          </td>
                          <td style={{ padding: "10px 16px", color: "#a78bfa" }}>
                            {r.miss_distance_km.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td style={{ padding: "10px 16px", width: 140 }}>
                            <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width .5s ease" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
