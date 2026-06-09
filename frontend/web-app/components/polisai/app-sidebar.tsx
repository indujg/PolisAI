"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Sparkles,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveNavItem, navigationItems, navSections } from "@/components/polisai/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({
  collapsed = false,
  mobile = false,
  onToggle,
  onClose
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const activeItem = getActiveNavItem(pathname);

  return (
    <aside className="flex h-full flex-col border-r border-white/75 bg-white/[0.86] shadow-glass backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-border/70 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-city-graphite text-white shadow-polis-sm">
            <Building2 className="size-5" />
          </div>
          <div className={cn("min-w-0 transition-all duration-200", collapsed && !mobile && "w-0 opacity-0")}>
            <p className="truncate text-body-sm font-bold text-foreground">PolisAI</p>
            <p className="truncate text-caption text-muted-foreground">Smart city OS</p>
          </div>
        </Link>

        {mobile ? (
          <Button variant="icon" size="icon-sm" onClick={onClose} aria-label="Close sidebar">
            <X />
          </Button>
        ) : (
          <Button variant="icon" size="icon-sm" onClick={onToggle} aria-expanded={!collapsed} aria-label="Collapse sidebar">
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section} className="mb-5">
            <p
              className={cn(
                "mb-2 px-2 font-mono text-[11px] font-semibold uppercase text-muted-foreground transition-opacity",
                collapsed && !mobile && "opacity-0"
              )}
            >
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
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-body-sm font-semibold transition-all duration-200",
                        isActive
                          ? "bg-city-civic text-white shadow-polis-sm ring-1 ring-city-civic/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && !mobile && "justify-center px-2"
                      )}
                      title={collapsed && !mobile ? item.label : undefined}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span
                        className={cn(
                          "min-w-0 truncate transition-all duration-200",
                          collapsed && !mobile && "w-0 opacity-0"
                        )}
                      >
                        {item.label}
                      </span>
                      <ChevronRight
                        className={cn(
                          "ml-auto size-3.5 shrink-0 transition-all duration-200",
                          isActive ? "opacity-90" : "opacity-0 group-hover:opacity-60",
                          collapsed && !mobile && "hidden"
                        )}
                      />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/70 p-3">
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border/70 bg-city-mist p-3 transition-all duration-300",
            collapsed && !mobile && "px-2"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-city-signal/10 text-city-signal">
              <Radio className="size-4" />
            </div>
            <div className={cn("min-w-0 transition-all duration-200", collapsed && !mobile && "w-0 opacity-0")}>
              <div className="flex items-center gap-2">
                <p className="truncate text-body-sm font-semibold text-foreground">City Mesh</p>
                <Sparkles className="size-3.5 text-city-civic" />
              </div>
              <p className="truncate text-caption text-muted-foreground">1,284 streams online</p>
            </div>
          </div>
          <div className={cn("mt-3", collapsed && !mobile && "hidden")}>
            <Badge variant="success">99.2% uptime</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
