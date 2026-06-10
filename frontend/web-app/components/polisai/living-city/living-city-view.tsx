"use client";

// ============================================================================
// PolisAI — Living City View
// ----------------------------------------------------------------------------
// A SimCity-inspired isometric city in pure SVG + Framer Motion.
// Apple / Cities-Skylines / Figma visual language. Fully vector.
// Pan / zoom / hover. Mock data only (see ./city-model). Frontend only.
// ============================================================================

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import * as d3 from "d3";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Biohazard,
  Briefcase,
  Building2,
  Cake,
  Car,
  Check,
  Clock,
  Crosshair,
  Droplets,
  Factory,
  Flame,
  Gauge,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Hospital,
  ArrowRight,
  Landmark,
  Layers,
  Leaf,
  LineChart,
  MapPin,
  Maximize2,
  Minus,
  Mountain,
  Navigation,
  Network,
  Palette,
  Plus,
  Siren,
  Smile,
  Sparkles,
  Store,
  TrainFront,
  TreePine,
  TrendingUp,
  User,
  Users,
  Utensils,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiNewsFeed } from "./ai-news-feed";
import { WorldEnvironment } from "./world-environment";
import { SkyLayer } from "./sky-layer";
import { NightLights } from "./night-lights";
import { AiInsights } from "./ai-insights";
import { BootSequence } from "./boot-sequence";
import { emitEmergency, emitPolicy, useSimBus } from "./sim-bus";
import { useLiveSim } from "./live-sim";
import {
  CITY,
  iso,
  pointsAttr,
  shade,
  smoothPath,
  TILE_H,
  TILE_W,
  type Building,
  type BuildingKind,
  type Citizen,
  type Point,
  type Vehicle,
} from "./city-model";

// --- Tunables -------------------------------------------------------------

const MIN_SCALE = 0.16;
const MAX_SCALE = 2.4;
const FIT_RATIO = 0.94;

type View = { scale: number; x: number; y: number };

const KIND_ICON: Record<BuildingKind, LucideIcon> = {
  house: Building2,
  apartment: Building2,
  office: Building2,
  shop: Store,
  factory: Factory,
  hospital: Hospital,
  school: GraduationCap,
  government: Landmark,
  metro: TrainFront,
  park: TreePine,
};

const KIND_LABEL: Record<BuildingKind, string> = {
  house: "Residential",
  apartment: "Residential",
  office: "Commercial",
  shop: "Commercial",
  factory: "Industrial",
  hospital: "Hospital",
  school: "School",
  government: "Government",
  metro: "Metro station",
  park: "Park",
};

const TONE_HEX: Record<Building["tone"], string> = {
  civic: "#0FA7A2",
  signal: "#2F6BFF",
  transit: "#775CFF",
  solar: "#F6B73C",
  coral: "#F45D6B",
  park: "#2FB36D",
};

// --- Policy propagation ---------------------------------------------------

type Policy = {
  id: string;
  name: string;
  short: string;
  icon: LucideIcon;
  color: string;
  effects: { traffic?: number; pollution?: number; clean?: number };
};

const POLICIES: Policy[] = [
  { id: "ev", name: "EV Subsidy", short: "Electrify mobility", icon: Zap, color: "#2F6BFF", effects: { traffic: 0.12, pollution: 0.15, clean: 0.18 } },
  { id: "congestion", name: "Congestion Pricing", short: "Price the core", icon: Gauge, color: "#775CFF", effects: { traffic: 0.22, pollution: 0.08 } },
  { id: "green", name: "Green Energy", short: "Clean the grid", icon: Leaf, color: "#2FB36D", effects: { pollution: 0.26, clean: 0.1 } },
  { id: "transit", name: "Transit Expansion", short: "Expand metro", icon: TrainFront, color: "#0FA7A2", effects: { traffic: 0.16, clean: 0.06 } },
];

type Pulse = { key: number; color: string };

// Wave radiates from the city center across the whole map.
const ORIGIN = iso(CITY.size / 2, CITY.size / 2);
const MAXR =
  Math.max(
    ...[iso(0, 0), iso(CITY.size, 0), iso(0, CITY.size), iso(CITY.size, CITY.size)].map((c) =>
      Math.hypot(c.x - ORIGIN.x, c.y - ORIGIN.y),
    ),
  ) + 60;
// Reaction anchors (a sample of structures that "react" as the wave passes).
const ANCHORS: Point[] = CITY.buildings.filter((_, i) => i % 12 === 0).map((b) => iso(b.col + b.w / 2, b.row + b.d / 2));
// Smog sources for the pollution overlay.
const SMOG: Point[] = CITY.buildings.filter((b) => b.kind === "factory").map((b) => iso(b.col + b.w / 2, b.row + b.d / 2));

// --- Emergency Command ----------------------------------------------------

type EmZone = { x: number; y: number; r: number };
type EmVeh = "ambulance" | "fire" | "police";
type Scenario = {
  id: string;
  name: string;
  icon: LucideIcon;
  accent: string;
  headline: string;
  subtext: string;
  severity: string;
  units: number;
  zones: EmZone[];
  vehicles: EmVeh[];
  ticker: string[];
};

const EM_RIVER: Point[] = CITY.river.center.filter((_, i) => i % 12 === 0).slice(1, 7);
const EM_HOSPITALS: Point[] = CITY.buildings
  .filter((b) => b.kind === "hospital")
  .map((b) => iso(b.col + b.w / 2, b.row + b.d / 2));
const EM_CENTER = iso(CITY.size / 2, CITY.size / 2);

const EM_SCENARIOS: Scenario[] = [
  {
    id: "flood",
    name: "Flood",
    icon: Droplets,
    accent: "#2E73F0",
    headline: "Flash flood warning",
    subtext: "Riverside districts evacuating — water levels rising",
    severity: "Severe",
    units: 14,
    zones: (EM_RIVER.length ? EM_RIVER : [EM_CENTER]).map((p) => ({ x: p.x, y: p.y, r: 74 })),
    vehicles: ["ambulance", "police", "ambulance"],
    ticker: ["Levee breach on Harbor canal", "Evacuation route 7 now open", "3 shelters near capacity", "Water-rescue teams deployed to Quayside", "Power cut to flooded substations"],
  },
  {
    id: "fire",
    name: "Fire",
    icon: Flame,
    accent: "#F0641E",
    headline: "Major fire — industrial zone",
    subtext: "Multiple structures ablaze — air quality hazardous",
    severity: "Critical",
    units: 18,
    zones: (SMOG.length ? SMOG : [EM_CENTER]).map((p) => ({ x: p.x, y: p.y - 28, r: 66 })),
    vehicles: ["fire", "fire", "ambulance"],
    ticker: ["Fire spreading to North Mill", "12 engines on scene", "Hazmat assessing chemical store", "Wind shifting NE — homes at risk", "Mutual aid requested"],
  },
  {
    id: "pandemic",
    name: "Pandemic",
    icon: Biohazard,
    accent: "#9B5BF0",
    headline: "Public health emergency",
    subtext: "Outbreak detected — hospitals at surge capacity",
    severity: "High",
    units: 22,
    zones: [...(EM_HOSPITALS.length ? EM_HOSPITALS : [EM_CENTER]).map((p) => ({ x: p.x, y: p.y, r: 58 })), { x: EM_CENTER.x, y: EM_CENTER.y, r: 120 }],
    vehicles: ["ambulance", "ambulance", "police"],
    ticker: ["ICU occupancy at 96%", "Mobile testing units dispatched", "Mask mandate reinstated", "Vaccine clinics extend hours", "Contact tracing scaled up"],
  },
  {
    id: "earthquake",
    name: "Earthquake",
    icon: Mountain,
    accent: "#E0A02E",
    headline: "Earthquake — magnitude 6.2",
    subtext: "Structural damage citywide — aftershocks expected",
    severity: "Critical",
    units: 26,
    zones: [
      { x: EM_CENTER.x, y: EM_CENTER.y, r: 92 },
      { x: EM_CENTER.x - 160, y: EM_CENTER.y - 40, r: 62 },
      { x: EM_CENTER.x + 180, y: EM_CENTER.y + 30, r: 62 },
      { x: EM_CENTER.x - 60, y: EM_CENTER.y + 130, r: 58 },
    ],
    vehicles: ["fire", "ambulance", "police", "ambulance"],
    ticker: ["Bridge inspections underway", "Gas leaks reported downtown", "Search & rescue mobilized", "Aftershock M4.1 recorded", "Hospitals on generator power"],
  },
];

// Emergency response loops (vehicles race these road circuits).
const emLoop = (c1: number, r1: number, c2: number, r2: number): Point[] => {
  const pts: Point[] = [];
  for (let c = c1; c <= c2; c++) pts.push(iso(c + 0.5, r1 + 0.5));
  for (let r = r1 + 1; r <= r2; r++) pts.push(iso(c2 + 0.5, r + 0.5));
  for (let c = c2 - 1; c >= c1; c--) pts.push(iso(c + 0.5, r2 + 0.5));
  for (let r = r2 - 1; r >= r1 + 1; r--) pts.push(iso(c1 + 0.5, r + 0.5));
  pts.push(iso(c1 + 0.5, r1 + 0.5));
  return pts;
};
const EM_LOOPS: Point[][] = [emLoop(5, 5, 25, 25), emLoop(10, 8, 22, 20), emLoop(6, 10, 16, 24)];

// --- City heatmaps (Mapbox-style density overlays) ------------------------

type HeatLayerId = "population" | "traffic" | "pollution" | "healthcare" | "education";
type HeatCfg = { id: HeatLayerId; label: string; icon: LucideIcon; interp: (t: number) => string; hot: string };

const HEAT_LAYERS: HeatCfg[] = [
  { id: "population", label: "Population", icon: Users, interp: d3.interpolateTurbo, hot: d3.interpolateTurbo(0.82) },
  { id: "traffic", label: "Traffic", icon: Car, interp: d3.interpolateYlOrRd, hot: d3.interpolateYlOrRd(0.8) },
  { id: "pollution", label: "Pollution", icon: Wind, interp: d3.interpolateYlOrBr, hot: d3.interpolateYlOrBr(0.85) },
  { id: "healthcare", label: "Healthcare", icon: HeartPulse, interp: d3.interpolateGnBu, hot: d3.interpolateGnBu(0.85) },
  { id: "education", label: "Education", icon: GraduationCap, interp: d3.interpolateBuPu, hot: d3.interpolateBuPu(0.85) },
];

const HSIZE = CITY.size;
const HROAD = CITY.roadStep;
const HN = 13; // density grid resolution
const bctr = (b: Building) => ({ x: b.col + b.w / 2, y: b.row + b.d / 2 });

const srcResid = CITY.buildings.filter((b) => b.kind === "house" || b.kind === "apartment").map((b) => ({ ...bctr(b), w: b.kind === "apartment" ? 3 : 1 }));
const srcFact = CITY.buildings.filter((b) => b.kind === "factory").map((b) => ({ ...bctr(b), w: 3 }));
const srcHosp = CITY.buildings.filter((b) => b.kind === "hospital").map((b) => ({ ...bctr(b), w: 4 }));
const srcSchool = CITY.buildings.filter((b) => b.kind === "school").map((b) => ({ ...bctr(b), w: 4 }));
const srcRoad: { x: number; y: number; w: number }[] = [];
for (let c = 0; c <= HSIZE; c += HROAD)
  for (let r = 0; r <= HSIZE; r += HROAD) {
    const dc = c - HSIZE / 2;
    const dr = r - HSIZE / 2;
    srcRoad.push({ x: c, y: r, w: 1 + Math.max(0, 1 - Math.hypot(dc, dr) / (HSIZE * 0.55)) });
  }

