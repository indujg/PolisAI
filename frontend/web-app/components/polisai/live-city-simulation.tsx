"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import mapboxgl from "mapbox-gl";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Ambulance,
  Building2,
  Bus,
  Car,
  Factory,
  GraduationCap,
  Hospital,
  Info,
  LocateFixed,
  Minus,
  MousePointer2,
  Plus,
  Route,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  TrainFront,
  UsersRound,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EntityKind = "building" | "hospital" | "school" | "factory" | "citizen" | "vehicle";

type CityEntity = {
  id: string;
  kind: EntityKind;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  status: string;
  detail: string;
  metric: string;
  tone: "civic" | "signal" | "solar" | "park" | "coral" | "transit";
};

type VehiclePath = {
  id: string;
  label: string;
  icon: LucideIcon;
  status: string;
  detail: string;
  metric: string;
  points: { x: number; y: number }[];
  duration: number;
  delay: number;
  tone: "civic" | "signal" | "solar" | "coral";
};

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const cityEntities: CityEntity[] = [
  { id: "civic-tower", kind: "building", label: "Civic Tower", x: 17, y: 22, w: 7, h: 18, status: "Stable", detail: "Mixed-use command district", metric: "92% occupancy", tone: "civic" },
  { id: "north-hospital", kind: "hospital", label: "Northline Hospital", x: 72, y: 20, w: 9, h: 12, status: "High intake", detail: "Emergency capacity forecast", metric: "18 beds open", tone: "coral" },
  { id: "meridian-school", kind: "school", label: "Meridian School", x: 42, y: 25, w: 10, h: 9, status: "Protected", detail: "School zone traffic controls", metric: "1,204 students", tone: "park" },
  { id: "port-factory", kind: "factory", label: "Harbor Works", x: 76, y: 63, w: 13, h: 14, status: "Grid watch", detail: "Industrial load balancer", metric: "71% demand", tone: "solar" },
  { id: "residential-east", kind: "building", label: "East Habitat", x: 51, y: 57, w: 8, h: 16, status: "Healthy", detail: "Residential service cluster", metric: "8.4k residents", tone: "signal" },
  { id: "transit-hub", kind: "building", label: "Greenline Hub", x: 28, y: 61, w: 12, h: 10, status: "Crowding", detail: "Transit transfer pressure", metric: "86% flow", tone: "transit" },
  { id: "citizen-1", kind: "citizen", label: "Citizen group A", x: 35, y: 46, status: "Commuting", detail: "Walking to Greenline Hub", metric: "4 min ETA", tone: "civic" },
  { id: "citizen-2", kind: "citizen", label: "Citizen group B", x: 59, y: 39, status: "Service request", detail: "Heat shelter guidance", metric: "High priority", tone: "solar" },
  { id: "citizen-3", kind: "citizen", label: "Citizen group C", x: 66, y: 72, status: "Safe", detail: "Factory district shift change", metric: "312 people", tone: "park" }
];

