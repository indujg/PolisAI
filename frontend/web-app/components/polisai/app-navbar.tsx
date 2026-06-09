"use client";

import { Bell, Command, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/polisai/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppNavbar({
  collapsed,
  onSidebarToggle,
  onMobileMenu
}: {
  collapsed: boolean;
  onSidebarToggle: () => void;
  onMobileMenu: () => void;
}) {
  return (
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

        <div className="hidden min-w-[18rem] max-w-sm flex-1 md:block">
          <div className="relative">
            <label htmlFor="polis-global-search" className="sr-only">Search PolisAI</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="polis-global-search" aria-label="Search PolisAI" className="h-9 bg-white/[0.76] pl-9" placeholder="Search districts, citizens, agents" />
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
        <Button variant="signal" size="sm" className="hidden sm:inline-flex">
          <Command />
          Command
        </Button>
      </div>
    </header>
  );
}