type HeatBlob = { x: number; y: number; v: number };
function heatField(sources: { x: number; y: number; w: number }[], sigma: number): HeatBlob[] {
  const raw: { col: number; row: number; v: number }[] = [];
  let max = 0;
  for (let gi = 0; gi < HN; gi++)
    for (let gj = 0; gj < HN; gj++) {
      const col = ((gi + 0.5) / HN) * HSIZE;
      const row = ((gj + 0.5) / HN) * HSIZE;
      let v = 0;
      for (const s of sources) {
        const d2 = (col - s.x) ** 2 + (row - s.y) ** 2;
        v += s.w * Math.exp(-d2 / (2 * sigma * sigma));
      }
      if (v > max) max = v;
      raw.push({ col, row, v });
    }
  return raw
    .map((c) => {
      const p = iso(c.col, c.row);
      return { x: p.x, y: p.y, v: max ? c.v / max : 0 };
    })
    .filter((b) => b.v > 0.06);
}

const HEAT_DATA: Record<HeatLayerId, HeatBlob[]> = {
  population: heatField(srcResid, 4.5),
  traffic: heatField(srcRoad, 3.8),
  pollution: heatField(srcFact.length ? srcFact : srcRoad, 4),
  healthcare: heatField(srcHosp.length ? srcHosp : srcResid, 6),
  education: heatField(srcSchool.length ? srcSchool : srcResid, 6),
};

// --- Geometry helpers -----------------------------------------------------

/** Offset a screen polyline by `gap` px perpendicular to its local direction. */
function offsetPolyline(pts: Point[], gap: number): Point[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return { x: p.x - dy * gap, y: p.y + dx * gap };
  });
}

// ============================================================================
// Root
// ============================================================================

