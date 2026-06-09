"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { PolisAppLayout } from "@/components/polisai/app-layout";
import { SimSelector } from "@/components/polisai/sim-selector";
import { useAuth } from "@/lib/auth-context";
import { useSim } from "@/lib/sim-context";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { simId } = useSim();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-body-sm font-semibold">Loading PolisAI...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!simId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="absolute inset-0 bg-city-grid [background-size:32px_32px] opacity-60" />
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-city-graphite text-white shadow-polis-md">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-title-md font-bold text-foreground">PolisAI</p>
              <p className="text-caption text-muted-foreground">Welcome, {user.full_name ?? user.email}</p>
            </div>
          </div>
          <SimSelector />
        </div>
      </div>
    );
  }

  return <PolisAppLayout>{children}</PolisAppLayout>;
}