const vehiclePaths: VehiclePath[] = [
  {
    id: "bus-42",
    label: "Bus 42",
    icon: Bus,
    status: "Adaptive route",
    detail: "Rerouting around Greenline crowding",
    metric: "-7 min delay",
    points: [
      { x: 12, y: 52 },
      { x: 28, y: 52 },
      { x: 28, y: 63 },
      { x: 47, y: 63 },
      { x: 68, y: 63 }
    ],
    duration: 10,
    delay: 0,
    tone: "civic"
  },
  {
    id: "ambulance-7",
    label: "Ambulance 7",
    icon: Ambulance,
    status: "Priority corridor",
    detail: "Signal preemption to Northline Hospital",
    metric: "3 min ETA",
    points: [
      { x: 15, y: 77 },
      { x: 33, y: 77 },
      { x: 33, y: 32 },
      { x: 72, y: 32 },
      { x: 76, y: 25 }
    ],
    duration: 7,
    delay: 0.6,
    tone: "coral"
  },
  {
    id: "freight-12",
    label: "Freight 12",
    icon: TrainFront,
    status: "Load balanced",
    detail: "Factory supply route with energy-aware timing",
    metric: "91% on time",
    points: [
      { x: 88, y: 79 },
      { x: 77, y: 79 },
      { x: 77, y: 63 },
      { x: 54, y: 63 },
      { x: 54, y: 44 }
    ],
    duration: 12,
    delay: 1.2,
    tone: "solar"
  },
  {
    id: "ev-19",
    label: "EV Fleet 19",
    icon: Car,
    status: "Optimized",
    detail: "Shared mobility demand response",
    metric: "24 vehicles",
    points: [
      { x: 44, y: 23 },
      { x: 44, y: 44 },
      { x: 57, y: 44 },
      { x: 57, y: 70 },
      { x: 73, y: 70 }
    ],
    duration: 9,
    delay: 1.8,
    tone: "signal"
  }
];

const roads = [
  "left-[8%] top-[52%] h-2 w-[84%]",
  "left-[12%] top-[76%] h-2 w-[76%]",
  "left-[28%] top-[15%] h-[70%] w-2",
  "left-[43%] top-[18%] h-[60%] w-2",
  "left-[57%] top-[32%] h-[53%] w-2",
  "left-[72%] top-[15%] h-[67%] w-2",
  "left-[13%] top-[31%] h-2 w-[68%]"
];

