import { Building2, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PageLoading() {
  return (
    <div className="grid gap-5" aria-label="Loading PolisAI page">
      <section className="glass-card city-map overflow-hidden rounded-lg p-4 sm:p-5 lg:p-6">
        <div className="relative z-[1] flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="glass" className="mb-4 gap-1.5">
              <RadioTower className="size-3.5 text-city-civic" />
              Loading command surface
            </Badge>
            <div className="skeleton-sheen h-10 w-[min(34rem,82vw)] rounded-lg bg-white/75 shadow-polis-xs" />
            <div className="skeleton-sheen mt-4 h-4 w-[min(42rem,86vw)] rounded-full bg-white/60" />
            <div className="skeleton-sheen mt-2 h-4 w-[min(30rem,74vw)] rounded-full bg-white/56" />
          </div>
          <div className="grid w-full gap-2 sm:w-64">
            <div className="skeleton-sheen h-9 rounded-md bg-white/70" />
            <div className="skeleton-sheen h-9 rounded-md bg-white/58" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="surface-card rounded-lg p-4">
            <div className="mb-5 flex items-center justify-between">
              <div className="skeleton-sheen size-10 rounded-md bg-city-civic/12" />
              <div className="skeleton-sheen h-3 w-12 rounded-full bg-muted" />
            </div>
            <div className="skeleton-sheen h-8 w-24 rounded-md bg-muted" />
            <div className="skeleton-sheen mt-3 h-3 w-36 rounded-full bg-muted" />
          </div>
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="surface-card rounded-lg p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-city-signal/10 text-city-signal">
              <Building2 className="size-5" />
            </div>
            <div className="grid flex-1 gap-2">
              <div className="skeleton-sheen h-5 w-56 rounded-full bg-muted" />
              <div className="skeleton-sheen h-3 w-72 rounded-full bg-muted" />
            </div>
          </div>
          <div className="skeleton-sheen h-[320px] rounded-lg bg-city-mist" />
        </div>
        <div className="glass-card rounded-lg p-5">
          <div className="skeleton-sheen h-5 w-44 rounded-full bg-muted" />
          <div className="mt-5 grid gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton-sheen h-14 rounded-md bg-white/64" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
