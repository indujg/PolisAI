"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  Command,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  SwitchCamera,
} from "lucide-react";
import { Breadcrumbs } from "@/components/polisai/breadcrumbs";
import { SimSelector } from "@/components/polisai/sim-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useSim } from "@/lib/sim-context";
import { cn } from "@/lib/utils";

export function AppNavbar({
  collapsed,
  onSidebarToggle,
  onMobileMenu,
}: {
  collapsed: boolean;
  onSidebarToggle: () => void;
  onMobileMenu: () => void;
}) {
  const { user, logout } = useAuth();
  const { simName, clearSim } = useSim();
  const router = useRouter();
  const [simPickerOpen, setSimPickerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/75 bg-white/[0.82] shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl">
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
          <Button variant="icon" size="icon-sm" onClick={onMobileMenu} aria-label="Open sidebar" className="lg:hidden">
            <Menu />
          </Button>
          <Button
            variant="icon"
            size="icon-sm"
            onClick={onSidebarToggle}
            aria-label="Toggle sidebar"
            className="hidden lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>

          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>

          {/* Sim switcher pill */}
          {simName && (
            <button
              type="button"
              onClick={() => setSimPickerOpen(true)}
              className="hidden items-center gap-1.5 rounded-md border border-border/70 bg-white/[0.76] px-3 py-1.5 text-body-sm font-semibold text-foreground shadow-polis-xs transition-all hover:shadow-polis-sm md:flex"
            >
              <Building2 className="size-3.5 text-city-civic" />
              <span className="max-w-[10rem] truncate">{simName}</span>
              <SwitchCamera className="size-3.5 text-muted-foreground" />
            </button>
          )}

          <div className="hidden min-w-[16rem] max-w-sm flex-1 md:block">
            <div className="relative">
              <label htmlFor="polis-global-search" className="sr-only">Search PolisAI</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="polis-global-search" className="h-9 bg-white/[0.76] pl-9" placeholder="Search districts, citizens, agents" />
            </div>
          </div>

          <Badge variant="glass" className="hidden gap-1.5 xl:inline-flex">
            <ShieldCheck className="size-3.5 text-city-park" />
            GovCloud verified
          </Badge>

          <Button variant="icon" size="icon-sm" aria-label="Search" className="md:hidden">
            <Search />
          </Button>
          <Button variant="icon" size="icon-sm" aria-label="Notifications">
            <Bell />
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="hidden items-center gap-1.5 rounded-md border border-border/70 bg-white/[0.76] px-3 py-1.5 text-body-sm font-semibold text-foreground shadow-polis-xs transition-all hover:shadow-polis-sm sm:flex"
            >
              <div className="grid size-5 place-items-center rounded-full bg-city-civic text-[10px] font-bold text-white">
                {(user?.full_name ?? user?.email ?? "?")[0]?.toUpperCase()}
              </div>
              <span className="max-w-[8rem] truncate">{user?.full_name ?? user?.email}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border/70 bg-white/[0.96] p-1.5 shadow-polis-md backdrop-blur-2xl">
                  <div className="mb-1.5 px-3 py-2">
                    <p className="text-body-sm font-semibold text-foreground truncate">{user?.full_name ?? user?.email}</p>
                    <p className="text-caption text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                  <hr className="mb-1.5 border-border/70" />
                  <button
                    type="button"
                    onClick={() => { setSimPickerOpen(true); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <SwitchCamera className="size-4" /> Switch simulation
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-body-sm font-semibold text-city-coral hover:bg-city-coral/10"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Sim picker overlay */}
      {simPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-city-graphite/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <SimSelector onDone={() => setSimPickerOpen(false)} />
            <button
              type="button"
              className="mt-3 w-full text-center text-caption text-white/70 hover:text-white"
              onClick={() => setSimPickerOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