export function LivingCityView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ scale: 0.5, x: 0, y: 0 });
  const [hovered, setHovered] = useState<Building | null>(null);
  const [selected, setSelected] = useState<Building | null>(null);
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [policies, setPolicies] = useState<Set<string>>(() => new Set());
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [emergency, setEmergency] = useState<Scenario | null>(null);
  const [heatLayer, setHeatLayer] = useState<HeatLayerId | null>(null);
  const liveSim = useLiveSim(); // bridges backend KPIs + WS events into the cascade
  const [tool, setTool] = useState<"heat" | "legend" | "emergency" | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const pulseKey = useRef(0);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const togglePolicy = useCallback(
    (p: Policy) => {
      const turningOn = !policies.has(p.id);
      setPolicies((prev) => {
        const next = new Set(prev);
        if (next.has(p.id)) next.delete(p.id);
        else next.add(p.id);
        return next;
      });
      if (turningOn) {
        pulseKey.current += 1;
        setPulse({ key: pulseKey.current, color: p.color });
      }
      emitPolicy(p.id, turningOn); // cascade → news + agents + KPIs
    },
    [policies],
  );

  // persist the active policy set
  useEffect(() => {
    try {
      const raw = localStorage.getItem("polis_policies");
      if (raw) setPolicies(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("polis_policies", JSON.stringify([...policies]));
    } catch {
      /* ignore */
    }
  }, [policies]);

  const activePolicies = POLICIES.filter((p) => policies.has(p.id));
  const trafficReduction = Math.min(0.6, activePolicies.reduce((s, p) => s + (p.effects.traffic ?? 0), 0));
  const pollutionReduction = Math.min(0.78, activePolicies.reduce((s, p) => s + (p.effects.pollution ?? 0), 0));
  const cleanBoost = Math.min(0.5, activePolicies.reduce((s, p) => s + (p.effects.clean ?? 0), 0));
  const floatRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<Building | null>(null);

  const { bounds } = CITY;

  // --- cinematic camera: eased zoom/focus, pan momentum, idle auto-tour ---
  const viewRef = useRef(view);
  viewRef.current = view;
  const camRaf = useRef(0);
  const velRef = useRef({ vx: 0, vy: 0 });
  const prevPt = useRef({ x: 0, y: 0 });
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tourRef = useRef(0);

  const cancelCam = useCallback(() => {
    if (camRaf.current) cancelAnimationFrame(camRaf.current);
    camRaf.current = 0;
  }, []);

  const animateTo = useCallback(
    (target: View, duration = 650) => {
      cancelCam();
      const start = viewRef.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3);
        const v: View = {
          scale: start.scale + (target.scale - start.scale) * e,
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
        };
        viewRef.current = v;
        setView(v);
        camRaf.current = k < 1 ? requestAnimationFrame(step) : 0;
      };
      camRaf.current = requestAnimationFrame(step);
    },
    [cancelCam],
  );

  const startMomentum = useCallback(
    (vx: number, vy: number) => {
      cancelCam();
      let cvx = vx;
      let cvy = vy;
      const step = () => {
        cvx *= 0.92;
        cvy *= 0.92;
        if (Math.abs(cvx) < 0.15 && Math.abs(cvy) < 0.15) {
          camRaf.current = 0;
          return;
        }
        const v: View = { ...viewRef.current, x: viewRef.current.x + cvx, y: viewRef.current.y + cvy };
        viewRef.current = v;
        setView(v);
        camRaf.current = requestAnimationFrame(step);
      };
      camRaf.current = requestAnimationFrame(step);
    },
    [cancelCam],
  );

  const TOUR = useMemo(() => {
    const pick = (k: Building["kind"]) => CITY.buildings.find((b) => b.kind === k);
    return [pick("government"), pick("hospital"), CITY.metroStations[0], pick("factory"), pick("school")]
      .filter((b): b is Building => Boolean(b))
      .map((b) => iso(b.col + b.w / 2, b.row + b.d / 2));
  }, []);

  const runTour = useCallback(() => {
    const el = containerRef.current;
    if (!el || TOUR.length === 0) return;
    const g = TOUR[tourRef.current % TOUR.length];
    tourRef.current += 1;
    const scale = 1.05;
    animateTo(
      { scale, x: el.clientWidth / 2 - (g.x - bounds.minX) * scale, y: el.clientHeight * 0.5 - (g.y - bounds.minY) * scale },
      2800,
    );
    idleRef.current = setTimeout(runTour, 7000);
  }, [TOUR, animateTo, bounds.minX, bounds.minY]);

  const bumpIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(runTour, 18000);
  }, [runTour]);

  const focusOn = useCallback(
    (b: Building) => {
      const el = containerRef.current;
      if (!el) return;
      const g = iso(b.col + b.w / 2, b.row + b.d / 2);
      const scale = Math.min(MAX_SCALE, Math.max(viewRef.current.scale, 0.95));
      animateTo({
        scale,
        x: el.clientWidth / 2 - (g.x - bounds.minX) * scale,
        y: el.clientHeight * 0.5 - (g.y - bounds.minY) * scale,
      });
    },
    [animateTo, bounds.minX, bounds.minY],
  );

  // Position the cursor-following hover card via direct DOM writes (no React
  // state on pointermove → the heavy SVG never re-renders while you move).
  const positionFloat = useCallback(() => {
    const el = containerRef.current;
    const card = floatRef.current;
    if (!el || !card) return;
    const { x, y } = cursorRef.current;
    const w = card.offsetWidth || 248;
    const h = card.offsetHeight || 150;
    const gap = 18;
    let px = x + gap;
    if (px + w > el.clientWidth - 8) px = x - gap - w;
    if (px < 8) px = 8;
    let py = y + gap;
    if (py + h > el.clientHeight - 8) py = Math.max(8, y - gap - h);
    card.style.transform = `translate(${px}px, ${py}px)`;
  }, []);

  const handleHover = useCallback((b: Building | null) => setHovered(b), []);
  const handleSelect = useCallback(
    (b: Building) => {
      if (!dragRef.current?.moved) {
        bumpIdle();
        setSelected(b);
        setCitizen(null);
        focusOn(b);
      }
    },
    [bumpIdle, focusOn],
  );
  const handleSelectCitizen = useCallback(
    (c: Citizen) => {
      bumpIdle();
      setCitizen(c);
      setSelected(null);
      setHovered(null);
    },
    [bumpIdle],
  );

  useLayoutEffect(() => {
    hoveredRef.current = hovered;
    if (hovered) positionFloat();
  }, [hovered, positionFloat]);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const scale = Math.min(cw / bounds.width, ch / bounds.height) * FIT_RATIO;
    setView({ scale, x: (cw - bounds.width * scale) / 2, y: (ch - bounds.height * scale) / 2 });
  }, [bounds.width, bounds.height]);

  useLayoutEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // start the idle countdown that triggers the cinematic auto-tour
  useEffect(() => {
    bumpIdle();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      cancelCam();
    };
  }, [bumpIdle, cancelCam]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const el = containerRef.current;
      const v = viewRef.current;
      const px = cx ?? (el ? el.clientWidth / 2 : 0);
      const py = cy ?? (el ? el.clientHeight / 2 : 0);
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const worldX = (px - v.x) / v.scale;
      const worldY = (py - v.y) / v.scale;
      animateTo({ scale: next, x: px - worldX * next, y: py - worldY * next }, 360);
    },
    [animateTo],
  );

  const resetView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scale = Math.min(el.clientWidth / bounds.width, el.clientHeight / bounds.height) * FIT_RATIO;
    animateTo({ scale, x: (el.clientWidth - bounds.width * scale) / 2, y: (el.clientHeight - bounds.height * scale) / 2 }, 700);
  }, [animateTo, bounds.width, bounds.height]);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      bumpIdle();
      zoomBy(e.deltaY > 0 ? 0.85 : 1.18, e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoomBy, bumpIdle],
  );

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      bumpIdle();
      zoomBy(1.8, e.clientX - rect.left, e.clientY - rect.top);
    },
    [zoomBy, bumpIdle],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
      cancelCam();
      bumpIdle();
      setHovered(null); // hide the hover card while panning
      velRef.current = { vx: 0, vy: 0 };
      prevPt.current = { x: e.clientX, y: e.clientY };
      dragRef.current = { x: e.clientX, y: e.clientY, px: viewRef.current.x, py: viewRef.current.y, moved: false };
    },
    [cancelCam, bumpIdle],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (hoveredRef.current) positionFloat();
      }
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      velRef.current = { vx: e.clientX - prevPt.current.x, vy: e.clientY - prevPt.current.y };
      prevPt.current = { x: e.clientX, y: e.clientY };
      const v: View = { ...viewRef.current, x: d.px + dx, y: d.py + dy };
      viewRef.current = v;
      setView(v);
    },
    [positionFloat],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
      bumpIdle();
      if (d && !d.moved) {
        setSelected(null);
        setCitizen(null);
        return;
      }
      const { vx, vy } = velRef.current;
      if (Math.abs(vx) > 2 || Math.abs(vy) > 2) startMomentum(vx * 0.9, vy * 0.9);
    },
    [bumpIdle, startMomentum],
  );

  return (
    <div className="relative h-[90svh] min-h-[600px] w-full overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-b from-[#E7F3F2] via-[#EFF7F6] to-[#E3EFEC] shadow-glass">
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onPointerLeave={() => {
          dragRef.current = null;
          setHovered(null);
        }}
      >
        <CityStage
          view={view}
          hovered={hovered}
          selected={selected}
          onHover={handleHover}
          onSelect={handleSelect}
          pulse={pulse}
          trafficReduction={trafficReduction}
          pollutionReduction={pollutionReduction}
          emergency={emergency}
          onSelectCitizen={handleSelectCitizen}
          heatLayer={heatLayer}
        />
      </div>

      {/* ambient aerial life + light sweep */}
      <SkyLayer />

      {/* street lamps that wake up at dusk (shares the city camera) */}
      <NightLights view={view} />

      {/* dynamic day/night world + floating time controls */}
      <WorldEnvironment />

      {/* cinematic vignette frame */}
      <div className="pointer-events-none absolute inset-0 z-[6] rounded-3xl" style={{ boxShadow: "inset 0 0 120px 10px rgba(8,14,24,0.35), inset 0 0 24px rgba(8,14,24,0.25)" }} />

      {/* floating AI insights narrating the city */}
      <AiInsights view={view} containerRef={containerRef} />

      {/* top-left: minimal identity + the only persistent widget besides news */}
      <div className="pointer-events-none absolute left-5 top-5 z-10 flex flex-col gap-3">
        <CityHeader />
        <AgentStatus status={liveSim.status} tick={liveSim.tick} />
      </div>

      {/* News feed (right rail) — one of the three kept surfaces */}
      <AiNewsFeed />

      {/* floating command bar — everything else lives behind a button */}
      <FloatingToolbar
        scale={view.scale}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(0.8)}
        onReset={resetView}
        tool={tool}
        onTool={(t) => setTool((cur) => (cur === t ? null : t))}
        onPolicy={() => {
          setTool(null);
          setPolicyOpen((o) => !o);
        }}
        heatActive={Boolean(heatLayer)}
        policyActive={policies.size > 0}
        emActive={Boolean(emergency)}
      />

      {/* on-demand floating panels (summoned from the command bar) */}
      <AnimatePresence>
        {tool === "heat" ? (
          <ToolPopover key="heat">
            <HeatmapSwitcher active={heatLayer} onSelect={setHeatLayer} />
          </ToolPopover>
        ) : null}
        {tool === "legend" ? (
          <ToolPopover key="legend">
            <Legend />
          </ToolPopover>
        ) : null}
        {tool === "emergency" ? (
          <ToolPopover key="em">
            <EmergencyPopover
              onActivate={(s) => {
                setEmergency(s);
                setTool(null);
                emitEmergency(s.name, s.accent, s.headline);
              }}
            />
          </ToolPopover>
        ) : null}
      </AnimatePresence>

      {/* Policy Lab — modal */}
      <AnimatePresence>
        {policyOpen ? (
          <PolicyModal
            policies={policies}
            onToggle={togglePolicy}
            traffic={trafficReduction}
            pollution={pollutionReduction}
            clean={cleanBoost}
            onClose={() => setPolicyOpen(false)}
            onScenario={() => {
              setPolicyOpen(false);
              setScenarioOpen(true);
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* 10-year scenario projection + AI recommendation + SDG alignment */}
      <AnimatePresence>
        {scenarioOpen ? (
          <ScenarioReport
            policies={policies}
            traffic={trafficReduction}
            pollution={pollutionReduction}
            clean={cleanBoost}
            onClose={() => setScenarioOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      {/* Emergency alert banner (when a scenario is live) */}
      <AnimatePresence>
        {emergency ? <AlertBanner key={emergency.id} scenario={emergency} onStandDown={() => setEmergency(null)} /> : null}
      </AnimatePresence>

      {/* Cursor-following hover card (positioned imperatively via floatRef) */}
      <div ref={floatRef} className="pointer-events-none absolute left-0 top-0 z-30 w-[15.5rem] will-change-transform">
        <AnimatePresence>{hovered ? <HoverCard key={hovered.id} building={hovered} /> : null}</AnimatePresence>
      </div>

      {/* Click-to-open building panel */}
      <SidePanel building={selected} onClose={() => setSelected(null)} onFocus={focusOn} />

      {/* GTA-style citizen inspection drawer */}
      <CitizenDrawer citizen={citizen} onClose={() => setCitizen(null)} />

      {/* cinematic boot intro — wipes away to reveal the living city */}
      <BootSequence />
    </div>
  );
}

// ============================================================================
// SVG stage — layered back to front
// ============================================================================

const CityStage = memo(function CityStage({
  view,
  hovered,
  selected,
  onHover,
  onSelect,
  pulse,
  trafficReduction,
  pollutionReduction,
  emergency,
  onSelectCitizen,
  heatLayer,
}: {
  view: View;
  hovered: Building | null;
  selected: Building | null;
  onHover: (b: Building | null) => void;
  onSelect: (b: Building) => void;
  pulse: Pulse | null;
  trafficReduction: number;
  pollutionReduction: number;
  emergency: Scenario | null;
  onSelectCitizen: (c: Citizen) => void;
  heatLayer: HeatLayerId | null;
}) {
  const { bounds } = CITY;

  const twinkleIds = useMemo(
    () =>
      new Set(
        CITY.buildings
          .filter((b) => b.height > 48 && b.kind !== "factory")
          .slice(0, 14)
          .map((b) => b.id),
      ),
    [],
  );

  // Metro stations share the depth-sorted building layer so occlusion is correct.
  const structures = useMemo(
    () => [...CITY.buildings, ...CITY.metroStations].sort((a, b) => a.depth - b.depth),
    [],
  );

  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      style={{
        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        transformOrigin: "0 0",
        willChange: "transform",
      }}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id="lc-sun" cx="30%" cy="12%" r="85%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#EAF6F5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#DCEAEB" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lc-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DDEFE1" />
          <stop offset="100%" stopColor="#C3DECC" />
        </linearGradient>
        <linearGradient id="lc-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C2E8F8" />
          <stop offset="55%" stopColor="#8CCBEC" />
          <stop offset="100%" stopColor="#5FAEDC" />
        </linearGradient>
        <filter id="lc-shadow" x="-20%" y="-20%" width="140%" height="170%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#11253E" floodOpacity="0.17" />
        </filter>
        <radialGradient id="lc-smog" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C6B49" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7C6B49" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="em-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF3B30" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#FF3B30" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="em-vignette" cx="50%" cy="50%" r="62%">
          <stop offset="52%" stopColor="#FF2020" stopOpacity="0" />
          <stop offset="100%" stopColor="#C81E1E" stopOpacity="0.6" />
        </radialGradient>
        <filter id="heat-blur" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} fill="url(#lc-sun)" />

      <CloudLayer />

      <Ground />
      <RiverLayer />
      <Roads />
      <MetroTracks />
      <Scenery />

      {/* transparent catcher: clears the hover card when the pointer is over
          empty city (anything that isn't a building) */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        onPointerEnter={() => onHover(null)}
      />

      <g filter="url(#lc-shadow)">
        {structures.map((b) => (
          <IsoBuilding
            key={b.id}
            b={b}
            twinkle={twinkleIds.has(b.id)}
            active={selected?.id === b.id || hovered?.id === b.id}
            dimmed={Boolean(selected) && selected?.id !== b.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </g>

      <PollutionHaze reduction={pollutionReduction} />
      <Citizens onSelect={onSelectCitizen} />
      <motion.g animate={{ opacity: 1 - trafficReduction * 0.75 }} transition={{ duration: 1.2, ease: "easeOut" }}>
        <Traffic />
      </motion.g>

      {/* Heatmap overlays — dim the city, then crossfade the active density field */}
      <AnimatePresence>
        {heatLayer ? (
          <motion.rect
            key="heat-dim"
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
            fill="#0A1020"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            pointerEvents="none"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{heatLayer ? <HeatmapLayer key={heatLayer} layer={heatLayer} /> : null}</AnimatePresence>

      <PolicyWave pulse={pulse} />

      {/* Emergency Command: darken the city, glow affected zones, scramble units */}
      {emergency ? (
        <g>
          <EmergencyDark />
          <ZoneGlows scenario={emergency} />
          <EmergencyFleet scenario={emergency} />
        </g>
      ) : null}

      {selected ? <SelectionMarker b={selected} /> : null}
    </svg>
  );
});

// ============================================================================
// Ground
// ============================================================================

const Ground = memo(function Ground() {
  const { size } = CITY;
  const plane: Point[] = [iso(0, 0), iso(size, 0), iso(size, size), iso(0, size)];
  const cells: { pts: Point[]; light: boolean }[] = [];
  for (let c = 0; c < size; c += 2) {
    for (let r = 0; r < size; r += 2) {
      cells.push({
        pts: [iso(c, r), iso(c + 2, r), iso(c + 2, r + 2), iso(c, r + 2)],
        light: ((c + r) / 2) % 2 === 0,
      });
    }
  }
  return (
    <g>
      <polygon points={pointsAttr(plane)} fill="url(#lc-ground)" />
      <g opacity={0.4}>
        {cells.map((cell, i) => (
          <polygon key={i} points={pointsAttr(cell.pts)} fill={cell.light ? "#DEEEE1" : "#CFE5D6"} />
        ))}
      </g>
      <polygon points={pointsAttr(plane)} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} />
    </g>
  );
});

// ============================================================================
// River — vector ribbon with animated current
// ============================================================================

const RiverLayer = memo(function RiverLayer() {
  const { river } = CITY;
  return (
    <g>
      {/* shore / banks */}
      <polygon points={pointsAttr(river.shore)} fill="#CDE7D2" />
      <polygon points={pointsAttr(river.shore)} fill="none" stroke="#B6D9BF" strokeWidth={2} strokeOpacity={0.6} />
      {/* water body */}
      <polygon points={pointsAttr(river.ribbon)} fill="url(#lc-water)" />
      {/* bank highlight */}
      <polygon points={pointsAttr(river.ribbon)} fill="none" stroke="#EAF7FF" strokeWidth={1.4} strokeOpacity={0.5} />
      {/* animated current lines */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={smoothPath(river.center)}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.32}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="3 30"
          initial={{ strokeDashoffset: i * 11 }}
          animate={{ strokeDashoffset: i * 11 - 33 }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
          style={{ transform: `translateX(${(i - 1) * 5}px)` }}
        />
      ))}
    </g>
  );
});

// ============================================================================
// Roads — asphalt bands + animated lane flow (roads draw OVER water = bridges)
// ============================================================================

const Roads = memo(function Roads() {
  const { size, roadLanes } = CITY;
  return (
    <g>
      {/* asphalt bands */}
      {roadLanes.map((lane, i) => {
        const pts: Point[] = lane.vertical
          ? [iso(lane.k, 0), iso(lane.k + 1, 0), iso(lane.k + 1, size), iso(lane.k, size)]
          : [iso(0, lane.k), iso(size, lane.k), iso(size, lane.k + 1), iso(0, lane.k + 1)];
        return <polygon key={i} points={pointsAttr(pts)} fill="#39435A" fillOpacity={0.94} />;
      })}
      {/* curb highlights */}
      {roadLanes.map((lane, i) => (
        <line
          key={`c-${i}`}
          x1={lane.center[0].x}
          y1={lane.center[0].y}
          x2={lane.center[1].x}
          y2={lane.center[1].y}
          stroke="#11202F"
          strokeOpacity={0.25}
          strokeWidth={14}
          strokeLinecap="round"
        />
      ))}
      {/* animated flowing lane markings */}
      {roadLanes.map((lane, i) => (
        <motion.line
          key={`m-${i}`}
          x1={lane.center[0].x}
          y1={lane.center[0].y}
          x2={lane.center[1].x}
          y2={lane.center[1].y}
          stroke="#F6CE5A"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeDasharray="9 13"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -22 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </g>
  );
});

// ============================================================================
// Metro tracks — ground rails with ballast + ties
// ============================================================================

const MetroTracks = memo(function MetroTracks() {
  return (
    <g>
      {CITY.metroLines.map((line) => {
        const ballast = [...offsetPolyline(line.center, 5.5), ...offsetPolyline(line.center, -5.5).reverse()];
        const railA = offsetPolyline(line.center, 2.4);
        const railB = offsetPolyline(line.center, -2.4);
        const ties: { a: Point; b: Point }[] = [];
        for (let i = 0; i < line.center.length; i += 1) {
          ties.push({ a: railA[i], b: railB[i] });
        }
        return (
          <g key={line.id}>
            <polygon points={pointsAttr(ballast)} fill="#5A6072" opacity={0.9} />
            <g stroke="#3C4150" strokeWidth={2.4} strokeLinecap="round">
              {ties.map((t, i) => (
                <line key={i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} />
              ))}
            </g>
            <path d={smoothPath(railA)} fill="none" stroke="#C7CEDA" strokeWidth={1.5} />
            <path d={smoothPath(railB)} fill="none" stroke="#C7CEDA" strokeWidth={1.5} />
            {/* subtle line-colour glow down the centre */}
            <path d={smoothPath(line.center)} fill="none" stroke={line.color} strokeWidth={1} strokeOpacity={0.45} />
          </g>
        );
      })}
    </g>
  );
});

// ============================================================================
// Scenery — riverside trees
// ============================================================================

const Scenery = memo(function Scenery() {
  return (
    <g>
      {CITY.scenery.map((t, i) => (
        <g key={i} transform={`translate(${t.p.x}, ${t.p.y})`}>
          <ellipse cx={0} cy={3} rx={9 * t.scale} ry={4 * t.scale} fill="#11253E" opacity={0.12} />
          <motion.g
            style={{ transformOrigin: "center bottom" }}
            animate={{ rotate: [-2.5, 2.5, -2.5] }}
            transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            transform={`scale(${t.scale})`}
          >
            <rect x={-1.6} y={-3} width={3.2} height={12} rx={1.2} fill="#7A5A38" />
            <circle cx={0} cy={-10} r={9} fill="#2FB36D" />
            <circle cx={-5} cy={-6} r={6.5} fill="#3CC07D" />
            <circle cx={5} cy={-7} r={6.5} fill="#27A368" />
            <circle cx={0} cy={-14} r={5.5} fill="#46C98A" />
          </motion.g>
        </g>
      ))}
    </g>
  );
});

// ============================================================================
// Isometric building
// ============================================================================

function faces(b: Building) {
  const A = iso(b.col, b.row);
  const B = iso(b.col + b.w, b.row);
  const C = iso(b.col + b.w, b.row + b.d);
  const D = iso(b.col, b.row + b.d);
  const up = (p: Point): Point => ({ x: p.x, y: p.y - b.height });
  return {
    A, B, C, D,
    top: [up(A), up(B), up(C), up(D)] as Point[],
    right: [B, C, up(C), up(B)] as Point[],
    left: [D, C, up(C), up(D)] as Point[],
  };
}

const IsoBuilding = memo(function IsoBuilding({
  b,
  twinkle,
  active,
  dimmed,
  onHover,
  onSelect,
}: {
  b: Building;
  twinkle: boolean;
  active: boolean;
  dimmed: boolean;
  onHover: (b: Building | null) => void;
  onSelect: (b: Building) => void;
}) {
  if (b.kind === "park") {
    return <ParkTile b={b} active={active} dimmed={dimmed} onHover={onHover} onSelect={onSelect} />;
  }

  const f = faces(b);
  const tall = b.height > 34;

  const floors: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (tall) {
    const n = Math.max(1, Math.floor(b.height / 14));
    for (let i = 1; i < n; i++) {
      const dy = (b.height / n) * i;
      floors.push({ x1: f.B.x, y1: f.B.y - dy, x2: f.C.x, y2: f.C.y - dy });
      floors.push({ x1: f.D.x, y1: f.D.y - dy, x2: f.C.x, y2: f.C.y - dy });
    }
  }

  return (
    <g
      style={{ cursor: "pointer" }}
      opacity={dimmed ? 0.5 : 1}
      onPointerEnter={() => onHover(b)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(b);
      }}
    >
      <polygon points={pointsAttr(f.left)} fill={b.palette.right} />
      <polygon points={pointsAttr(f.right)} fill={b.palette.left} />
      <polygon
        points={pointsAttr(f.top)}
        fill={active ? shade(b.palette.top, 0.12) : b.palette.top}
        stroke={active ? TONE_HEX[b.tone] : "#FFFFFF"}
        strokeOpacity={active ? 1 : 0.5}
        strokeWidth={active ? 2.5 : 0.7}
      />

      {floors.length > 0 ? (
        <g stroke="#0B1622" strokeOpacity={0.12} strokeWidth={0.8}>
          {floors.map((fl, i) => (
            <line key={i} x1={fl.x1} y1={fl.y1} x2={fl.x2} y2={fl.y2} />
          ))}
        </g>
      ) : null}

      {twinkle ? <Windows b={b} f={f} /> : null}
      <RoofAccent b={b} f={f} />
    </g>
  );
});

function Windows({ b, f }: { b: Building; f: ReturnType<typeof faces> }) {
  const cols = Math.max(2, b.w * 2);
  const rows = Math.max(2, Math.floor(b.height / 16));
  const lit: { p: Point[]; phase: number }[] = [];
  for (let c = 0; c < cols && lit.length < 8; c++) {
    for (let r = 0; r < rows && lit.length < 8; r++) {
      if ((c * 7 + r * 13 + Math.floor(b.phase * 10)) % 5 < 2) continue;
      const fx0 = (c + 0.25) / cols;
      const fx1 = (c + 0.75) / cols;
      const yTop = ((r + 0.25) / rows) * b.height;
      const yBot = ((r + 0.7) / rows) * b.height;
      const edge = (t: number, y: number): Point => ({
        x: f.B.x + (f.C.x - f.B.x) * t,
        y: f.B.y + (f.C.y - f.B.y) * t - (b.height - y),
      });
      lit.push({ p: [edge(fx0, yBot), edge(fx1, yBot), edge(fx1, yTop), edge(fx0, yTop)], phase: (c + r) % 4 });
    }
  }
  return (
    <g>
      {lit.map((w, i) => (
        <motion.polygon
          key={i}
          points={pointsAttr(w.p)}
          fill="#FFE7A6"
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.2, 0.85, 0.35, 0.7, 0.2] }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: w.phase * 0.6 }}
        />
      ))}
    </g>
  );
}

function RoofAccent({ b, f }: { b: Building; f: ReturnType<typeof faces> }) {
  const cx = (f.top[0].x + f.top[2].x) / 2;
  const cy = (f.top[0].y + f.top[2].y) / 2;

  switch (b.kind) {
    case "hospital":
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <rect x={-3} y={-9} width={6} height={18} rx={1.5} fill="#F45D6B" />
          <rect x={-9} y={-3} width={18} height={6} rx={1.5} fill="#F45D6B" />
        </g>
      );
    case "government":
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <rect x={-12} y={-6} width={24} height={10} rx={2} fill={shade(b.palette.top, 0.18)} />
          <ellipse cx={0} cy={-6} rx={11} ry={6} fill="#E7CE84" />
          <ellipse cx={0} cy={-8} rx={4} ry={4} fill="#D9B65C" />
          <rect x={-1.2} y={-18} width={2.4} height={8} fill="#B9933E" />
        </g>
      );
    case "school":
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <rect x={-2} y={-14} width={1.6} height={12} fill="#8A5A00" />
          <polygon points="-0.4,-14 7,-11.5 -0.4,-9" fill="#F45D6B" />
        </g>
      );
    case "factory":
      return (
        <g>
          {[0.3, 0.62].map((t, i) => {
            const x = f.top[0].x + (f.top[1].x - f.top[0].x) * t;
            const y = f.top[0].y + (f.top[1].y - f.top[0].y) * t - 2;
            return (
              <g key={i}>
                <rect x={x - 3} y={y - 16} width={6} height={16} rx={1} fill={shade(b.palette.right, -0.1)} />
                <rect x={x - 3} y={y - 16} width={6} height={3} fill="#E7A23C" />
                {[0, 1, 2].map((p) => (
                  <motion.circle
                    key={p}
                    cx={x}
                    cy={y - 16}
                    r={3}
                    fill="#C9D2DC"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0], cy: [y - 16, y - 40], r: [3, 9] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: i * 1.2 + p * 1.3 }}
                  />
                ))}
              </g>
            );
          })}
        </g>
      );
    case "metro":
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          <motion.ellipse
            cx={0}
            cy={6}
            rx={15}
            ry={7.5}
            fill="none"
            stroke="#775CFF"
            strokeWidth={2}
            initial={{ opacity: 0.5, scale: 0.6 }}
            animate={{ opacity: [0.55, 0], scale: [0.6, 1.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: "center" }}
          />
          <rect x={-9} y={-3} width={18} height={6} rx={3} fill={shade(b.palette.top, 0.1)} />
          <rect x={-1.4} y={-16} width={2.8} height={14} fill="#5B45D8" />
          <circle cx={0} cy={-18} r={6} fill="#775CFF" />
          <text x={0} y={-15} textAnchor="middle" fontSize={8} fontWeight={800} fill="#FFFFFF">
            M
          </text>
        </g>
      );
    case "house":
      return (
        <line
          x1={f.top[0].x}
          y1={f.top[0].y}
          x2={f.top[2].x}
          y2={f.top[2].y}
          stroke={shade(b.palette.top, -0.18)}
          strokeWidth={1.2}
          strokeOpacity={0.6}
        />
      );
    default:
      return null;
  }
}

