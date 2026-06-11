"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const STATS = [
  { icon: Users,      value: "12M+",  label: "Simulated citizens" },
  { icon: TrendingUp, value: "94%",   label: "Policy accuracy" },
  { icon: Zap,        value: "< 2s",  label: "Scenario runtime" },
  { icon: ShieldCheck,value: "ISO 27001", label: "GovCloud certified" },
];

const FEATURES = [
  "Test policies before real-world rollout",
  "AI-driven agent simulation at city scale",
  "Real-time analytics & impact forecasting",
  "Secure, auditable governance platform",
];

export default function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[56%] flex-col overflow-hidden bg-city-graphite">
        {/* Animated grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(47,107,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,158,157,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute left-1/3 top-1/3 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-city-signal/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 size-[320px] rounded-full bg-city-aqua/8 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white/10 border border-white/15 text-white">
              <Building2 className="size-5" />
            </div>
            <span className="text-title-md font-bold text-white tracking-tight">PolisAI</span>
          </div>

          {/* Hero copy */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-city-aqua/30 bg-city-aqua/10 px-3.5 py-1.5">
                <Sparkles className="size-3.5 text-city-aqua" />
                <span className="text-caption font-semibold text-city-aqua">AI Societal Digital Twin</span>
              </div>
              <h1 className="text-display-lg font-bold text-white leading-[0.96]">
                Govern smarter.<br />
                <span className="text-city-aqua">Simulate first.</span>
              </h1>
              <p className="text-body text-white/60 max-w-sm leading-relaxed">
                Model policy, economics, climate, and civic outcomes in a living simulated city — before any real-world impact.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-body-sm text-white/70">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-city-aqua/20 text-city-aqua">
                    <svg viewBox="0 0 12 12" fill="none" className="size-2.5">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1"
              >
                <Icon className="size-4 text-city-aqua mb-2" />
                <p className="text-title-md font-bold text-white">{value}</p>
                <p className="text-caption text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-city-grid [background-size:32px_32px] opacity-40" />

        <div className="relative z-10 w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="grid size-12 place-items-center rounded-2xl bg-city-graphite text-white shadow-polis-md">
              <Building2 className="size-6" />
            </div>
            <div className="text-center">
              <h1 className="text-display-md text-foreground">PolisAI</h1>
              <p className="mt-1 text-body-sm text-muted-foreground">AI-powered societal digital twin</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-title-lg font-bold text-foreground">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {tab === "login"
                ? "Sign in to your PolisAI workspace"
                : "Set up your governance simulation workspace"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-lg border border-border bg-muted/60 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                className={cn(
                  "flex-1 rounded-md py-2 text-body-sm font-semibold transition-all duration-200",
                  tab === t
                    ? "bg-white text-foreground shadow-polis-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {tab === "register" && (
              <div className="grid gap-1.5">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@polisai.gov"
                required
                autoComplete="email"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {tab === "register" && (
                <p className="text-caption text-muted-foreground">
                  Min 8 chars, at least one uppercase letter and one digit.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-md border border-city-coral/30 bg-city-coral/10 px-3 py-2 text-body-sm text-city-coral">
                {error}
              </p>
            )}

            <Button type="submit" variant="signal" className="mt-1 w-full h-11" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {tab === "login" ? "Sign in to PolisAI" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-caption text-muted-foreground">
            {tab === "login" ? "New to PolisAI? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(null); }}
              className="font-semibold text-city-civic hover:underline"
            >
              {tab === "login" ? "Create account" : "Sign in"}
            </button>
          </p>

          <p className="mt-8 text-center text-caption text-muted-foreground/60">
            Policy testing · Civic simulation · AI governance analysis
          </p>
        </div>
      </div>
    </div>
  );
}
