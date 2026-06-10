"use client";

// ============================================================================
// PolisAI — Sky Layer
// ----------------------------------------------------------------------------
// Ambient aerial life over the city: a surveying drone, a drifting bird flock,
// and a slow Palantir-style light sweep. Memoized & self-contained so it never
// re-renders with the heavy city. Screen-space, pointer-events-none.
// ============================================================================

import { memo } from "react";
import { motion } from "framer-motion";

export const SkyLayer = memo(function SkyLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden">
      {/* slow light sweep (dynamic lighting) */}
      <motion.div
        className="absolute -top-1/4 h-[150%] w-1/3 -skew-x-12"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)", mixBlendMode: "screen" }}
        initial={{ left: "-40%" }}
        animate={{ left: ["-40%", "140%"] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", repeatDelay: 6 }}
      />

      {/* surveying drone with blinking beacon */}
      <motion.div
        className="absolute top-[14%]"
        initial={{ left: "-6%" }}
        animate={{ left: ["-6%", "106%"], top: ["14%", "20%", "12%", "14%"] }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear", times: [0, 0.4, 0.7, 1] }}
      >
        <div className="relative">
          <div className="h-1 w-7 rounded-full bg-[#0B1322]/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
          <div className="absolute left-1/2 top-0.5 h-2 w-px -translate-x-1/2 bg-[#0B1322]/70" />
          <motion.span
            className="absolute -left-0.5 top-0.5 size-1.5 rounded-full bg-[#FF4D4D]"
            animate={{ opacity: [1, 0.1, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
          <motion.span
            className="absolute right-0 top-0.5 size-1.5 rounded-full bg-[#34E5A0]"
            animate={{ opacity: [0.1, 1, 0.1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* drifting bird flock */}
      <motion.div
        className="absolute top-[26%]"
        initial={{ left: "108%" }}
        animate={{ left: ["108%", "-12%"], top: ["26%", "22%", "28%", "26%"] }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear", repeatDelay: 10, times: [0, 0.3, 0.7, 1] }}
      >
        <div className="relative">
          {[
            { x: 0, y: 0, s: 1 },
            { x: 14, y: 7, s: 0.85 },
            { x: -13, y: 8, s: 0.85 },
            { x: 28, y: 15, s: 0.7 },
            { x: -26, y: 16, s: 0.7 },
          ].map((b, i) => (
            <motion.svg
              key={i}
              width={12 * b.s}
              height={6 * b.s}
              viewBox="0 0 12 6"
              className="absolute"
              style={{ left: b.x, top: b.y }}
              animate={{ scaleY: [1, 0.45, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.08 }}
            >
              <path d="M0 5 L6 0 L12 5" fill="none" stroke="#1B2740" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          ))}
        </div>
      </motion.div>
    </div>
  );
});