export function LiveCitySimulation() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [hovered, setHovered] = useState<CityEntity | VehiclePath | null>(cityEntities[0]);
  const [mapReady, setMapReady] = useState(false);

  const tokenAvailable = Boolean(mapboxToken);

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-73.9857, 40.7484],
      zoom: 13.2,
      pitch: 58,
      bearing: -28,
      attributionControl: false
    });

    mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current.on("load", () => setMapReady(true));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const transform = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
      transformOrigin: "center"
    }),
    [pan, zoom]
  );

  function updateZoom(nextZoom: number) {
    const boundedZoom = Math.min(1.8, Math.max(0.72, nextZoom));
    setZoom(boundedZoom);
    mapRef.current?.easeTo({
      zoom: 12.6 + boundedZoom,
      duration: 450
    });
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    mapRef.current?.easeTo({
      center: [-73.9857, 40.7484],
      zoom: 13.2,
      pitch: 58,
      bearing: -28,
      duration: 700
    });
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="glass" className="mb-3 gap-1.5">
            <Sparkles className="size-3.5 text-city-civic" />
            Live digital twin
          </Badge>
          <h1 className="text-display-md text-foreground">PolisAI Live City Simulation</h1>
          <p className="mt-3 max-w-3xl text-body-lg text-muted-foreground">
            A strategy-grade simulation view for roads, buildings, civic assets, vehicles, and citizens with real-time movement and decision intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={tokenAvailable ? "success" : "warning"} className="gap-1.5">
            <MapboxStatusDot active={tokenAvailable && mapReady} />
            {tokenAvailable ? "Mapbox connected" : "Token fallback"}
          </Badge>
          <Button variant="outline">
            <Route />
            Traffic model
          </Button>
          <Button variant="signal">
            <Zap />
            Run simulation
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="surface-card overflow-hidden rounded-lg">
          <div className="flex flex-col gap-3 border-b border-border/70 bg-white/[0.78] p-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 bg-white/[0.82] pl-9" placeholder="Search hospital, school, route, citizen group" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="icon" size="icon-sm" onClick={() => updateZoom(zoom - 0.14)} aria-label="Zoom out">
                <Minus />
              </Button>
              <div className="min-w-16 rounded-md border border-border/70 bg-white/[0.78] px-3 py-2 text-center font-mono text-[11px] font-bold text-muted-foreground">
                {Math.round(zoom * 100)}%
              </div>
              <Button variant="icon" size="icon-sm" onClick={() => updateZoom(zoom + 0.14)} aria-label="Zoom in">
                <Plus />
              </Button>
              <Button variant="icon" size="icon-sm" onClick={resetView} aria-label="Reset view">
                <LocateFixed />
              </Button>
            </div>
          </div>

          <div
            className="relative h-[calc(100svh-18rem)] min-h-[620px] cursor-grab overflow-hidden bg-sensor-flow active:cursor-grabbing"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("[data-sim-hit]")) return;
              setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
            }}
            onPointerMove={(event) => {
              if (!dragStart) return;
              setPan({
                x: dragStart.panX + event.clientX - dragStart.x,
                y: dragStart.panY + event.clientY - dragStart.y
              });
            }}
            onPointerUp={() => setDragStart(null)}
            onPointerCancel={() => setDragStart(null)}
            onWheel={(event) => {
              event.preventDefault();
              updateZoom(zoom + (event.deltaY > 0 ? -0.06 : 0.06));
            }}
          >
            <div ref={mapContainerRef} className={cn("absolute inset-0 transition-opacity duration-700", tokenAvailable ? "opacity-70" : "opacity-0")} />
            {!tokenAvailable ? <FallbackMapTexture /> : null}

            <motion.div className="absolute inset-0" style={transform}>
              <div className="absolute inset-[3%] rounded-[1.5rem] border border-white/70 bg-white/[0.22] shadow-glass backdrop-blur-[2px]" />
              <RoadNetwork />
              <DistrictZones />

              {cityEntities.map((entity) => (
                <CityEntityMarker key={entity.id} entity={entity} onHover={setHovered} />
              ))}

              {vehiclePaths.map((vehicle) => (
                <VehicleMarker key={vehicle.id} vehicle={vehicle} onHover={setHovered} />
              ))}
            </motion.div>

            <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
              <LegendChip icon={Building2} label="Buildings" />
              <LegendChip icon={Hospital} label="Hospitals" />
              <LegendChip icon={School} label="Schools" />
              <LegendChip icon={Factory} label="Factories" />
              <LegendChip icon={UsersRound} label="Citizens" />
              <LegendChip icon={Car} label="Vehicles" />
            </div>

            <motion.div
              className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/75 bg-white/[0.82] p-4 shadow-glass backdrop-blur-2xl md:left-auto md:w-[22rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <MousePointer2 className="size-4 text-city-civic" />
                <p className="text-body-sm font-semibold text-foreground">Hover details</p>
              </div>
              {hovered ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-title-md text-foreground">{hovered.label}</p>
                    <Badge variant="glass">{hovered.metric}</Badge>
                  </div>
                  <p className="text-body-sm font-semibold text-city-civic">{hovered.status}</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">{hovered.detail}</p>
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">Hover over a building, citizen, vehicle, or civic asset.</p>
              )}
            </motion.div>
          </div>
        </div>

        <SimulationInspector hovered={hovered} tokenAvailable={tokenAvailable} />
      </section>
    </div>
  );
}

function FallbackMapTexture() {
  return (
    <div className="absolute inset-0 bg-city-grid [background-size:34px_34px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(19,200,195,0.18),transparent_28%),radial-gradient(circle_at_78%_26%,rgba(47,107,255,0.13),transparent_26%),linear-gradient(135deg,rgba(246,250,250,0.98),rgba(232,246,247,0.82))]" />
    </div>
  );
}

function RoadNetwork() {
  return (
    <div className="absolute inset-0">
      {roads.map((road) => (
        <div key={road} className={cn("absolute rounded-full bg-city-graphite/18 shadow-[0_0_0_4px_rgba(255,255,255,0.52)]", road)} />
      ))}
      <div className="absolute left-[13%] top-[31%] h-2 w-[73%] rotate-[18deg] rounded-full bg-city-signal/18 shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
      <div className="absolute left-[18%] top-[73%] h-2 w-[63%] -rotate-[11deg] rounded-full bg-city-civic/20 shadow-[0_0_0_4px_rgba(255,255,255,0.48)]" />
    </div>
  );
}

