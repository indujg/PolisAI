"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getActiveNavItem } from "@/components/polisai/navigation";

const subRouteLabels: Record<string, string> = {
  "/agents/telegram": "Telegram Integration",
  "/citizens/card": "NFC Citizen Card"
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const activeItem = getActiveNavItem(pathname);
  const subRouteLabel = subRouteLabels[pathname];

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-body-sm">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="size-3.5" />
        <span className="hidden sm:inline">PolisAI</span>
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      {subRouteLabel ? (
        <Link href={activeItem.href} className="hidden shrink-0 font-semibold text-muted-foreground hover:text-foreground sm:inline">
          {activeItem.label}
        </Link>
      ) : (
        <span aria-current="page" className="truncate font-semibold text-foreground">{activeItem.label}</span>
      )}
      {subRouteLabel ? <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" /> : null}
      {subRouteLabel ? <span aria-current="page" className="truncate font-semibold text-foreground">{subRouteLabel}</span> : null}
      <span className="hidden truncate text-muted-foreground lg:inline">/ {activeItem.description}</span>
    </nav>
  );
}
