"use client";

// ============================================================================
// PolisAI — World Environment
// ----------------------------------------------------------------------------
// A self-contained day/night cycle that color-grades the whole scene, arcs a
// sun & moon across the sky, twinkles stars at night, and exposes a floating
// Cities-Skylines-style time / speed control. Owns its own animation loop so
// the heavy city never re-renders with it. Frontend only.
// ============================================================================

import { motion } from "framer-motion";
import { Moon, Pause, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { lightAt, setSpeed, useDayNight } from "./day-night";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// deterministic star field (SSR-safe)
const STARS = (() => {
  let s = 0x1234;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: 54 }, (_, i) => ({
    left: rand() * 100,
    top: rand() * 46,
    size: 1 + rand() * 1.6,
    freq: 0.6 + rand() * 1.8,
    phase: rand() * Math.PI * 2,
    base: 0.4 + rand() * 0.6,
    key: i,
  }));
})();

export function WorldEnvironment() {
  const dn = useDayNight();
  const time = dn.time;
  const day = dn.day;
  const speed = dn.speed;

  // --- derive environment ---
  const { dayLight, night, twilight } = lightAt(time);

  const hours = time * 24;
  const HH = Math.floor(hours);
  const MM = Math.floor((hours - HH) * 60);
  const clock = `${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")}`;

  const sunT = clamp((time - 0.22) / 0.56, 0, 1);
  const sunLeft = 8 + sunT * 84;
  const sunTop = 70 - Math.sin(sunT * Math.PI) * 56;
  const moonTime = (time + 0.5) % 1;
  const moonT = clamp((moonTime - 0.22) / 0.56, 0, 1);
  const moonLeft = 8 + moonT * 84;
  const moonTop = 70 - Math.sin(moonT * Math.PI) * 56;

  const SPEEDS: { v: number; label: string }[] = [
    { v: 1, label: "1×" },
    { v: 2, label: "2×" },
    { v: 3, label: "3×" },
  ];

  return (
    <>
      {/* color-grade overlay — sits above the city, below the HUD panels */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {/* night wash (multiply darkens the city) */}
        <div className="absolute inset-0" style={{ background: "#0A1330", opacity: night * 0.58, mixBlendMode: "multiply" }} />
        {/* cool night cast */}
        <div className="absolute inset-0" style={{ background: "#1B2E66", opacity: night * 0.22, mixBlendMode: "screen" }} />
        {/* golden-hour band at the horizon */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "linear-gradient(0deg, rgba(240,150,86,0.85), transparent 70%)", opacity: twilight * 0.5, mixBlendMode: "soft-light" }}
        />

        {/* stars */}
        <div className="absolute inset-0" style={{ opacity: night }}>
          {STARS.map((st) => {
            const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 6 * st.freq + st.phase));
            return (
              <span
                key={st.key}
                className="absolute rounded-full bg-white"
                style={{ left: `${st.left}%`, top: `${st.top}%`, width: st.size, height: st.size, opacity: st.base * tw, boxShadow: "0 0 4px rgba(255,255,255,0.8)" }}
              />
            );
          })}
        </div>

        {/* moon */}
        <div
          className="absolute size-16 rounded-full"
          style={{
            left: `${moonLeft}%`,
            top: `${moonTop}%`,
            transform: "translate(-50%,-50%)",
            opacity: night * 0.9,
            background: "radial-gradient(circle at 38% 38%, #F3F6FF, #C7D2E8 55%, rgba(199,210,232,0) 72%)",
            boxShadow: "0 0 40px rgba(200,215,245,0.5)",
          }}
        />
        {/* sun */}
        <div
          className="absolute size-20 rounded-full"
          style={{
            left: `${sunLeft}%`,
            top: `${sunTop}%`,
            transform: "translate(-50%,-50%)",
            opacity: dayLight,
            background: "radial-gradient(circle at 50% 50%, rgba(255,247,214,0.95), rgba(255,206,90,0.7) 38%, rgba(255,176,60,0) 70%)",
            boxShadow: "0 0 60px rgba(255,210,120,0.55)",
          }}
        />
      </div>

      {/* floating time / speed control */}
      <div className="pointer-events-auto absolute left-1/2 top-4 z-30 -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 py-1.5 pl-3 pr-1.5 shadow-glass backdrop-blur-2xl"
        >
          <span className="grid size-6 place-items-center">
            {night > 0.5 ? <Moon className="size-4 text-city-transit" /> : <Sun className="size-4 text-city-solar" />}
          </span>
          <span className="font-mono text-body-sm font-bold tabular-nums text-foreground">{clock}</span>
          <span className="text-caption font-semibold text-muted-foreground">Day {day}</span>
          <span className="mx-0.5 h-5 w-px bg-border/70" />
          <button
            type="button"
            onClick={() => setSpeed(0)}
            className={cn("grid size-7 place-items-center rounded-full transition-colors", speed === 0 ? "bg-city-graphite text-white" : "text-muted-foreground hover:text-foreground")}
            aria-label="Pause"
          >
            <Pause className="size-3.5" />
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s.v}
              type="button"
              onClick={() => setSpeed(s.v)}
              className={cn(
                "grid size-7 place-items-center rounded-full font-mono text-[11px] font-bold transition-colors",
                speed === s.v ? "bg-city-civic text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </motion.div>
      </div>
    </>
  );
}