function DistrictZones() {
  return (
    <div className="absolute inset-0">
      {[
        "left-[8%] top-[15%] h-[30%] w-[26%] border-city-civic/25 bg-city-civic/[0.08]",
        "left-[39%] top-[15%] h-[31%] w-[27%] border-city-park/25 bg-city-park/[0.08]",
        "left-[68%] top-[14%] h-[30%] w-[22%] border-city-coral/20 bg-city-coral/[0.08]",
        "left-[11%] top-[58%] h-[28%] w-[30%] border-city-transit/25 bg-city-transit/[0.08]",
        "left-[48%] top-[56%] h-[31%] w-[20%] border-city-signal/25 bg-city-signal/[0.08]",
        "left-[72%] top-[58%] h-[30%] w-[19%] border-city-solar/25 bg-city-solar/10"
      ].map((zone) => (
        <div key={zone} className={cn("absolute rounded-lg border backdrop-blur-[1px]", zone)} />
      ))}
    </div>
  );
}

function CityEntityMarker({ entity, onHover }: { entity: CityEntity; onHover: (entity: CityEntity) => void }) {
  const Icon = iconForEntity(entity.kind);
  const isCitizen = entity.kind === "citizen";

  return (
    <motion.button
      type="button"
      data-sim-hit
      onMouseEnter={() => onHover(entity)}
      onFocus={() => onHover(entity)}
      className={cn(
        "absolute z-20 flex items-center justify-center rounded-md border border-white/75 bg-white/[0.82] text-foreground shadow-polis-sm backdrop-blur-xl transition-shadow hover:shadow-polis-lg",
        isCitizen ? "size-8 rounded-full" : "p-2"
      )}
      style={{
        left: `${entity.x}%`,
        top: `${entity.y}%`,
        width: isCitizen ? undefined : `${entity.w ?? 8}%`,
        height: isCitizen ? undefined : `${entity.h ?? 10}%`
      }}
      animate={isCitizen ? { y: [0, -8, 0], x: [0, 5, -3, 0] } : { y: [0, -2, 0] }}
      transition={{ duration: isCitizen ? 5 : 6, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.05 }}
    >
      <div className={cn("grid size-9 place-items-center rounded-md", toneClass(entity.tone), isCitizen && "size-6 rounded-full")}>
        <Icon className={cn(isCitizen ? "size-3.5" : "size-4")} />
      </div>
      {!isCitizen ? (
        <span className="absolute -bottom-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/75 bg-white/[0.9] px-2 py-1 text-[11px] font-bold text-muted-foreground shadow-polis-xs lg:block">
          {entity.label}
        </span>
      ) : null}
    </motion.button>
  );
}

function VehicleMarker({ vehicle, onHover }: { vehicle: VehiclePath; onHover: (vehicle: VehiclePath) => void }) {
  const Icon = vehicle.icon;
  const xValues = vehicle.points.map((point) => `${point.x}%`);
  const yValues = vehicle.points.map((point) => `${point.y}%`);

  return (
    <motion.button
      type="button"
      data-sim-hit
      onMouseEnter={() => onHover(vehicle)}
      onFocus={() => onHover(vehicle)}
      className={cn("absolute z-30 grid size-9 place-items-center rounded-full border border-white/80 bg-white text-foreground shadow-polis-md backdrop-blur-xl", toneRing(vehicle.tone))}
      animate={{ left: xValues, top: yValues }}
      transition={{ duration: vehicle.duration, delay: vehicle.delay, repeat: Infinity, ease: "linear" }}
      whileHover={{ scale: 1.14 }}
    >
      <Icon className="size-4" />
    </motion.button>
  );
}

