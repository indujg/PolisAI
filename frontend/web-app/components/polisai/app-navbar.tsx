"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, SwitchCamera } from "lucide-react";
import { Breadcrumbs } from "@/components/polisai/breadcrumbs";
import { SimSelector } from "@/components/polisai/sim-selector";
import { useAuth } from "@/lib/auth-context";
import { useSim } from "@/lib/sim-context";
import { cn } from "@/lib/utils";

function ChromeBtn({ onClick, label, className, children }: { onClick?: () => void; label: string; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-4",
        className,
      )}
    >
      {children}
    </button>
  );
}

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
  const { simName } = useSim();
  const router = useRouter();
  const [simPickerOpen, setSimPickerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] text-white"
        style={{ background: "linear-gradient(180deg,#0C1422,#0A0F1A)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
          <ChromeBtn onClick={onMobileMenu} label="Open sidebar" className="lg:hidden">
            <Menu />
          </ChromeBtn>
          <ChromeBtn onClick={onSidebarToggle} label="Toggle sidebar" className="hidden lg:inline-flex">
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </ChromeBtn>

          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>

          {/* sim switcher pill */}
          {simName ? (
            <button
              type="button"
              onClick={() => setSimPickerOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-body-sm font-semibold text-white/85 transition-colors hover:bg-white/10 md:flex"
            >
              <Building2 className="size-3.5 text-[#2DE0D6]" />
              <span className="max-w-[10rem] truncate">{simName}</span>
              <SwitchCamera className="size-3.5 text-white/40" />
            </button>
          ) : null}

          {/* search */}
          <div className="relative hidden min-w-[15rem] max-w-sm flex-1 md:block">
            <label htmlFor="polis-global-search" className="sr-only">
              Search PolisAI
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              id="polis-global-search"
              className="focus-ring h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-body-sm text-white placeholder:text-white/35"
              placeholder="Search districts, citizens, agents"
            />
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-caption font-semibold text-white/70 xl:inline-flex">
            <ShieldCheck className="size-3.5 text-[#34E5A0]" />
            GovCloud verified
          </span>

          <ChromeBtn label="Search" className="md:hidden">
            <Search />
          </ChromeBtn>
          <ChromeBtn label="Notifications">
            <Bell />
          </ChromeBtn>

          {/* user menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-body-sm font-semibold text-white/85 transition-colors hover:bg-white/10 sm:flex"
            >
              <div className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#2DE0D6] to-[#4D7CFF] text-[10px] font-bold text-[#070B14]">
                {(user?.full_name ?? user?.email ?? "?")[0]?.toUpperCase()}
              </div>
              <span className="max-w-[8rem] truncate">{user?.full_name ?? user?.email}</span>
              <ChevronDown className="size-3.5 text-white/40" />
            </button>

            {userMenuOpen ? (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#0C1422]/95 p-1.5 text-white shadow-[0_18px_50px_rgba(5,10,20,0.6)] backdrop-blur-2xl">
                  <div className="mb-1.5 px-3 py-2">
                    <p className="truncate text-body-sm font-semibold text-white">{user?.full_name ?? user?.email}</p>
                    <p className="text-caption capitalize text-white/45">{user?.role}</p>
                  </div>
                  <hr className="mb-1.5 border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      setSimPickerOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm font-semibold text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    <SwitchCamera className="size-4" /> Switch simulation
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm font-semibold text-[#FF7A8A] hover:bg-[#FF7A8A]/10"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* sim picker overlay */}
      {simPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060A12]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <SimSelector onDone={() => setSimPickerOpen(false)} />
            <button type="button" className="mt-3 w-full text-center text-caption text-white/70 hover:text-white" onClick={() => setSimPickerOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
