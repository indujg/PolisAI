"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, FlaskConical, PanelLeftClose, PanelLeftOpen, Sparkles, X } from "lucide-react";
import { getActiveNavItem, navigationItems, navSections } from "@/components/polisai/navigation";
import { useSim } from "@/lib/sim-context";
import { cn } from "@/lib/utils";

function ChromeBtn({ onClick, label, children }: { onClick?: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

export function AppSidebar({
  collapsed = false,
  mobile = false,
  onToggle,
  onClose,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const activeItem = getActiveNavItem(pathname);
  const { simName } = useSim();
  const compact = collapsed && !mobile;

  return (
    <aside
      className="relative flex h-full flex-col overflow-hidden border-r border-white/[0.06] text-white"
      style={{ background: "linear-gradient(180deg,#0C1422 0%,#080D17 100%)" }}
    >
      {/* ambient glow + grid + grain */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(70%_38%_at_28%_-6%,rgba(45,224,214,0.16),transparent_60%),radial-gradient(60%_40%_at_90%_110%,rgba(77,124,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="grain absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* header */}
      <div className="relative flex h-16 items-center justify-between gap-3 border-b border-white/[0.06] px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2DE0D6] to-[#4D7CFF] text-[#070B14] shadow-[0_6px_22px_rgba(45,224,214,0.4)]">
            <Building2 className="size-5" />
          </div>
          <div className={cn("min-w-0 transition-all duration-200", compact && "w-0 opacity-0")}>
            <p className="truncate text-body-sm font-black tracking-tight">PolisAI</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Smart city OS</p>
          </div>
        </Link>

        {mobile ? (
          <ChromeBtn onClick={onClose} label="Close sidebar">
            <X />
          </ChromeBtn>
        ) : (
          <ChromeBtn onClick={onToggle} label="Collapse sidebar">
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </ChromeBtn>
        )}
      </div>

      {/* nav */}
      <nav aria-label="Primary navigation" className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section} className="mb-5">
            <p className={cn("mb-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 transition-opacity", compact && "opacity-0")}>
              {section}
            </p>
            <div className="grid gap-1">
              {navigationItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeItem.id === item.id;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      title={compact ? item.label : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-body-sm font-semibold transition-all duration-200",
                        isActive ? "text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                        compact && "justify-center px-2",
                      )}
                      style={isActive ? { background: "linear-gradient(90deg,#0FA7A2,#2F6BFF)", boxShadow: "0 10px 28px rgba(15,167,162,0.42)" } : undefined}
                    >
                      {isActive ? <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/85" /> : null}
                      <Icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-white" : "text-white/45 group-hover:text-white")} />
                      <span className={cn("min-w-0 truncate transition-all duration-200", compact && "w-0 opacity-0")}>{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto size-3.5 shrink-0 transition-all duration-200",
                          isActive ? "opacity-90" : "opacity-0 group-hover:opacity-50",
                          compact && "hidden",
                        )}
                      />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* active world card */}
      <div className="relative border-t border-white/[0.06] p-3">
        <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all duration-300", compact && "px-2")}>
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#4D7CFF]/15 text-[#83A6FF]">
              <FlaskConical className="size-4" />
            </div>
            <div className={cn("min-w-0 transition-all duration-200", compact && "w-0 opacity-0")}>
              <div className="flex items-center gap-1.5">
                <p className="truncate text-body-sm font-bold text-white">{simName || "No simulation"}</p>
                <Sparkles className="size-3 text-[#2DE0D6]" />
              </div>
              <p className="truncate text-[11px] text-white/40">Active world</p>
            </div>
          </div>
          <div className={cn("mt-3", compact && "hidden")}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34E5A0]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#34E5A0]">
              <span className="relative flex size-1.5">
                {simName ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34E5A0] opacity-60" /> : null}
                <span className="relative inline-flex size-1.5 rounded-full bg-[#34E5A0]" />
              </span>
              {simName ? "Running" : "No sim"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
