"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Appbar from "@/components/Appbar";
import { api, type NEOStats, type NEORecord } from "@/lib/api";
import { BACKEND_URL } from "@/lib/config";

function StatCard({
  label,
  value,
  sub,
  color = "#3b82f6",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}
    >
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#475569" }}>{sub}</div>}
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        className="card"
        style={{
          cursor: "pointer",
          transition: "border-color .2s ease, transform .15s ease",
          borderColor: "var(--border)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = accent;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        <div style={{ marginBottom: 12, color: accent, fontSize: 28 }}>{icon}</div>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#e2e8f0", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
        <div style={{ marginTop: 14, fontSize: 13, color: accent, fontWeight: 500 }}>
          Open →
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<NEOStats | null>(null);
  const [recent, setRecent] = useState<NEORecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [h, s, r] = await Promise.all([
          api.health(),
          api.neoStats(),
          api.neoHazardous(5, 0),
        ]);
        setApiOnline(h.healthy);
        setStats(s);
        setRecent(r.data);
      } catch {
        setApiOnline(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fmtNum = (n: number) =>
    n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
      ? `${(n / 1e3).toFixed(1)}K`
      : n.toLocaleString();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <Appbar />

      {/* Hero */}
      <section
        className="star-bg"
        style={{
          padding: "64px 24px 52px",
          background: "linear-gradient(180deg, #070c1a 0%, var(--bg-base) 100%)",
          borderBottom: "1px solid var(--border)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* API status pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,.04)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "4px 12px",
            fontSize: 12,
            color: "#64748b",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background:
                apiOnline === null ? "#64748b" : apiOnline ? "#22c55e" : "#ef4444",
              display: "inline-block",
              flexShrink: 0,
            }}
            className={apiOnline ? "animate-pulse-glow" : ""}
          />
          {apiOnline === null
            ? "Connecting to API..."
            : apiOnline
            ? `API Online — ${BACKEND_URL}`
            : "API Offline — Start the FastAPI server"}
        </div>

        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#f1f5f9",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Near Earth Object
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Prediction System
          </span>
        </h1>
        <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto 32px" }}>
          ML-powered hazard classification and miss-distance estimation for NASA&apos;s
          90,836-record NEO dataset. Built on a fully automated Airflow MLOps pipeline.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/predict">
            <button className="btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
              Run Prediction
            </button>
          </Link>
          <Link href="/neo">
            <button className="btn-ghost" style={{ padding: "12px 28px", fontSize: 15 }}>
              Explore NEOs
            </button>
          </Link>
        </div>
      </section>

      {/* Main content */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>

        {/* Stats row */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ height: 90, background: "rgba(255,255,255,.03)", animation: "pulse-glow 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : stats ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 16, marginBottom: 48 }}>
            <StatCard label="Total NEOs"        value={fmtNum(stats.total_records)}          sub="objects tracked" />
            <StatCard label="Hazardous"         value={fmtNum(stats.hazardous_count)}        sub={`${stats.hazardous_percentage}% of total`} color="#f87171" />
            <StatCard label="Safe"              value={fmtNum(stats.safe_count)}             sub="non-hazardous" color="#4ade80" />
            <StatCard label="Avg Velocity"      value={`${fmtNum(stats.velocity_avg_kmph)}`} sub="km/h average" color="#fb923c" />
            <StatCard label="Max Velocity"      value={`${fmtNum(stats.velocity_max_kmph)}`} sub="km/h peak" color="#fb923c" />
            <StatCard label="Closest Approach"  value={`${fmtNum(stats.miss_distance_min_km)} km`} sub="min miss distance" color="#a78bfa" />
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "#475569", marginBottom: 48 }}>
            Could not load statistics — make sure the API server is running at{" "}
            <code style={{ color: "#3b82f6" }}>{BACKEND_URL}</code>
          </div>
        )}

        {/* Quick Actions */}
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#94a3b8", marginBottom: 16, letterSpacing: ".03em" }}>
          EXPLORE
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16, marginBottom: 48 }}>
          <QuickActionCard
            href="/neo"
            accent="#3b82f6"
            title="NEO Explorer"
            desc="Browse all 90K+ objects with search, pagination, and hazard filtering."
            icon="🔭"
          />
          <QuickActionCard
            href="/predict"
            accent="#06b6d4"
            title="Single Prediction"
            desc="Enter asteroid parameters and get instant hazard classification + miss distance."
            icon="🎯"
          />
          <QuickActionCard
            href="/predict/batch"
            accent="#a78bfa"
            title="Batch Prediction"
            desc="Classify up to 100 asteroids in one request. Review results in a table."
            icon="📊"
          />
          <QuickActionCard
            href="/model"
            accent="#f59e0b"
            title="Model Info"
            desc="View trained model metadata, hyperparameters, and test set metrics."
            icon="🧠"
          />
        </div>

        {/* Recent hazardous table */}
        {recent.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#94a3b8", letterSpacing: ".03em" }}>
                RECENT HAZARDOUS OBJECTS
              </h2>
              <Link href="/neo" style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none" }}>
                View all →
              </Link>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["ID", "Name", "Velocity (km/h)", "Miss Distance (km)", "Magnitude"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((neo) => (
                    <tr key={neo.id} className="neo-row" style={{ borderBottom: "1px solid rgba(30,41,59,.6)" }}>
                      <td style={{ padding: "11px 16px", color: "#475569", fontFamily: "monospace" }}>{neo.id}</td>
                      <td style={{ padding: "11px 16px", color: "#e2e8f0", fontWeight: 500 }}>{neo.name}</td>
                      <td style={{ padding: "11px 16px", color: "#fb923c" }}>{neo.relative_velocity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: "11px 16px", color: "#94a3b8" }}>{neo.miss_distance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: "11px 16px", color: "#94a3b8" }}>{neo.absolute_magnitude}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px", textAlign: "center", color: "#334155", fontSize: 12, marginTop: 40 }}>
        Space Search · NEO Prediction System · MLOps Pipeline (Airflow + FastAPI + Next.js)
      </footer>
    </div>
  );
}
