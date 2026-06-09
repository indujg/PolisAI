"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CollapsiblePanel({
  title,
  eyebrow,
  icon: Icon,
  status = "Active",
  defaultOpen = true,
  children
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  status?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="surface-card overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-city-civic/5 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-city-civic/10 text-city-civic">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="token-label">{eyebrow}</p>
            <h3 className="truncate text-title-md text-foreground">{title}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={open ? "success" : "glass"}>{status}</Badge>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
        </div>
      </button>

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="border-t border-border/70 px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