function ParkTile({
  b,
  active,
  dimmed,
  onHover,
  onSelect,
}: {
  b: Building;
  active: boolean;
  dimmed: boolean;
  onHover: (b: Building | null) => void;
  onSelect: (b: Building) => void;
}) {
  const f = faces(b);
  const trees: Point[] = [];
  const n = b.w * b.d;
  for (let i = 0; i < n; i++) {
    const fx = ((Math.sin(b.phase + i * 1.7) + 1) / 2) * 0.7 + 0.15;
    const fy = ((Math.cos(b.phase + i * 2.3) + 1) / 2) * 0.7 + 0.15;
    trees.push(iso(b.col + b.w * fx, b.row + b.d * fy));
  }
  const pond = iso(b.col + b.w * 0.5, b.row + b.d * 0.5);

  return (
    <g
      style={{ cursor: "pointer" }}
      opacity={dimmed ? 0.6 : 1}
      onPointerEnter={() => onHover(b)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(b);
      }}
    >
      <polygon points={pointsAttr(f.left)} fill={shade("#56C285", -0.28)} />
      <polygon points={pointsAttr(f.right)} fill={shade("#56C285", -0.16)} />
      <polygon
        points={pointsAttr(f.top)}
        fill="#86D29B"
        stroke={active ? TONE_HEX.park : "#65BE80"}
        strokeWidth={active ? 2.5 : 1}
      />
      {n > 2 ? (
        <ellipse cx={pond.x} cy={pond.y - b.height} rx={TILE_W * 0.5} ry={TILE_H * 0.5} fill="#7FB8D6" opacity={0.7} />
      ) : null}
      {/* static trees (kept cheap to preserve 60fps) */}
      {trees.map((t, i) => (
        <g key={i} transform={`translate(${t.x}, ${t.y - b.height})`}>
          <rect x={-1.2} y={-2} width={2.4} height={8} fill="#7A5A38" />
          <circle cx={0} cy={-6} r={7} fill="#2FB36D" />
          <circle cx={-3} cy={-3} r={5} fill="#3CC07D" />
          <circle cx={4} cy={-4} r={5} fill="#27A368" />
        </g>
      ))}
    </g>
  );
}

