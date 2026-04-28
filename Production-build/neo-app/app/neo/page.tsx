"use client";

import { useEffect, useState, useCallback } from "react";
import Appbar from "@/components/Appbar";
import { api, type NEORecord } from "@/lib/api";

const PAGE_SIZE = 50;

type FilterTab = "all" | "hazardous" | "safe";

function HazardBadge({ hazardous }: { hazardous: boolean }) {
  return hazardous ? (
    <span className="badge-hazardous">⚠ Hazardous</span>
  ) : (
    <span className="badge-safe">✓ Safe</span>
  );
}

function Pagination({
  offset,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderTop: "1px solid var(--border)" }}>
      <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }} onClick={onPrev} disabled={offset === 0}>
        ← Prev
      </button>
      <span style={{ color: "#64748b", fontSize: 13, flex: 1, textAlign: "center" }}>
        Page {page} of {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} total
      </span>
      <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 13 }} onClick={onNext} disabled={offset + pageSize >= total}>
        Next →
      </button>
    </div>
  );
}

export default function NEOPage() {
  const [tab, setTab] = useState<FilterTab>("all");
  const [offset, setOffset] = useState(0);
  const [records, setRecords] = useState<NEORecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NEORecord[] | null>(null);
  const [searching, setSearching] = useState(false);

  // ID lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState<NEORecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const fetchData = useCallback(async (filter: FilterTab, off: number) => {
    setLoading(true);
    setError(null);
    try {
      const res =
        filter === "all"
          ? await api.neoAll(PAGE_SIZE, off)
          : filter === "hazardous"
          ? await api.neoHazardous(PAGE_SIZE, off)
          : await api.neoSafe(PAGE_SIZE, off);
      setRecords(res.data);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    setSearchResults(null);
    setSearchQuery("");
    fetchData(tab, 0);
  }, [tab, fetchData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.neoSearch(searchQuery.trim(), 100);
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const handleLookup = async () => {
    const id = parseInt(lookupId.trim(), 10);
    if (isNaN(id)) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const rec = await api.neoById(id);
      setLookupResult(rec);
    } catch {
      setLookupError("No NEO found with that ID.");
    } finally {
      setLookupLoading(false);
    }
  };

  const displayRows = searchResults !== null ? searchResults : records;

  const TAB_LABELS: { key: FilterTab; label: string; count?: string }[] = [
    { key: "all",       label: "All Objects" },
    { key: "hazardous", label: "Hazardous", },
    { key: "safe",      label: "Safe" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Appbar />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
            NEO Explorer
          </h1>
          <p style={{ color: "#475569", fontSize: 14 }}>
            Browse, search, and filter the complete NASA Near Earth Object dataset.
          </p>
        </div>

        {/* ID Lookup */}
        <div className="card" style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 600, letterSpacing: ".04em" }}>
              LOOKUP BY ID
            </label>
            <input
              className="input-field"
              style={{ width: "100%" }}
              placeholder="e.g. 2277475"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleLookup}
            disabled={lookupLoading || !lookupId.trim()}
            style={{ flexShrink: 0 }}
          >
            {lookupLoading ? "Searching…" : "Lookup"}
          </button>
          {lookupResult && (
            <button className="btn-ghost" style={{ flexShrink: 0 }} onClick={() => { setLookupResult(null); setLookupId(""); }}>
              Clear
            </button>
          )}
        </div>

        {/* Lookup result */}
        {lookupError && (
          <div className="card" style={{ marginBottom: 16, color: "#f87171", fontSize: 14 }}>{lookupError}</div>
        )}
        {lookupResult && (
          <div className="card animate-fade-in" style={{ marginBottom: 20, borderColor: "rgba(59,130,246,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>{lookupResult.name}</span>
              <HazardBadge hazardous={lookupResult.hazardous} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
              {[
                ["ID", lookupResult.id],
                ["Diameter Min", `${lookupResult.est_diameter_min.toFixed(4)} km`],
                ["Diameter Max", `${lookupResult.est_diameter_max.toFixed(4)} km`],
                ["Velocity", `${lookupResult.relative_velocity.toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h`],
                ["Miss Distance", `${lookupResult.miss_distance.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`],
                ["Magnitude", lookupResult.absolute_magnitude],
                ["Orbiting Body", lookupResult.orbiting_body],
                ["Sentry Object", lookupResult.sentry_object ? "Yes" : "No"],
              ].map(([k, v]) => (
                <div key={String(k)} style={{ fontSize: 13 }}>
                  <div style={{ color: "#475569", fontSize: 11, fontWeight: 600, letterSpacing: ".04em", marginBottom: 2 }}>{String(k).toUpperCase()}</div>
                  <div style={{ color: "#cbd5e1" }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            className="input-field"
            style={{ flex: 1, minWidth: 240 }}
            placeholder="Search by name (e.g. Apollo, Amor, Atira...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn-primary" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
            {searching ? "Searching…" : "Search"}
          </button>
          {searchResults !== null && (
            <button className="btn-ghost" onClick={clearSearch}>Clear</button>
          )}
        </div>

        {/* Tabs */}
        {searchResults === null && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {TAB_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={tab === key ? "tab-active" : "tab-inactive"}
                style={{
                  padding: "7px 16px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1px solid",
                  cursor: "pointer",
                  transition: "all .18s ease",
                }}
              >
                {label}
                {tab === key && total > 0 && (
                  <span style={{ marginLeft: 6, opacity: .7, fontSize: 12 }}>
                    ({total.toLocaleString()})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {searchResults !== null && (
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
            Found <strong style={{ color: "#94a3b8" }}>{searchResults.length}</strong> result{searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
        )}

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading && searchResults === null ? (
            <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⟳</div>
              Loading objects…
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: "#f87171" }}>
              {error}. Is the API server running?
            </div>
          ) : displayRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
              No records found.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["ID", "Name", "Velocity (km/h)", "Miss Distance (km)", "Mag.", "Diameter (km)", "Status"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            color: "#475569",
                            fontWeight: 600,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((neo) => (
                      <tr key={neo.id} className="neo-row" style={{ borderBottom: "1px solid rgba(30,41,59,.5)" }}>
                        <td style={{ padding: "10px 16px", color: "#334155", fontFamily: "monospace", fontSize: 12 }}>
                          {neo.id}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#e2e8f0", fontWeight: 500, maxWidth: 260 }}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {neo.name}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", color: "#fb923c" }}>
                          {neo.relative_velocity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#94a3b8" }}>
                          {neo.miss_distance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#94a3b8" }}>
                          {neo.absolute_magnitude}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#94a3b8" }}>
                          {neo.est_diameter_min.toFixed(3)}–{neo.est_diameter_max.toFixed(3)}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <HazardBadge hazardous={neo.hazardous} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {searchResults === null && (
                <Pagination
                  offset={offset}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPrev={() => {
                    const next = Math.max(0, offset - PAGE_SIZE);
                    setOffset(next);
                    fetchData(tab, next);
                  }}
                  onNext={() => {
                    const next = offset + PAGE_SIZE;
                    setOffset(next);
                    fetchData(tab, next);
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