function SimulationInspector({
  hovered,
  tokenAvailable
}: {
  hovered: CityEntity | VehiclePath | null;
  tokenAvailable: boolean;
}) {
  return (
    <aside className="grid gap-5">
      <div className="surface-card rounded-lg p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="token-label">Simulation state</p>
            <h2 className="text-title-lg text-foreground">City pulse</h2>
          </div>
          <Badge variant="success">Live</Badge>
        </div>

        <div className="grid gap-3">
          <InspectorMetric label="Traffic flow" value="86%" icon={Route} />
          <InspectorMetric label="Citizen sentiment" value="72" icon={UsersRound} />
          <InspectorMetric label="Emergency response" value="3 min" icon={Hospital} />
          <InspectorMetric label="Grid load" value="71%" icon={Factory} />
        </div>
      </div>

      <div className="glass-card rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <Info className="size-4 text-city-civic" />
          <h3 className="text-title-md text-foreground">Selection</h3>
        </div>
        {hovered ? (
          <div className="grid gap-3">
            <div className="rounded-lg border border-white/70 bg-white/[0.72] p-4">
              <p className="text-title-md text-foreground">{hovered.label}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{hovered.detail}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border/70 bg-white/[0.72] p-3">
                <p className="token-label">Status</p>
                <p className="mt-2 text-body-sm font-bold text-foreground">{hovered.status}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-white/[0.72] p-3">
                <p className="token-label">Metric</p>
                <p className="mt-2 text-body-sm font-bold text-foreground">{hovered.metric}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">Hover over the simulation to inspect a civic asset.</p>
        )}
      </div>

      <div className="surface-card rounded-lg p-5">
        <p className="token-label">Map provider</p>
        <h3 className="mt-1 text-title-md text-foreground">{tokenAvailable ? "Mapbox Light v11" : "Local fallback active"}</h3>
        <p className="mt-2 text-body-sm text-muted-foreground">
          {tokenAvailable
            ? "Mapbox powers the base map while PolisAI overlays live simulation entities."
            : "Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the Mapbox base layer in development and production."}
        </p>
      </div>
    </aside>
  );
}

function InspectorMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/[0.78] p-3 shadow-polis-xs">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-city-civic/10 text-city-civic">
          <Icon className="size-4" />
        </div>
        <p className="text-body-sm font-semibold text-foreground">{label}</p>
      </div>
      <Badge variant="glass">{value}</Badge>
    </div>
  );
}

function LegendChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/[0.78] px-3 py-2 text-caption font-bold text-muted-foreground shadow-polis-xs backdrop-blur-xl">
      <Icon className="size-3.5 text-city-civic" />
      {label}
    </div>
  );
}

function MapboxStatusDot({ active }: { active: boolean }) {
  return <span className={cn("size-2 rounded-full", active ? "bg-city-park" : "bg-city-solar")} />;
}

function iconForEntity(kind: EntityKind) {
  return {
    building: Building2,
    hospital: Hospital,
    school: GraduationCap,
    factory: Factory,
    citizen: UsersRound,
    vehicle: Car
  }[kind];
}

function toneClass(tone: CityEntity["tone"]) {
  return {
    civic: "bg-city-civic/10 text-city-civic",
    signal: "bg-city-signal/10 text-city-signal",
    solar: "bg-city-solar/[0.16] text-[#8A5A00]",
    park: "bg-city-park/10 text-city-park",
    coral: "bg-city-coral/10 text-city-coral",
    transit: "bg-city-transit/10 text-city-transit"
  }[tone];
}

function toneRing(tone: VehiclePath["tone"]) {
  return {
    civic: "text-city-civic ring-4 ring-city-civic/20",
    signal: "text-city-signal ring-4 ring-city-signal/20",
    solar: "text-[#8A5A00] ring-4 ring-city-solar/25",
    coral: "text-city-coral ring-4 ring-city-coral/20"
  }[tone];
}