function SelectionMarker({ b }: { b: Building }) {
  const ground = iso(b.col + b.w / 2, b.row + b.d / 2);
  const topY = ground.y - b.height;
  return (
    <g pointerEvents="none">
      <motion.ellipse
        cx={ground.x}
        cy={ground.y}
        rx={TILE_W * b.w * 0.5}
        ry={TILE_H * b.d * 0.5}
        fill="none"
        stroke={TONE_HEX[b.tone]}
        strokeWidth={2.5}
        initial={{ opacity: 0.6, scale: 0.8 }}
        animate={{ opacity: [0.7, 0.1], scale: [0.8, 1.25] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        style={{ transformOrigin: `${ground.x}px ${ground.y}px` }}
      />
      <g transform={`translate(${ground.x}, ${topY - 26})`}>
        <motion.g
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: [0, -4, 0] }}
          transition={{ y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
        >
          <circle cx={0} cy={0} r={4} fill={TONE_HEX[b.tone]} />
          <line x1={0} y1={0} x2={0} y2={22} stroke={TONE_HEX[b.tone]} strokeWidth={1.5} />
        </motion.g>
      </g>
    </g>
  );
}

// ============================================================================
// Traffic — cars, buses, metro trains
// ============================================================================

function isoVehicle(color: string, halfX: number, halfY: number, h: number) {
  const A: Point = { x: 0, y: -halfY };
  const B: Point = { x: halfX, y: 0 };
  const C: Point = { x: 0, y: halfY };
  const D: Point = { x: -halfX, y: 0 };
  const up = (p: Point): Point => ({ x: p.x, y: p.y - h });
  return (
    <>
      <polygon points={pointsAttr([D, C, up(C), up(D)])} fill={shade(color, -0.25)} />
      <polygon points={pointsAttr([B, C, up(C), up(B)])} fill={shade(color, -0.12)} />
      <polygon points={pointsAttr([up(A), up(B), up(C), up(D)])} fill={shade(color, 0.18)} />
    </>
  );
}

function metroTrain(color: string) {
  // a sleek elongated capsule with a window band
  const halfX = 17;
  const halfY = 8.5;
  const h = 10;
  const A: Point = { x: 0, y: -halfY };
  const B: Point = { x: halfX, y: 0 };
  const C: Point = { x: 0, y: halfY };
  const D: Point = { x: -halfX, y: 0 };
  const up = (p: Point): Point => ({ x: p.x, y: p.y - h });
  return (
    <>
      <polygon points={pointsAttr([D, C, up(C), up(D)])} fill={shade(color, -0.28)} />
      <polygon points={pointsAttr([B, C, up(C), up(B)])} fill={shade(color, -0.14)} />
      <polygon points={pointsAttr([up(A), up(B), up(C), up(D)])} fill={shade(color, 0.2)} />
      {/* window band along the right face */}
      <polygon
        points={pointsAttr([
          { x: B.x * 0.78, y: B.y * 0.78 - h * 0.65 },
          { x: C.x * 0.78, y: C.y * 0.78 - h * 0.65 },
          { x: C.x * 0.78, y: C.y * 0.78 - h * 0.35 },
          { x: B.x * 0.78, y: B.y * 0.78 - h * 0.35 },
        ])}
        fill="#EAF4FF"
        opacity={0.85}
      />
    </>
  );
}

const Traffic = memo(function Traffic() {
  return (
    <g pointerEvents="none">
      {/* metro trains shuttle their straight lines */}
      {CITY.metroTrains.map((r) => {
        const xs = r.points.map((p) => p.x);
        const ys = r.points.map((p) => p.y);
        return (
          <motion.g
            key={r.id}
            initial={{ x: xs[0], y: ys[0] }}
            animate={{ x: xs, y: ys }}
            transition={{ duration: r.duration, delay: r.delay, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
          >
            {metroTrain(r.color)}
          </motion.g>
        );
      })}

      {/* road fleet circulates closed loops (seamless, constant speed) */}
      {CITY.fleet.map((v) => (
        <VehicleSprite key={v.id} v={v} />
      ))}
    </g>
  );
});

function VehicleSprite({ v }: { v: Vehicle }) {
  const xs = v.points.map((p) => p.x);
  const ys = v.points.map((p) => p.y);
  return (
    <motion.g
      initial={{ x: xs[0], y: ys[0] }}
      animate={{ x: xs, y: ys }}
      transition={{ duration: v.duration, delay: v.delay, repeat: Infinity, repeatType: "loop", ease: "linear" }}
    >
      {v.kind === "bus"
        ? busGlyph(v.color)
        : v.kind === "ambulance"
          ? ambulanceGlyph()
          : v.kind === "police"
            ? policeGlyph()
            : isoVehicle(v.color, 8, 4, 6)}
    </motion.g>
  );
}

function busGlyph(color: string) {
  const hx = 13;
  return (
    <>
      {isoVehicle(color, hx, 6.5, 9)}
      <polygon
        points={pointsAttr([
          { x: hx * 0.82, y: hx * 0.0 - 6.2 },
          { x: 0, y: 6.5 * 0.82 - 6.2 },
          { x: 0, y: 6.5 * 0.82 - 3.4 },
          { x: hx * 0.82, y: -3.4 },
        ])}
        fill="#EAF4FF"
        opacity={0.85}
      />
    </>
  );
}

function EmergencyLights({ y }: { y: number }) {
  return (
    <>
      <motion.circle
        cx={-2.6}
        cy={y}
        r={1.7}
        fill="#FF3B3B"
        animate={{ opacity: [1, 0.12, 1] }}
        transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx={2.6}
        cy={y}
        r={1.7}
        fill="#2A6CFF"
        animate={{ opacity: [0.12, 1, 0.12] }}
        transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function ambulanceGlyph() {
  const h = 8.5;
  return (
    <>
      {isoVehicle("#F4F6F9", 11, 5.5, h)}
      {/* red side stripe */}
      <polygon
        points={pointsAttr([
          { x: 11, y: 0 },
          { x: 0, y: 5.5 },
          { x: 0, y: 5.5 - 2.4 },
          { x: 11, y: -2.4 },
        ])}
        fill="#F45D6B"
        opacity={0.9}
      />
      {/* roof cross */}
      <g transform={`translate(0, ${-h - 1})`}>
        <rect x={-2.4} y={-0.9} width={4.8} height={1.8} rx={0.6} fill="#F45D6B" />
        <rect x={-0.9} y={-2.4} width={1.8} height={4.8} rx={0.6} fill="#F45D6B" />
      </g>
      <EmergencyLights y={-h - 4} />
    </>
  );
}

function policeGlyph() {
  const h = 8;
  return (
    <>
      {isoVehicle("#23314A", 11, 5.5, h)}
      {/* white door panel */}
      <polygon
        points={pointsAttr([
          { x: 11, y: 0 },
          { x: 2, y: 4.5 },
          { x: 2, y: 4.5 - 3 },
          { x: 11, y: -3 },
        ])}
        fill="#EEF2F7"
        opacity={0.92}
      />
      {/* roof light bar */}
      <rect x={-3.4} y={-h - 2.4} width={6.8} height={2} rx={0.8} fill="#0B1422" />
      <EmergencyLights y={-h - 1.4} />
    </>
  );
}

const Citizens = memo(function Citizens({ onSelect }: { onSelect: (c: Citizen) => void }) {
  return (
    <g>
      {CITY.citizens.map((c) => {
        const xs = c.pts.map((p) => p.x);
        const ys = c.pts.map((p) => p.y);
        return (
          <motion.g
            key={c.id}
            initial={{ x: xs[0], y: ys[0], opacity: c.opacity[0], scale: c.scale[0] }}
            animate={{ x: xs, y: ys, opacity: c.opacity, scale: c.scale }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              times: c.times,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(c);
            }}
          >
            {/* enlarged transparent hit target for the small moving dot */}
            <circle cx={0} cy={-c.r} r={10} fill="transparent" />
            <ellipse cx={0} cy={1.6} rx={c.r * 1.15} ry={c.r * 0.5} fill="#11253E" opacity={0.16} pointerEvents="none" />
            <circle cx={0} cy={-c.r} r={c.r} fill={c.color} pointerEvents="none" />
            <circle cx={-c.r * 0.3} cy={-c.r * 1.4} r={c.r * 0.42} fill="#FFFFFF" opacity={0.55} pointerEvents="none" />
          </motion.g>
        );
      })}
    </g>
  );
});

const CloudLayer = memo(function CloudLayer() {
  const width = CITY.bounds.width;
  return (
    <g opacity={0.85}>
      {CITY.clouds.map((cloud, i) => (
        <g key={i} transform={`translate(0, ${cloud.y}) scale(${cloud.scale})`}>
          <motion.g
            initial={{ x: cloud.x }}
            animate={{ x: cloud.x + width + 500 }}
            transition={{ duration: cloud.duration, delay: cloud.delay, repeat: Infinity, ease: "linear" }}
            fill="#FFFFFF"
            opacity={0.92}
          >
            <ellipse cx={0} cy={0} rx={48} ry={26} />
            <ellipse cx={40} cy={8} rx={40} ry={22} />
            <ellipse cx={-38} cy={10} rx={34} ry={20} />
            <ellipse cx={6} cy={16} rx={60} ry={18} />
          </motion.g>
        </g>
      ))}
    </g>
  );
});

// ============================================================================
// Policy propagation — pollution haze + radial wave
// ============================================================================

const SmogBlobs = memo(function SmogBlobs() {
  return (
    <>
      {SMOG.map((p, i) => (
        <motion.ellipse
          key={i}
          cx={p.x}
          cy={p.y - 34}
          rx={130}
          ry={78}
          fill="url(#lc-smog)"
          animate={{ cy: [p.y - 34, p.y - 46, p.y - 34] }}
          transition={{ duration: 6 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
});

/** Brown smog over factories that clears as clean policies take effect. */
function PollutionHaze({ reduction }: { reduction: number }) {
  return (
    <motion.g
      pointerEvents="none"
      style={{ mixBlendMode: "multiply" }}
      initial={false}
      animate={{ opacity: 0.42 * (1 - reduction) }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    >
      <SmogBlobs />
    </motion.g>
  );
}

/** Concentric wave + reaction pulses radiating from the city center. */
function PolicyWave({ pulse }: { pulse: Pulse | null }) {
  return (
    <AnimatePresence>
      {pulse ? (
        <g key={pulse.key} pointerEvents="none">
          {/* colour wash sweeping outward */}
          <motion.circle
            cx={ORIGIN.x}
            cy={ORIGIN.y}
            r={MAXR}
            fill={pulse.color}
            initial={{ scale: 0, opacity: 0.2 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            style={{ transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}
          />
          {/* origin burst */}
          <motion.circle
            cx={ORIGIN.x}
            cy={ORIGIN.y}
            r={1}
            fill={pulse.color}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 70, opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}
          />
          {/* expanding rings */}
          {[0, 0.32, 0.62].map((d, i) => (
            <motion.circle
              key={i}
              cx={ORIGIN.x}
              cy={ORIGIN.y}
              r={MAXR}
              fill="none"
              stroke={pulse.color}
              strokeWidth={4}
              initial={{ scale: 0, opacity: 0.75 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 2.4, delay: d, ease: "easeOut" }}
              style={{ transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px` }}
            />
          ))}
          {/* structures react as the wave passes (staggered by distance) */}
          {ANCHORS.map((a, i) => {
            const dist = Math.hypot(a.x - ORIGIN.x, a.y - ORIGIN.y);
            const delay = (dist / MAXR) * 1.8;
            return (
              <motion.circle
                key={`a-${i}`}
                cx={a.x}
                cy={a.y}
                r={9}
                fill="none"
                stroke={pulse.color}
                strokeWidth={2.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5], opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.9, delay, ease: "easeOut" }}
                style={{ transformOrigin: `${a.x}px ${a.y}px` }}
              />
            );
          })}
        </g>
      ) : null}
    </AnimatePresence>
  );
}

// ============================================================================
// Heatmap density field (Mapbox-style blurred colour ramp)
// ============================================================================

const HEAT_BLOB_R = 56;

function HeatmapLayer({ layer }: { layer: HeatLayerId }) {
  const cfg = HEAT_LAYERS.find((l) => l.id === layer)!;
  const blobs = HEAT_DATA[layer];
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.92 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      filter="url(#heat-blur)"
      pointerEvents="none"
    >
      {blobs.map((b, i) => (
        <motion.circle
          key={i}
          cx={b.x}
          cy={b.y}
          r={HEAT_BLOB_R}
          fill={cfg.interp(0.15 + b.v * 0.85)}
          fillOpacity={0.3 + b.v * 0.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.003, duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: `${b.x}px ${b.y}px` }}
        />
      ))}
    </motion.g>
  );
}

// ============================================================================
// Emergency Command — darken, zone glows, response fleet
// ============================================================================

const EmergencyDark = memo(function EmergencyDark() {
  const { bounds } = CITY;
  return (
    <g pointerEvents="none">
      <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} fill="#0A1020" opacity={0.52} />
      <motion.rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        fill="url(#em-vignette)"
        animate={{ opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </g>
  );
});

const ZoneGlows = memo(function ZoneGlows({ scenario }: { scenario: Scenario }) {
  return (
    <g pointerEvents="none">
      {scenario.zones.map((z, i) => (
        <g key={i}>
          <motion.circle
            cx={z.x}
            cy={z.y}
            r={z.r}
            fill="url(#em-glow)"
            initial={{ opacity: 0.4, scale: 0.85 }}
            animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.85, 1, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            style={{ transformOrigin: `${z.x}px ${z.y}px` }}
          />
          <motion.circle
            cx={z.x}
            cy={z.y}
            r={z.r}
            fill="none"
            stroke="#FF5247"
            strokeWidth={2}
            initial={{ opacity: 0.6, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.12 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: i * 0.25 }}
            style={{ transformOrigin: `${z.x}px ${z.y}px` }}
          />
          <circle cx={z.x} cy={z.y} r={3} fill="#FFE0DC" />
        </g>
      ))}
    </g>
  );
});

function fireTruckGlyph() {
  const h = 9;
  return (
    <>
      {isoVehicle("#D8362A", 12, 6, h)}
      <polygon
        points={pointsAttr([
          { x: 12, y: 0 },
          { x: 2, y: 5 },
          { x: 2, y: 5 - 2.4 },
          { x: 12, y: -2.4 },
        ])}
        fill="#F4F6F9"
        opacity={0.9}
      />
      <line x1={-8} y1={-h} x2={9} y2={-h - 3} stroke="#C9CED6" strokeWidth={1.3} />
      <EmergencyLights y={-h - 4} />
    </>
  );
}

const EmergencyFleet = memo(function EmergencyFleet({ scenario }: { scenario: Scenario }) {
  return (
    <g pointerEvents="none">
      {scenario.vehicles.map((kind, i) => {
        const loop = EM_LOOPS[i % EM_LOOPS.length];
        const xs = loop.map((p) => p.x);
        const ys = loop.map((p) => p.y);
        const dur = Math.max(6, Math.min(16, loop.length * 0.19));
        return (
          <motion.g
            key={i}
            initial={{ x: xs[0], y: ys[0] }}
            animate={{ x: xs, y: ys }}
            transition={{ duration: dur, delay: i * 0.6, repeat: Infinity, repeatType: "loop", ease: "linear" }}
          >
            {kind === "fire" ? fireTruckGlyph() : kind === "ambulance" ? ambulanceGlyph() : policeGlyph()}
          </motion.g>
        );
      })}
    </g>
  );
});

// ============================================================================
// HUD
// ============================================================================

function CityHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto inline-flex items-center gap-2.5 self-start rounded-full border border-white/70 bg-white/75 py-2 pl-2.5 pr-4 shadow-glass backdrop-blur-2xl"
    >
      <span className="grid size-8 place-items-center rounded-full bg-city-graphite text-white shadow-polis-sm">
        <Building2 className="size-4" />
      </span>
      <div className="leading-tight">
        <p className="text-body-sm font-black text-foreground">Polis Metropolis</p>
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-2.5 text-city-civic" />
          PolisAI · living twin
        </p>
      </div>
    </motion.div>
  );
}

const LEGEND: { icon: LucideIcon; label: string; hex: string }[] = [
  { icon: Building2, label: "Residential", hex: "#7C9BE0" },
  { icon: Store, label: "Commercial", hex: "#3BB6B0" },
  { icon: Factory, label: "Industrial", hex: "#8A95A6" },
  { icon: Hospital, label: "Hospital", hex: "#F58AA0" },
  { icon: GraduationCap, label: "School", hex: "#F7C45A" },
  { icon: Landmark, label: "Government", hex: "#0FA7A2" },
  { icon: TrainFront, label: "Metro", hex: "#775CFF" },
  { icon: Leaf, label: "Park", hex: "#56C285" },
  { icon: Waves, label: "River", hex: "#5FAEDC" },
];

function Legend() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto hidden grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-glass backdrop-blur-2xl sm:grid"
    >
      {LEGEND.map((l) => (
        <div key={l.label} className="flex items-center gap-2">
          <span className="size-3 rounded-[4px]" style={{ background: l.hex }} />
          <span className="text-caption font-semibold text-muted-foreground">{l.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

function HeatmapSwitcher({ active, onSelect }: { active: HeatLayerId | null; onSelect: (id: HeatLayerId | null) => void }) {
  const activeCfg = HEAT_LAYERS.find((l) => l.id === active);
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto rounded-2xl border border-white/70 bg-white/80 p-3 shadow-glass backdrop-blur-2xl"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Layers className="size-4 text-city-civic" />
        <p className="text-body-sm font-bold text-foreground">Heatmaps</p>
        {active ? <Badge variant="success" className="ml-auto">on</Badge> : null}
      </div>
      <div className="grid gap-1.5">
        {HEAT_LAYERS.map((l) => {
          const on = active === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelect(on ? null : l.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-200",
                on ? "border-transparent text-white" : "border-border/70 bg-white/70 text-foreground hover:-translate-y-0.5 hover:bg-white",
              )}
              style={on ? { background: l.hot, boxShadow: `0 6px 18px ${l.hot}55` } : undefined}
            >
              <l.icon className="size-4 shrink-0" />
              <span className="text-caption font-bold">{l.label}</span>
              <span
                className="ml-auto h-2 w-9 rounded-full"
                style={{ background: `linear-gradient(90deg, ${l.interp(0.15)}, ${l.interp(0.55)}, ${l.interp(0.95)})` }}
              />
            </button>
          );
        })}
      </div>
      {activeCfg ? (
        <div className="mt-2.5">
          <div className="h-2 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${activeCfg.interp(0.1)}, ${activeCfg.interp(0.4)}, ${activeCfg.interp(0.7)}, ${activeCfg.interp(1)})` }} />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-caption text-muted-foreground">Pick a layer to overlay density.</p>
      )}
    </motion.div>
  );
}

// --- Floating command bar -------------------------------------------------

type ToolId = "heat" | "legend" | "emergency" | null;

function FloatingToolbar({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  tool,
  onTool,
  onPolicy,
  heatActive,
  policyActive,
  emActive,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  tool: ToolId;
  onTool: (t: Exclude<ToolId, null>) => void;
  onPolicy: () => void;
  heatActive: boolean;
  policyActive: boolean;
  emActive: boolean;
}) {
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/70 bg-white/80 p-1.5 shadow-glass backdrop-blur-2xl"
      >
        <ToolbarBtn onClick={onZoomOut} label="Zoom out">
          <Minus className="size-4" />
        </ToolbarBtn>
        <span className="w-9 text-center font-mono text-[10px] font-bold text-muted-foreground">{Math.round(scale * 100)}%</span>
        <ToolbarBtn onClick={onZoomIn} label="Zoom in">
          <Plus className="size-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onReset} label="Reset view">
          <Maximize2 className="size-4" />
        </ToolbarBtn>
        <span className="mx-1 h-6 w-px bg-border/70" />
        <ToolFab active={heatActive || tool === "heat"} accent="#0FA7A2" onClick={() => onTool("heat")} label="Heatmaps">
          <Layers className="size-4" />
        </ToolFab>
        <ToolFab active={policyActive} accent="#2F6BFF" onClick={onPolicy} label="Policy Lab">
          <Gauge className="size-4" />
        </ToolFab>
        <ToolFab active={emActive || tool === "emergency"} accent="#F45D6B" onClick={() => onTool("emergency")} label="Emergency">
          <Siren className="size-4" />
        </ToolFab>
        <ToolFab active={tool === "legend"} accent="#775CFF" onClick={() => onTool("legend")} label="Legend">
          <Palette className="size-4" />
        </ToolFab>
      </motion.div>
    </div>
  );
}

function ToolbarBtn({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="focus-ring grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ToolFab({ active, accent, onClick, label, children }: { active: boolean; accent: string; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn("focus-ring grid size-9 place-items-center rounded-full transition-all", active ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
      style={active ? { background: accent, boxShadow: `0 6px 18px ${accent}55` } : undefined}
    >
      {children}
    </button>
  );
}

function ToolPopover({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-[4.75rem] left-1/2 z-20 -translate-x-1/2"
    >
      {children}
    </motion.div>
  );
}

const AGENT_STATUS = [
  { n: "Economy", c: "#13C8C3" },
  { n: "Climate", c: "#2FB36D" },
  { n: "Policy", c: "#2F6BFF" },
  { n: "Mobility", c: "#775CFF" },
  { n: "Healthcare", c: "#F45D6B" },
];

function AgentStatus({ status = "demo", tick = 0 }: { status?: "demo" | "connecting" | "live"; tick?: number }) {
  const events = useSimBus();
  const latest = events[0];
  const dotColor = status === "live" ? "#2FB36D" : status === "connecting" ? "#F6B73C" : "#94A3B8";
  const label = status === "live" ? `live · T+${tick}` : status === "connecting" ? "connecting" : "demo";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto w-[13rem] rounded-2xl border border-white/70 bg-white/75 p-3 shadow-glass backdrop-blur-2xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Network className="size-3.5 text-city-civic" />
          <p className="text-body-sm font-bold text-foreground">AI Agents</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: dotColor }}>
          <motion.span className="size-1.5 rounded-full" style={{ background: dotColor }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          {label}
        </span>
      </div>
      <div className="grid gap-1.5">
        {AGENT_STATUS.map((a, i) => (
          <div key={a.n} className="flex items-center gap-2">
            <motion.span
              className="size-1.5 rounded-full"
              style={{ background: a.c }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25 }}
            />
            <span className="flex-1 text-caption font-semibold text-foreground">{a.n}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: a.c }}>
              active
            </span>
          </div>
        ))}
      </div>

      {/* live signal from the event bus */}
      <AnimatePresence mode="wait">
        {latest ? (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2.5 rounded-lg border border-border/70 bg-white/70 p-2"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: latest.color }}>
              <span className="size-1.5 rounded-full" style={{ background: latest.color }} />
              {latest.source}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{latest.signal}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Link
        href="/agents"
        className="mt-2.5 flex items-center justify-center gap-1 rounded-lg border border-border/70 bg-white/70 py-1.5 text-caption font-bold text-foreground transition-colors hover:bg-white"
      >
        View network
        <ArrowUpRight className="size-3" />
      </Link>
    </motion.div>
  );
}

// --- Cursor-following hover card -----------------------------------------

function HoverCard({ building }: { building: Building }) {
  const tone = TONE_HEX[building.tone];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-glass backdrop-blur-2xl"
      style={{ boxShadow: `0 22px 70px ${tone}22, 0 1px 0 rgba(255,255,255,0.7) inset` }}
    >
      {/* tone wash + top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }} />
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3" style={{ background: `linear-gradient(180deg, ${tone}22, transparent)` }}>
        <div className="grid size-8 place-items-center rounded-lg" style={{ background: `${tone}26`, color: tone }}>
          <BuildingIcon kind={building.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-bold leading-tight text-foreground">{building.label}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">{KIND_LABEL[building.kind]}</p>
        </div>
        <TrendPill delta={building.delta} />
      </div>

      <div className="grid gap-1.5 px-4 pb-2.5">
        {building.metrics.slice(0, 3).map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 + i * 0.05, duration: 0.2 }}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-caption text-muted-foreground">{m.label}</span>
            <span className="font-mono text-body-sm font-bold text-foreground">{m.value}</span>
          </motion.div>
        ))}
      </div>

      {/* mini sparkline */}
      <div className="px-3 pb-2">
        <Sparkline data={building.trend} color={tone} uid={`h-${building.id}`} width={216} height={34} />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/60 px-4 py-2.5">
        <span className="text-caption text-muted-foreground">Status</span>
        <span className="inline-flex items-center gap-1.5 text-body-sm font-bold" style={{ color: tone }}>
          <motion.span
            className="size-1.5 rounded-full"
            style={{ background: tone }}
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.25, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          {building.status}
        </span>
      </div>
    </motion.div>
  );
}

// --- Click-to-open side panel --------------------------------------------

function SidePanel({
  building,
  onClose,
  onFocus,
}: {
  building: Building | null;
  onClose: () => void;
  onFocus: (b: Building) => void;
}) {
  return (
    <AnimatePresence>
      {building ? (
        <motion.aside
          key={building.id}
          initial={{ x: 28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[21rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-glass backdrop-blur-2xl"
          style={{ boxShadow: `0 30px 90px ${TONE_HEX[building.tone]}26, 0 1px 0 rgba(255,255,255,0.75) inset` }}
        >
          {/* header with animated sheen */}
          <div className="relative overflow-hidden px-5 pb-4 pt-5" style={{ background: `linear-gradient(180deg, ${TONE_HEX[building.tone]}2e, transparent)` }}>
            <motion.div
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg]"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
              initial={{ x: 0 }}
              animate={{ x: ["0%", "520%"] }}
              transition={{ duration: 1.4, ease: "easeInOut", delay: 0.15 }}
            />
            <button
              type="button"
              onClick={onClose}
              className="focus-ring absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/70 bg-white/80 text-muted-foreground transition-all hover:scale-105 hover:text-foreground"
              aria-label="Close panel"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 20, delay: 0.05 }}
                className="grid size-12 place-items-center rounded-2xl shadow-polis-sm"
                style={{ background: `${TONE_HEX[building.tone]}26`, color: TONE_HEX[building.tone] }}
              >
                <BuildingIcon kind={building.kind} />
              </motion.div>
              <div className="min-w-0 pr-6">
                <p className="truncate text-title-md leading-tight text-foreground">{building.label}</p>
                <p className="text-caption text-muted-foreground">
                  {KIND_LABEL[building.kind]} · {building.w}×{building.d} tiles
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="success" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-current opacity-80" />
                {building.status}
              </Badge>
              <Badge variant="glass">{Math.max(1, Math.round(building.height / 14))} levels</Badge>
              <TrendPill delta={building.delta} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {/* headline gauge + sparkline */}
            <div className="mb-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-polis-xs">
              <div className="mb-2 flex items-end justify-between">
                <span className="token-label">{building.gaugeLabel}</span>
                <span className="font-mono text-metric leading-none text-foreground" style={{ fontSize: "1.6rem" }}>
                  <CountUp value={building.gauge} />
                  <span className="text-body-sm font-bold text-muted-foreground">%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${TONE_HEX[building.tone]}, ${shade(TONE_HEX[building.tone], 0.25)})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${building.gauge}%` }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                />
              </div>
              <div className="mt-3">
                <Sparkline data={building.trend} color={TONE_HEX[building.tone]} uid={`p-${building.id}`} width={262} height={54} />
              </div>
            </div>

            {/* metric grid — staggered reveal */}
            <div className="grid grid-cols-2 gap-2.5">
              {building.metrics.map((m, i) => (
                <MetricCell key={m.label} label={m.label} value={m.value} index={i} />
              ))}
            </div>

            {/* summary */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.3 }}
              className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4"
            >
              <p className="token-label mb-1.5">Overview</p>
              <p className="text-body-sm leading-relaxed text-muted-foreground">{building.summary}</p>
            </motion.div>

            {/* actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="signal" size="sm" className="flex-1" onClick={() => onFocus(building)}>
                <Crosshair className="size-4" />
                Center view
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <ArrowUpRight className="size-4" />
                Open records
              </Button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

// --- Premium primitives ---------------------------------------------------

/** Animated vector sparkline (area + draw-in line + pulsing end dot). */
function Sparkline({ data, color, uid, width, height }: { data: number[]; color: string; uid: string; width: number; height: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const stepX = width / (data.length - 1);
  const pts: Point[] = data.map((v, i) => ({ x: i * stepX, y: height - 6 - ((v - min) / span) * (height - 12) }));
  const line = smoothPath(pts);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const end = pts[pts.length - 1];
  const gid = `spark-${uid}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      />
      <motion.circle cx={end.x} cy={end.y} r={3} fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.85, type: "spring", stiffness: 400, damping: 16 }} style={{ transformOrigin: `${end.x}px ${end.y}px` }} />
      <motion.circle cx={end.x} cy={end.y} r={3} fill="none" stroke={color} strokeWidth={1.4} animate={{ r: [3, 8], opacity: [0.55, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
    </svg>
  );
}

/** Count a whole number up from 0 with an ease-out (runs once on mount). */
function CountUp({ value, duration = 0.7 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
}

function TrendPill({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        up ? "bg-city-park/15 text-city-park" : "bg-city-coral/15 text-city-coral",
      )}
    >
      <TrendingUp className={cn("size-3", !up && "rotate-180")} />
      {up ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}

function MetricCell({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, duration: 0.28 }}
      className="rounded-xl border border-border/70 bg-white/70 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-polis-sm"
    >
      <p className="token-label">{label}</p>
      <p className="mt-1 text-body-sm font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

function BuildingIcon({ kind }: { kind: BuildingKind }) {
  const Icon = KIND_ICON[kind];
  return <Icon className="size-5" />;
}

// --- Policy Lab dock ------------------------------------------------------

function PolicyModal({
  policies,
  onToggle,
  traffic,
  pollution,
  clean,
  onClose,
  onScenario,
}: {
  policies: Set<string>;
  onToggle: (p: Policy) => void;
  traffic: number;
  pollution: number;
  clean: number;
  onClose: () => void;
  onScenario: () => void;
}) {
  const trafficNow = Math.round(64 * (1 - traffic));
  const pollutionNow = Math.round(38 * (1 - pollution));
  const cleanNow = Math.round(18 + clean * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-40 grid place-items-center p-4"
    >
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-[#060A12]/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-[min(40rem,calc(100%-2rem))] rounded-3xl border border-white/70 bg-white/90 p-5 shadow-glass backdrop-blur-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="focus-ring absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/70 bg-white/80 text-muted-foreground transition-all hover:scale-105 hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4 text-city-civic" />
          <p className="text-title-md text-foreground">Policy Lab</p>
          <Badge variant={policies.size ? "success" : "glass"} className="ml-1">{policies.size} active</Badge>
        </div>
        <p className="mb-4 text-body-sm text-muted-foreground">Enable a policy — watch the waves propagate and the city respond in real time.</p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {POLICIES.map((p) => {
            const on = policies.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
                  on ? "text-white" : "border-border/70 bg-white/70 text-foreground hover:-translate-y-0.5 hover:bg-white",
                )}
                style={on ? { background: p.color, borderColor: p.color, boxShadow: `0 8px 24px ${p.color}55` } : undefined}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", on ? "bg-white/20" : "bg-muted")} style={on ? undefined : { color: p.color }}>
                  <p.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-body-sm font-bold">{p.name}</p>
                  <p className={cn("text-[11px] font-semibold", on ? "text-white/80" : "text-muted-foreground")}>{p.short}</p>
                </div>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-white/80 bg-white/25" : "border-border/70")}>
                  {on ? <Check className="size-3" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-border/60 pt-4">
          <ResponseStat label="Traffic" value={`${trafficNow}%`} active={traffic > 0} up={false} />
          <ResponseStat label="Pollution" value={`${pollutionNow} AQI`} active={pollution > 0} up={false} />
          <ResponseStat label="Clean energy" value={`${cleanNow}%`} active={clean > 0} up />
        </div>

        <button
          type="button"
          onClick={onScenario}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-city-graphite py-3 text-body-sm font-bold text-white shadow-polis-sm transition-transform hover:scale-[1.01]"
        >
          <LineChart className="size-4" />
          Run 10-year projection
          <ArrowRight className="size-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

const SDGS = [
  { n: 3, label: "Good Health", color: "#4C9F38" },
  { n: 4, label: "Quality Education", color: "#C5192D" },
  { n: 9, label: "Industry & Infrastructure", color: "#FD6925" },
  { n: 11, label: "Sustainable Cities", color: "#F99D26" },
  { n: 13, label: "Climate Action", color: "#3F7E44" },
  { n: 16, label: "Strong Institutions", color: "#00689D" },
];

function ScenarioReport({
  policies,
  traffic,
  pollution,
  clean,
  onClose,
}: {
  policies: Set<string>;
  traffic: number;
  pollution: number;
  clean: number;
  onClose: () => void;
}) {
  const n = policies.size;
  const evAdoption = Math.round(clean * 100 + traffic * 35);
  const emissions = -Math.round(pollution * 100);
  const congestion = -Math.round(traffic * 100);
  const gdp = Number((clean * 6 + traffic * 9 + n * 0.3).toFixed(1));
  const approval = Math.round(traffic * 30 + pollution * 22 + clean * 26);
  const expenditure = Math.round(n * 3 + clean * 18);

  const rows: { label: string; value: number; unit: string; good: boolean }[] = [
    { label: "EV adoption", value: evAdoption, unit: "%", good: true },
    { label: "Carbon emissions", value: emissions, unit: "%", good: true },
    { label: "Traffic congestion", value: congestion, unit: "%", good: true },
    { label: "GDP", value: gdp, unit: "%", good: true },
    { label: "Citizen approval", value: approval, unit: "%", good: true },
    { label: "Govt. expenditure", value: expenditure, unit: "%", good: false },
  ];
  const maxMag = Math.max(1, ...rows.map((r) => Math.abs(r.value)));

  const activeSdg = new Set<number>([11, 16]);
  if (clean > 0 || pollution > 0) {
    activeSdg.add(13);
    activeSdg.add(3);
  }
  if (traffic > 0) activeSdg.add(9);

  const recommendation =
    n === 0
      ? "Enable one or more policies in the Policy Lab to project a 10-year scenario."
      : "Proceed with phased implementation while scaling charging infrastructure and monitoring public expenditure. Re-run after 24 simulated months to validate second-order effects.";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-40 grid place-items-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-[#060A12]/45 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative max-h-[calc(100%-2rem)] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-3xl border border-white/70 bg-white/92 p-5 shadow-glass backdrop-blur-2xl"
      >
        <button type="button" onClick={onClose} className="focus-ring absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/70 bg-white/80 text-muted-foreground transition-all hover:scale-105 hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
        <div className="mb-1 flex items-center gap-2">
          <LineChart className="size-4 text-city-civic" />
          <p className="text-title-md text-foreground">10-Year Scenario Projection</p>
        </div>
        <p className="mb-4 text-body-sm text-muted-foreground">
          {n} active {n === 1 ? "policy" : "policies"} · projected to 2036 · multi-agent consensus
        </p>

        {/* metric comparison bars */}
        <div className="grid gap-2.5">
          {rows.map((r, i) => {
            const pos = r.value >= 0;
            const good = pos === r.good;
            const color = good ? "#2FB36D" : "#F45D6B";
            const w = (Math.abs(r.value) / maxMag) * 50;
            return (
              <div key={r.label} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3">
                <span className="text-body-sm font-semibold text-foreground">{r.label}</span>
                <div className="relative h-2.5 rounded-full bg-muted">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <motion.span
                    className="absolute inset-y-0 rounded-full"
                    style={{ background: color, [pos ? "left" : "right"]: "50%" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </div>
                <span className="text-right font-mono text-body-sm font-bold" style={{ color }}>
                  {pos ? "+" : ""}
                  {r.value}
                  {r.unit}
                </span>
              </div>
            );
          })}
        </div>

        {/* AI recommendation */}
        <div className="mt-4 rounded-2xl border border-city-civic/20 bg-city-civic/[0.07] p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="size-4 text-city-civic" />
            <p className="text-body-sm font-bold text-foreground">AI recommendation</p>
          </div>
          <p className="text-body-sm leading-relaxed text-muted-foreground">{recommendation}</p>
        </div>

        {/* SDG alignment */}
        <div className="mt-4">
          <p className="token-label mb-2">UN SDG alignment</p>
          <div className="flex flex-wrap gap-2">
            {SDGS.map((s) => {
              const on = activeSdg.has(s.n);
              return (
                <span
                  key={s.n}
                  className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-caption font-bold transition-all", on ? "text-white" : "border-border/70 bg-white/60 text-muted-foreground")}
                  style={on ? { background: s.color, borderColor: s.color } : undefined}
                >
                  <span className={cn("grid size-4 place-items-center rounded font-mono text-[9px]", on ? "bg-white/25" : "bg-muted")}>{s.n}</span>
                  {s.label}
                </span>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResponseStat({ label, value, active, up }: { label: string; value: string; active: boolean; up: boolean }) {
  return (
    <div className={cn("rounded-xl border px-3 py-1.5 transition-colors", active ? "border-city-park/40 bg-city-park/[0.08]" : "border-border/70 bg-white/70")}>
      <p className="token-label">{label}</p>
      <div className="flex items-center gap-1">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-mono text-body-sm font-bold text-foreground"
        >
          {value}
        </motion.span>
        {active ? <TrendingUp className={cn("size-3 text-city-park", !up && "rotate-180")} /> : null}
      </div>
    </div>
  );
}

// --- Emergency HUD --------------------------------------------------------

function EmergencyPopover({ onActivate }: { onActivate: (s: Scenario) => void }) {
  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/70 bg-white/85 p-3 shadow-glass backdrop-blur-2xl">
      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <Siren className="size-4 text-city-coral" />
        <p className="text-body-sm font-bold text-foreground">Emergency Command</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {EM_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onActivate(s)}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-city-coral/50 hover:bg-city-coral/5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: `${s.accent}1f`, color: s.accent }}>
              <s.icon className="size-4" />
            </span>
            <span className="text-body-sm font-bold text-foreground">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlertBanner({ scenario, onStandDown }: { scenario: Scenario; onStandDown: () => void }) {
  const Icon = scenario.icon;
  return (
    <motion.div
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="pointer-events-auto absolute inset-x-0 top-0 z-40"
    >
      <div
        className="relative overflow-hidden border-b border-white/20 text-white shadow-[0_18px_50px_rgba(180,20,20,0.35)]"
        style={{ background: "linear-gradient(90deg,#A81C1C,#E5484D 45%,#A81C1C)" }}
      >
        <motion.div
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)" }}
          animate={{ x: ["-40%", "360%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-center gap-3 px-4 py-2.5">
          <motion.span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15"
            animate={{ scale: [1, 1.12, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon className="size-5" />
          </motion.span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-body-sm font-black uppercase tracking-wide">{scenario.headline}</p>
              <span className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{scenario.severity}</span>
            </div>
            <p className="truncate text-caption text-white/85">{scenario.subtext}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-title-md font-black leading-none tabular-nums">{scenario.units}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">units dispatched</p>
            </div>
            <button
              type="button"
              onClick={onStandDown}
              className="focus-ring rounded-xl bg-white px-3 py-2 text-body-sm font-bold text-[#B81E1E] shadow-polis-sm transition-transform hover:scale-105"
            >
              Stand down
            </button>
          </div>
        </div>
        {/* live emergency ticker */}
        <div className="relative overflow-hidden border-t border-white/15 bg-black/20 py-1">
          <div className="flex w-max animate-ticker-scroll gap-8 pr-8">
            {[...scenario.ticker, ...scenario.ticker].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-white/90">
                <AlertTriangle className="size-3 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// GTA-style citizen inspection — Apple Wallet × Tesla drawer
// ============================================================================

const ROUTINE_ICON: Record<string, LucideIcon> = {
  home: Home,
  transit: TrainFront,
  work: Briefcase,
  food: Utensils,
  park: TreePine,
};

function CitizenDrawer({ citizen, onClose }: { citizen: Citizen | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {citizen ? (
        <motion.aside
          key={citizen.id}
          initial={{ x: 28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 28, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[21rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-glass backdrop-blur-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            className="focus-ring absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full border border-white/70 bg-white/80 text-muted-foreground transition-all hover:scale-105 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <WalletCard p={citizen.profile} />

            {/* identity stat tiles */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <StatTile icon={Cake} label="Age" value={`${citizen.profile.age}`} />
              <StatTile icon={Banknote} label="Income" value={citizen.profile.income} />
            </div>

            {/* Tesla-style rings */}
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <RingStat label="Health" value={citizen.profile.health} color="#2FB36D" icon={Heart} />
              <RingStat label="Happiness" value={citizen.profile.happiness} color="#F6B73C" icon={Smile} />
            </div>

            {/* locations */}
            <div className="mt-4 grid gap-2">
              <LocRow icon={Navigation} label="Current location" value={citizen.profile.currentArea} live />
              <LocRow icon={Home} label="Home" value={citizen.profile.homeLabel} />
              <LocRow icon={Briefcase} label="Workplace" value={citizen.profile.workLabel} />
            </div>

            {/* daily routine */}
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <p className="token-label">Daily routine</p>
              </div>
              <div className="relative pl-1">
                {citizen.profile.routine.map((r, i) => {
                  const Icon = ROUTINE_ICON[r.icon] ?? Clock;
                  const last = i === citizen.profile.routine.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                      className="relative flex gap-3 pb-3"
                    >
                      {!last ? <span className="absolute left-[11px] top-6 h-full w-px bg-border/70" /> : null}
                      <span
                        className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full"
                        style={{ background: `${citizen.profile.color}22`, color: citizen.profile.color }}
                      >
                        <Icon className="size-3" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-mono text-[11px] font-bold text-muted-foreground">{r.t}</p>
                        <p className="truncate text-body-sm font-semibold text-foreground">{r.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function WalletCard({ p }: { p: Citizen["profile"] }) {
  const idNum = p.id.replace(/\D/g, "").padStart(4, "0");
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 text-white shadow-polis-md"
      style={{ background: `linear-gradient(135deg, ${p.color}, ${shade(p.color, -0.4)})` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40" />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">PolisAI Resident</span>
        <User className="size-4 text-white/75" />
      </div>
      <div className="relative mt-5 flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20 text-base font-black backdrop-blur">{p.initials}</div>
        <div className="min-w-0">
          <p className="truncate text-title-md font-black leading-tight">{p.name}</p>
          <p className="truncate text-caption text-white/85">{p.job}</p>
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between font-mono text-[11px] text-white/70">
        <span>ID · PLS-{idNum}</span>
        <span className="truncate">{p.currentArea}</span>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="token-label">{label}</p>
      </div>
      <p className="font-mono text-title-md font-bold leading-none text-foreground">{value}</p>
    </div>
  );
}

function RingStat({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: LucideIcon }) {
  const C = 2 * Math.PI * 26;
  const off = C * (1 - value / 100);
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/70 bg-white/70 p-3">
      <div className="relative size-[72px]">
        <svg viewBox="0 0 72 72" className="size-full -rotate-90">
          <circle cx={36} cy={36} r={26} fill="none" stroke="#E6ECEF" strokeWidth={6} />
          <motion.circle
            cx={36}
            cy={36}
            r={26}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: off }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-mono text-title-md font-black leading-none text-foreground">{value}</span>
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-caption font-semibold text-muted-foreground">
        <Icon className="size-3" style={{ color }} />
        {label}
      </p>
    </div>
  );
}

function LocRow({ icon: Icon, label, value, live }: { icon: LucideIcon; label: string; value: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/70 p-2.5">
      <div className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-city-civic/10 text-city-civic">
        <Icon className="size-4" />
        {live ? (
          <motion.span
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-city-park ring-2 ring-white"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="token-label">{label}</p>
        <p className="truncate text-body-sm font-bold text-foreground">{value}</p>
      </div>
      {live ? <MapPin className="size-3.5 text-city-park" /> : null}
    </div>
  );
}
