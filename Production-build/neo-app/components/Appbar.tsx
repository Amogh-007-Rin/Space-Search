"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "./LoginButton";
import SignUpButton from "./SignUpButton";
import AirflowRedirectButton from "./AirflowRedirectButton";

const NAV = [
  { label: "Dashboard",   href: "/" },
  { label: "NEO Explorer",href: "/neo" },
  { label: "Predict",     href: "/predict" },
  { label: "Batch",       href: "/predict/batch" },
  { label: "Model Info",  href: "/model" },
];

export default function Appbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,15,30,0.92)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#3b82f6" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="#3b82f6" strokeWidth="1.4" fill="none" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="#3b82f6" strokeWidth="1.4" fill="none"
              transform="rotate(60 12 12)" opacity=".5" />
            <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="#3b82f6" strokeWidth="1.4" fill="none"
              transform="rotate(-60 12 12)" opacity=".5" />
          </svg>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, letterSpacing: "0.06em" }}>
            SPACE SEARCH
          </span>
        </Link>

        {/* Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
          {NAV.map(({ label, href }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all .18s ease",
                  color: active ? "#60a5fa" : "#64748b",
                  background: active ? "rgba(59,130,246,.1)" : "transparent",
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </Link>
              
            );
          })}
        <AirflowRedirectButton></AirflowRedirectButton>
        </nav>

        {/* Auth Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <LoginButton />
          <SignUpButton />
        </div>
      </div>
    </header>
  );
}