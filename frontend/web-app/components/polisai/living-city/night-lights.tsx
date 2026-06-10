"use client";

// ============================================================================
// PolisAI — Night Lights
// ----------------------------------------------------------------------------
// Warm street lamps along the roads that fade in as the day/night cycle dims —
// the city "waking up" at dusk. A world-space SVG overlay that shares the city
// camera transform and re-renders only itself (via the day/night store).
// ============================================================================

import { CITY, iso, type Point } from "./city-model";
import { lightAt, useDayNight } from "./day-night";

type View = { scale: number; x: number; y: number };

// lamp points along the road grid (every few tiles)
const LAMPS: Point[] = (() => {
  const out: Point[] = [];
  const { size, roadStep } = CITY;
  for (let k = 0; k <= size; k += roadStep) {
    for (let t = 1; t < size; t += 3) {
      out.push(iso(k + 0.5, t + 0.5)); // vertical road
      out.push(iso(t + 0.5, k + 0.5)); // horizontal road
    }
  }
  return out;
})();

export function NightLights({ view }: { view: View }) {
  const dn = useDayNight();
  const { night } = lightAt(dn.time);
  if (night < 0.04) return null;

  const B = CITY.bounds;
  return (
    <svg
      width={B.width}
      height={B.height}
      viewBox={`${B.minX} ${B.minY} ${B.width} ${B.height}`}
      className="pointer-events-none absolute inset-0 z-[7] h-full w-full"
      preserveAspectRatio="none"
      style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: "0 0" }}
    >
      <g opacity={night} style={{ mixBlendMode: "screen" }}>
        {LAMPS.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={7} fill="#FFCE7A" opacity={0.16} />
            <circle cx={p.x} cy={p.y} r={3} fill="#FFD98A" opacity={0.4} />
            <circle cx={p.x} cy={p.y} r={1.4} fill="#FFF0CC" />
          </g>
        ))}
      </g>
    </svg>
  );
}
