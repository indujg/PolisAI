"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type SimState = {
  simId: string | null;
  simName: string;
  setSim: (id: string, name: string) => void;
  clearSim: () => void;
};

const SimContext = createContext<SimState | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const [simId, setSimId] = useState<string | null>(null);
  const [simName, setSimName] = useState<string>("");

  useEffect(() => {
    const storedId = localStorage.getItem("polis_sim_id");
    const storedName = localStorage.getItem("polis_sim_name");
    if (storedId) {
      setSimId(storedId);
      setSimName(storedName ?? "");
    }
  }, []);

  const setSim = useCallback((id: string, name: string) => {
    localStorage.setItem("polis_sim_id", id);
    localStorage.setItem("polis_sim_name", name);
    setSimId(id);
    setSimName(name);
  }, []);

  const clearSim = useCallback(() => {
    localStorage.removeItem("polis_sim_id");
    localStorage.removeItem("polis_sim_name");
    setSimId(null);
    setSimName("");
  }, []);

  return (
    <SimContext.Provider value={{ simId, simName, setSim, clearSim }}>
      {children}
    </SimContext.Provider>
  );
}

export function useSim(): SimState {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used inside SimProvider");
  return ctx;
}
