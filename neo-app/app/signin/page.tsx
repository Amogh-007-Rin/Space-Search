"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const EarthScene = dynamic(() => import("@/components/EarthScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: "#030712" }} />,
});

// ── SSO icon SVGs ────────────────────────────────────────────────────────────
function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#f09433" />
          <stop offset="25%"  stopColor="#e6683c" />
          <stop offset="50%"  stopColor="#dc2743" />
          <stop offset="75%"  stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.5" stroke="url(#ig)" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1" fill="url(#ig)" />
    </svg>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 60" />
    </svg>
  );
}

// ── SSO button ───────────────────────────────────────────────────────────────
function SSOButton({
  provider, icon, label, className,
}: {
  provider: string;
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.975 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signIn(provider, { callbackUrl: "/" });
      }}
      className={`flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {busy ? <Spinner /> : icon}
      <span>{busy ? "Connecting…" : label}</span>
    </motion.button>
  );
}

// ── Fade-slide for form rows ─────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0  },
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SignInPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", { username: email, password, redirect: false });
      if (res?.error) setError("Invalid credentials — please try again.");
      else window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#030712" }}>

      {/* ── Left panel: 3-D Earth ─────────────────────────────────────── */}
      <div className="hidden lg:block lg:w-1/2 relative" style={{ borderRight: "1px solid #0f1e38" }}>
        <EarthScene />
      </div>

      {/* ── Right panel: form ────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ background: "linear-gradient(160deg, #040d1c 0%, #030712 60%)" }}
      >
        <div className="flex-1 flex items-center justify-center px-8 py-14">

          <motion.div
            className="w-full max-w-[400px]"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          >

            {/* Logo */}
            <motion.div variants={fadeUp}>
              <Link href="/" className="inline-flex items-center gap-2 mb-10 group no-underline">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="#3b82f6" />
                  <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
                  <ellipse cx="12" cy="12" rx="10" ry="4.5" stroke="#3b82f6" strokeWidth="1.5" fill="none" transform="rotate(60 12 12)" opacity=".5" />
                </svg>
                <span className="text-sm font-bold tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">
                  SPACE SEARCH
                </span>
              </Link>
            </motion.div>

            {/* Heading */}
            <motion.div variants={fadeUp} className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 mb-1">Welcome back</h1>
              <p className="text-sm text-slate-500">Sign in to NEO Prediction System</p>
            </motion.div>

            {/* SSO buttons */}
            <motion.div variants={fadeUp} className="flex flex-col gap-2.5 mb-6">
              <SSOButton
                provider="github"
                icon={<GithubIcon />}
                label="Continue with GitHub"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
              />
              <SSOButton
                provider="google"
                icon={<GoogleIcon />}
                label="Continue with Google"
                className="bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-slate-700/60"
              />
              <SSOButton
                provider="instagram"
                icon={<InstagramIcon />}
                label="Continue with Instagram"
                className="bg-gradient-to-r from-purple-950/60 to-pink-950/60 hover:from-purple-900/70 hover:to-pink-900/70 text-slate-200 border border-purple-800/30"
              />
            </motion.div>

            {/* Divider */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: "#0f1e38" }} />
              <span className="text-xs text-slate-700">or continue with email</span>
              <div className="flex-1 h-px" style={{ background: "#0f1e38" }} />
            </motion.div>

            {/* Credentials form */}
            <motion.form
              variants={fadeUp}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5"
                  style={{ color: "#4a6080" }}>
                  Email
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5"
                  style={{ color: "#4a6080" }}>
                  Password
                </label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl px-3.5 py-2.5 text-sm text-red-400"
                    style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.975 }}
                type="submit"
                disabled={loading}
                className="btn-primary mt-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                {loading ? "Signing in…" : "Sign In"}
              </motion.button>
            </motion.form>

            {/* Footer link */}
            <motion.p variants={fadeUp} className="mt-7 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-500 hover:text-blue-400 transition-colors font-medium">
                Sign up
              </Link>
            </motion.p>

          </motion.div>
        </div>

        <div className="pb-6 text-center">
          <Link href="/" className="text-xs text-slate-700 hover:text-slate-500 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
