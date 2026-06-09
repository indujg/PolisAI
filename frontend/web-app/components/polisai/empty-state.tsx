import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  action,
  className
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn("premium-empty-state", className)}>
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-city-civic/10 text-city-civic">
        <Icon className="size-5" />
      </div>
      <h3 className="text-title-md text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button type="button" variant="outline" size="sm" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
