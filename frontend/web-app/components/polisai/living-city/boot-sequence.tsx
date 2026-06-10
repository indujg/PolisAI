"use client";

// ============================================================================
// PolisAI — Boot Sequence
// ----------------------------------------------------------------------------
// A short cinematic intro that wipes away to reveal the living city.
// ============================================================================

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2 } from "lucide-react";

export function BootSequence() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          key="boot"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 z-50 grid place-items-center overflow-hidden rounded-3xl bg-[#070B14]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(45,224,214,0.16),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative flex flex-col items-center gap-5 text-white">
            <div className="relative grid size-16 place-items-center">
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-2xl border border-[#2DE0D6]/50"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * 0.8 }}
                />
              ))}
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#2DE0D6] to-[#4D7CFF] text-[#070B14] shadow-[0_0_40px_rgba(45,224,214,0.5)]"
              >
                <Building2 className="size-6" />
              </motion.span>
            </div>

            <div className="text-center">
              <p className="text-lg font-black tracking-tight">PolisAI</p>
              <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/45">Initializing digital twin</p>
            </div>

            <div className="h-0.5 w-44 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#2DE0D6] to-[#4D7CFF]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
