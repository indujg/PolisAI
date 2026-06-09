"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, FlaskConical, Sparkles, UsersRound, ScrollText, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="absolute inset-0 bg-city-grid [background-size:32px_32px] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(19,200,195,0.12),transparent_55%)]" />

      <motion.div
        className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 text-center"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
          <div className="grid size-16 place-items-center rounded-2xl bg-city-graphite text-white shadow-polis-md">
            <Building2 className="size-8" />
          </div>
          <Badge variant="glass" className="gap-1.5">
            <Sparkles className="size-3.5 text-city-civic" />
            AI-powered societal digital twin
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.div variants={fadeUp} className="grid gap-4">
          <h1 className="text-display-lg text-foreground">
            Test policy.<br />Watch a city respond.
          </h1>
          <p className="mx-auto max-w-lg text-body-lg text-muted-foreground">
            PolisAI simulates citizens, economies, climate, healthcare, and governance — so you can see what happens before it happens.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex gap-3">
          <Button variant="signal" size="lg" asChild>
            <Link href="/login">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard">
              Open console
            </Link>
          </Button>
        </motion.div>

        {/* Feature pills */}
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
          {[
            { icon: FlaskConical, label: "Live simulation" },
            { icon: UsersRound, label: "AI citizens" },
            { icon: ScrollText, label: "Policy testing" },
            { icon: BarChart3, label: "Real-time analytics" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-white/[0.76] px-3 py-1.5 text-body-sm font-semibold text-foreground shadow-polis-xs backdrop-blur-xl"
            >
              <Icon className="size-3.5 text-city-civic" />
              {label}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
