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
      <Link href="/dashboard" className="flex shrink-0 items-center gap-1.5 text-white/50 transition-colors hover:text-white">
        <Home className="size-3.5" />
        <span className="hidden sm:inline">PolisAI</span>
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-white/25" />
      {subRouteLabel ? (
        <Link href={activeItem.href} className="hidden shrink-0 font-semibold text-white/50 transition-colors hover:text-white sm:inline">
          {activeItem.label}
        </Link>
      ) : (
        <span aria-current="page" className="truncate font-bold text-white">{activeItem.label}</span>
      )}
      {subRouteLabel ? <ChevronRight className="hidden size-3.5 shrink-0 text-white/25 sm:block" /> : null}
      {subRouteLabel ? <span aria-current="page" className="truncate font-bold text-white">{subRouteLabel}</span> : null}
      <span className="hidden truncate text-white/35 lg:inline">/ {activeItem.description}</span>
    </nav>
  );
}
