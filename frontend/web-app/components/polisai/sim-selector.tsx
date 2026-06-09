"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Loader2, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";
import { useSim } from "@/lib/sim-context";
import { cn } from "@/lib/utils";

type Simulation = {
  id: string;
  name: string;
  status: string;
  current_tick: number;
  created_at: string;
};

export function SimSelector({ onDone }: { onDone?: () => void }) {
  const { setSim } = useSim();
  const [sims, setSims] = useState<Simulation[]>([]);
  const [loadingSims, setLoadingSims] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ items: Simulation[]; total: number } | Simulation[]>("/api/v1/simulations")
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { items: Simulation[] }).items ?? [];
        setSims(list);
      })
      .catch(() => setSims([]))
      .finally(() => setLoadingSims(false));
  }, []);

  function selectSim(sim: Simulation) {
    setSim(sim.id, sim.name);
    onDone?.();
  }

  async function createSim(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const sim = await apiPost<Simulation>("/api/v1/simulations", { name: newName.trim() });
      setSim(sim.id, sim.name);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create simulation");
    } finally {
      setBusy(false);
    }
  }

  const statusColor: Record<string, string> = {
    running: "text-city-park",
    paused: "text-city-solar",
    draft: "text-city-signal",
    completed: "text-muted-foreground",
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-polis-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-city-graphite text-white shadow-polis-sm">
          <FlaskConical className="size-5" />
        </div>
        <div>
          <h2 className="text-title-md text-foreground">Select a simulation</h2>
          <p className="text-caption text-muted-foreground">Choose an existing world or create a new one</p>
        </div>
      </div>

      {loadingSims ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-city-civic" />
        </div>
      ) : sims.length > 0 ? (
        <div className="mb-4 grid gap-2">
          {sims.map((sim) => (
            <button
              key={sim.id}
              type="button"
              onClick={() => selectSim(sim)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.78] px-4 py-3 text-left shadow-polis-xs transition-all hover:-translate-y-0.5 hover:shadow-polis-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">{sim.name}</p>
                <p className="text-caption text-muted-foreground">
                  Tick {sim.current_tick} ·{" "}
                  <span className={cn("font-semibold", statusColor[sim.status] ?? "text-muted-foreground")}>
                    {sim.status}
                  </span>
                </p>
              </div>
              <Badge variant="glass" className="shrink-0">Select</Badge>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-border/80 bg-city-mist p-5 text-center">
          <Sparkles className="mx-auto mb-2 size-6 text-city-civic" />
          <p className="text-body-sm text-muted-foreground">No simulations yet — create your first world below.</p>
        </div>
      )}

      <div className="border-t border-border/70 pt-4">
        {creating ? (
          <form onSubmit={createSim} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sim-name">Simulation name</Label>
              <Input
                id="sim-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Metro Expansion 2030"
                autoFocus
                required
              />
            </div>
            {error && (
              <p className="text-caption text-city-coral">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="signal" className="flex-1" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Create simulation
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setCreating(true)}>
            <Plus />
            New simulation
          </Button>
        )}
      </div>
    </div>
  );
}
