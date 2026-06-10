// ============================================================================
// PolisAI — Living City: isometric model + deterministic procedural generation
// ----------------------------------------------------------------------------
// Pure data layer. No React, no DOM, no backend. Everything is computed once
// from a fixed seed so server and client render byte-identical SVG (zero
// hydration mismatch) and the city is stable across re-renders.
//
// Features: zoned districts, a road grid, a meandering river (roads bridge it),
// elevated-free ground metro lines with stations, parks, traffic, citizens,
// drifting clouds, and riverside scenery.
// ============================================================================

// --- Isometric projection -------------------------------------------------

/** Tile footprint in screen pixels (classic 2:1 isometric diamond). */
export const TILE_W = 64;
export const TILE_H = 32;

export type Point = { x: number; y: number };

/** Grid (col,row) -> screen point. Accepts fractional coords. */
export function iso(col: number, row: number): Point {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

export function pointsAttr(pts: Point[]): string {
  return pts.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
}

/** Smooth-ish SVG path through points (Catmull-Rom -> cubic bezier). */
export function smoothPath(pts: Point[], closed = false): string {
  if (pts.length < 2) return "";
  const p = pts.map((q) => ({ x: round(q.x), y: round(q.y) }));
  const n = p.length;
  let d = `M ${p[0].x} ${p[0].y}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${p2.x} ${p2.y}`;
  }
  if (closed) d += " Z";
  return d;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Color helpers --------------------------------------------------------

/** Lighten (amt > 0, toward white) or darken (amt < 0, toward black) a hex. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((target - r) * p) + r;
  g = Math.round((target - g) * p) + g;
  b = Math.round((target - b) * p) + b;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// --- Seeded RNG (mulberry32) ----------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Domain types ---------------------------------------------------------

export type ZoneKind = "residential" | "commercial" | "industrial" | "civic" | "park";

export type BuildingKind =
  | "house"
  | "apartment"
  | "office"
  | "shop"
  | "factory"
  | "hospital"
  | "school"
  | "government"
  | "metro"
  | "park";

export type Palette = { top: string; left: string; right: string };

export type Building = {
  id: string;
  kind: BuildingKind;
  zone: ZoneKind;
  col: number;
  row: number;
  w: number;
  d: number;
  height: number;
  depth: number;
  palette: Palette;
  phase: number;
  label: string;
  stat: string;
  status: string;
  tone: BuildingTone;
  /** detailed stats for the hover card + side panel */
  metrics: { label: string; value: string }[];
  summary: string;
  gauge: number; // 0–100, headline meter for the side panel
  gaugeLabel: string;
  trend: number[]; // 12-point history feeding the sparkline
  delta: number; // % change vs earlier in the trend
};

export type Vital = {
  metrics: { label: string; value: string }[];
  summary: string;
  gauge: number;
  gaugeLabel: string;
  trend: number[];
  delta: number;
};

type BaseVital = Omit<Vital, "trend" | "delta">;

export type BuildingTone = "civic" | "signal" | "transit" | "solar" | "coral" | "park";

export type RoadLane = { vertical: boolean; k: number; center: Point[] };

export type Route = {
  id: string;
  kind: "car" | "bus" | "metro";
  color: string;
  points: Point[];
  duration: number;
  delay: number;
};

export type VehicleKind = "car" | "bus" | "ambulance" | "police";

export type Vehicle = {
  id: string;
  kind: VehicleKind;
  color: string;
  /** closed-loop road waypoints (screen space) — first ≈ last for seamless looping */
  points: Point[];
  duration: number;
  delay: number;
  emergency: boolean;
};

export type Citizen = {
  id: string;
  /** screen-space waypoints for the full journey */
  pts: Point[];
  /** normalized keyframe times (same length as pts) */
  times: number[];
  /** per-waypoint opacity (0 inside a building, 1 out walking) */
  opacity: number[];
  /** per-waypoint scale (small when emerging/entering a building) */
  scale: number[];
  duration: number;
  delay: number;
  color: string;
  r: number;
  behavior: "commute" | "park";
  profile: CitizenProfile;
};

export type CitizenProfile = {
  id: string;
  name: string;
  initials: string;
  age: number;
  job: string;
  income: string;
  health: number;
  happiness: number;
  homeLabel: string;
  workLabel: string;
  currentArea: string;
  color: string;
  routine: { t: string; label: string; icon: string }[];
};

export type Cloud = { x: number; y: number; scale: number; duration: number; delay: number };

export type River = {
  /** filled ribbon outline (screen space) */
  ribbon: Point[];
  /** wider shore outline behind the ribbon */
  shore: Point[];
  /** centerline for animated current */
  center: Point[];
};

export type MetroLine = {
  id: string;
  color: string;
  /** centerline in screen space */
  center: Point[];
};

export type Tree = { p: Point; scale: number; phase: number };

export type Bounds = { minX: number; minY: number; width: number; height: number };

export type City = {
  size: number;
  roadStep: number;
  buildings: Building[];
  roadLanes: RoadLane[];
  river: River;
  metroLines: MetroLine[];
  metroStations: Building[];
  metroTrains: Route[];
  fleet: Vehicle[];
  citizens: Citizen[];
  clouds: Cloud[];
  scenery: Tree[];
  bounds: Bounds;
  counts: Record<BuildingKind, number>;
};

// --- Catalog --------------------------------------------------------------

const BASE: Record<BuildingKind, string> = {
  house: "#8FC2D4",
  apartment: "#7C9BE0",
  office: "#3BB6B0",
  shop: "#34CFC9",
  factory: "#8A95A6",
  hospital: "#F58AA0",
  school: "#F7C45A",
  government: "#D4DEE8",
  metro: "#8A74FF",
  park: "#56C285",
};

const TONE: Record<BuildingKind, BuildingTone> = {
  house: "signal",
  apartment: "signal",
  office: "civic",
  shop: "civic",
  factory: "solar",
  hospital: "coral",
  school: "solar",
  government: "civic",
  metro: "transit",
  park: "park",
};

function paletteFor(kind: BuildingKind): Palette {
  const base = BASE[kind];
  return {
    top: shade(base, 0.26),
    left: shade(base, -0.02),
    right: shade(base, -0.24),
  };
}

const LABELS: Record<BuildingKind, string[]> = {
  house: ["Maple Row", "Cedar Court", "Birch Lane", "Elm Terrace", "Willow Close", "Aspen Walk"],
  apartment: ["Harbor Heights", "Meridian Flats", "Aurora Block", "Vista Residences", "Quay Towers"],
  office: ["Civic Tower", "Polis Exchange", "Helix Plaza", "Summit Works", "Beacon One"],
  shop: ["Market Arcade", "Greenline Retail", "Union Bazaar", "Corner Commons", "Quay Market"],
  factory: ["Harbor Works", "Ironside Plant", "Delta Foundry", "North Mill"],
  hospital: ["Northline Hospital", "Civic Medical", "Riverside Care"],
  school: ["Meridian School", "Polis Academy", "Lakeside School"],
  government: ["City Hall", "Polis Capitol", "Civic Assembly"],
  metro: ["Greenline", "Central", "Harbor", "Union", "Riverside", "Summit", "Vista", "Quay"],
  park: ["Commons Park", "Riverside Green", "Civic Gardens", "Maple Park", "Quay Gardens"],
};

const STATUS: Record<BuildingKind, string> = {
  house: "Stable",
  apartment: "Healthy",
  office: "Operational",
  shop: "Trading",
  factory: "Grid watch",
  hospital: "Operational",
  school: "Protected",
  government: "Nominal",
  metro: "High flow",
  park: "Open",
};

/** Deterministic, premium-feeling vitals for the hover card + side panel. */
function vitals(kind: BuildingKind, rng: () => number): Vital {
  const base = baseVitals(kind, rng);
  // synthesize a believable 12-point history that lands on the gauge value
  const clamp01 = (v: number) => Math.max(16, Math.min(99, v));
  const trend: number[] = [];
  let v = clamp01(base.gauge - 6 - Math.floor(rng() * 14));
  for (let i = 0; i < 12; i++) {
    v = clamp01(v + (rng() - 0.42) * 7);
    trend.push(Math.round(v));
  }
  trend[trend.length - 1] = base.gauge;
  const delta = Number((trend[11] - trend[6]).toFixed(1));
  return { ...base, trend, delta };
}

function baseVitals(kind: BuildingKind, rng: () => number): BaseVital {
  const ri = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const rf = (lo: number, hi: number, d = 1) => (lo + rng() * (hi - lo)).toFixed(d);
  switch (kind) {
    case "hospital": {
      const cap = ri(78, 97);
      return {
        gauge: cap,
        gaugeLabel: "Bed capacity",
        metrics: [
          { label: "Capacity", value: `${cap}%` },
          { label: "Patients", value: `${ri(180, 520)}` },
          { label: "Beds open", value: `${ri(6, 46)}` },
          { label: "Avg ER wait", value: `${ri(5, 34)} min` },
        ],
        summary: "Regional acute-care hospital with 24/7 emergency, trauma and surgical units.",
      };
    }
    case "school": {
      const cap = ri(70, 96);
      return {
        gauge: cap,
        gaugeLabel: "Enrollment",
        metrics: [
          { label: "Students", value: `${ri(640, 1480)}` },
          { label: "Capacity", value: `${cap}%` },
          { label: "Staff", value: `${ri(40, 120)}` },
          { label: "Rating", value: `${rf(3.8, 5)}/5` },
        ],
        summary: "Public school serving the district with K–12 programs and athletics.",
      };
    }
    case "office": {
      const occ = ri(72, 98);
      return {
        gauge: occ,
        gaugeLabel: "Occupancy",
        metrics: [
          { label: "Occupancy", value: `${occ}%` },
          { label: "Employees", value: `${ri(400, 3200)}` },
          { label: "Floors", value: `${ri(8, 42)}` },
          { label: "Lease", value: `$${ri(48, 92)}/sqft` },
        ],
        summary: "Grade-A commercial tower hosting technology and financial tenants.",
      };
    }
    case "shop": {
      const ft = ri(55, 95);
      return {
        gauge: ft,
        gaugeLabel: "Footfall",
        metrics: [
          { label: "Footfall", value: `${ft}%` },
          { label: "Tenants", value: `${ri(6, 28)}` },
          { label: "Revenue", value: `$${ri(2, 18)}M/yr` },
          { label: "Rating", value: `${rf(3.6, 4.9)}/5` },
        ],
        summary: "Mixed retail arcade with food, grocery and specialty stores.",
      };
    }
    case "factory": {
      const load = ri(48, 95);
      return {
        gauge: load,
        gaugeLabel: "Plant load",
        metrics: [
          { label: "Output", value: `${ri(60, 99)}%` },
          { label: "Grid load", value: `${load}%` },
          { label: "Workers", value: `${ri(120, 900)}` },
          { label: "Emissions", value: `${ri(20, 70)} AQI` },
        ],
        summary: "Industrial facility with automated production lines and on-site logistics.",
      };
    }
    case "government": {
      return {
        gauge: ri(82, 99),
        gaugeLabel: "Service uptime",
        metrics: [
          { label: "Departments", value: `${ri(6, 18)}` },
          { label: "Staff", value: `${ri(300, 2400)}` },
          { label: "Clearance", value: `L${ri(3, 5)}` },
          { label: "Cases/day", value: `${ri(200, 1800)}` },
        ],
        summary: "Seat of municipal administration and civic services.",
      };
    }
    case "apartment": {
      const occ = ri(80, 99);
      return {
        gauge: occ,
        gaugeLabel: "Occupancy",
        metrics: [
          { label: "Residents", value: `${ri(120, 820)}` },
          { label: "Units", value: `${ri(48, 260)}` },
          { label: "Occupancy", value: `${occ}%` },
          { label: "Avg rent", value: `$${rf(1.4, 3.6)}k` },
        ],
        summary: "Residential apartment complex with shared amenities and transit access.",
      };
    }
    case "house": {
      return {
        gauge: ri(60, 98),
        gaugeLabel: "Wellbeing",
        metrics: [
          { label: "Residents", value: `${ri(2, 7)}` },
          { label: "Bedrooms", value: `${ri(2, 5)}` },
          { label: "Value", value: `$${rf(0.4, 1.8, 2)}M` },
          { label: "Built", value: `${1960 + ri(0, 60)}` },
        ],
        summary: "Single-family residence in a quiet, walkable neighbourhood.",
      };
    }
    case "metro": {
      return {
        gauge: ri(60, 96),
        gaugeLabel: "Line load",
        metrics: [
          { label: "Daily riders", value: `${ri(8, 60)}k` },
          { label: "Headway", value: `${ri(3, 9)} min` },
          { label: "Lines", value: `${ri(1, 3)}` },
          { label: "Platforms", value: `${ri(2, 6)}` },
        ],
        summary: "Rapid-transit station connecting key districts across the city.",
      };
    }
    case "park": {
      return {
        gauge: ri(40, 92),
        gaugeLabel: "Greenery",
        metrics: [
          { label: "Area", value: `${rf(1, 6.5)} ha` },
          { label: "Visitors", value: `${ri(200, 4200)}/day` },
          { label: "Trees", value: `${ri(80, 900)}` },
          { label: "Amenities", value: `${ri(3, 12)}` },
        ],
        summary: "Public green space with walking paths, water features and play areas.",
      };
    }
  }
}

function statFor(kind: BuildingKind, rng: () => number): string {
  switch (kind) {
    case "house":
      return `${3 + Math.floor(rng() * 5)} residents`;
    case "apartment":
      return `${(2 + rng() * 6).toFixed(1)}k residents`;
    case "office":
      return `${80 + Math.floor(rng() * 18)}% occupancy`;
    case "shop":
      return `${60 + Math.floor(rng() * 35)}% footfall`;
    case "factory":
      return `${55 + Math.floor(rng() * 40)}% load`;
    case "hospital":
      return `${8 + Math.floor(rng() * 40)} beds open`;
    case "school":
      return `${600 + Math.floor(rng() * 900)} students`;
    case "government":
      return `Level ${3 + Math.floor(rng() * 2)} clearance`;
    case "metro":
      return `${4 + Math.floor(rng() * 9)} min headway`;
    case "park":
      return `${(1 + rng() * 6).toFixed(1)} ha green`;
  }
}

// --- Generation -----------------------------------------------------------

const SIZE = 30;
const ROAD = 5;
const SEED = 0x9015a1;

// River meander: column center as a function of row (sweeps across the map).
const RIVER_HALF = 1.05;
function riverCenter(row: number): number {
  return 5.4 + row * 0.52 + 2.2 * Math.sin(row * 0.46) + 0.8 * Math.sin(row * 0.21);
}

// Two ground metro corridors (reserved interior lanes).
const METRO_ROW = 12; // horizontal line tiles (c, 12)
const METRO_COL = 22; // vertical line tiles (22, r)

function isRoad(c: number, r: number): boolean {
  return c % ROAD === 0 || r % ROAD === 0;
}
function isWater(c: number, r: number): boolean {
  return Math.abs(c + 0.5 - riverCenter(r + 0.5)) <= RIVER_HALF;
}
function isMetro(c: number, r: number): boolean {
  return (r === METRO_ROW && c >= 1 && c <= SIZE - 2) || (c === METRO_COL && r >= 1 && r <= SIZE - 2);
}

function zoneForBlock(bc: number, br: number, blocks: number, rng: () => number): ZoneKind {
  const mid = Math.floor(blocks / 2);
  if (br >= blocks - 2 && bc >= blocks - 3) return "industrial";
  if ((bc * 2 + br) % 5 === 0) return "park";
  if (Math.abs(bc - mid) <= 1 && Math.abs(br - mid) <= 2) return "commercial";
  return rng() < 0.72 ? "residential" : "commercial";
}

type Slot = { kind: BuildingKind; w: number; d: number; height: number };

// --- Citizen profiles (cosmetic, deterministic) ---------------------------

const FIRST_NAMES = [
  "Ada", "Maya", "Leo", "Noah", "Iris", "Theo", "Nora", "Kai", "Zoe", "Omar", "Lena", "Ravi",
  "Mei", "Jonas", "Aria", "Hugo", "Sana", "Eli", "Yuki", "Cole", "Priya", "Mateo", "Freya", "Idris",
];
const LAST_NAMES = [
  "Vance", "Okoro", "Tan", "Rivera", "Holt", "Nyman", "Park", "Sato", "Bauer", "Costa", "Reyes", "Ahmed",
  "Lindqvist", "Mbeki", "Romano", "Dubois", "Patel", "Kane", "Sørensen", "Nakamura", "Flores", "Webb", "Haas", "Osei",
];
const JOBS: Record<string, string[]> = {
  office: ["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "Accountant"],
  shop: ["Retail Associate", "Barista", "Shop Owner", "Cashier", "Florist"],
  factory: ["Machine Operator", "Logistics Tech", "Welder", "Foreman", "Fabricator"],
  hospital: ["Nurse", "Physician", "Paramedic", "Radiographer", "Lab Technician"],
  school: ["Teacher", "School Counselor", "Librarian", "Coach"],
  government: ["Civil Servant", "Policy Analyst", "City Clerk", "Urban Planner"],
  leisure: ["Student", "Retiree", "Freelancer", "Artist", "Musician"],
};
const INCOME_RANGE: Record<string, [number, number]> = {
  office: [58, 140],
  shop: [28, 52],
  factory: [40, 78],
  hospital: [60, 180],
  school: [44, 72],
  government: [48, 96],
  leisure: [0, 46],
};
const DISTRICTS = ["Civic Core", "Harbor Works", "Greenline", "Meridian Heights", "Riverside", "Northgate", "Quayside"];

function makeProfile(
  id: string,
  rng: () => number,
  home: Building,
  dest: Building,
  toPark: boolean,
  color: string,
): CitizenProfile {
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  const jobKind = toPark ? "leisure" : JOBS[dest.kind] ? dest.kind : "office";
  const jobs = JOBS[jobKind] ?? JOBS.office;
  const job = jobs[Math.floor(rng() * jobs.length)];
  const [lo, hi] = INCOME_RANGE[jobKind] ?? [40, 80];
  const inc = Math.round(lo + rng() * (hi - lo));
  return {
    id,
    name: `${first} ${last}`,
    initials: `${first[0]}${last[0]}`,
    age: 18 + Math.floor(rng() * 60),
    job,
    income: inc <= 0 ? "—" : `$${inc}k/yr`,
    health: 55 + Math.floor(rng() * 44),
    happiness: 45 + Math.floor(rng() * 54),
    homeLabel: home.label,
    workLabel: toPark ? "Remote / Flexible" : dest.label,
    currentArea: DISTRICTS[Math.floor(rng() * DISTRICTS.length)],
    color,
    routine: [
      { t: "07:00", label: `Wake · ${home.label}`, icon: "home" },
      { t: "08:30", label: "Commute · Greenline", icon: "transit" },
      { t: "09:00", label: toPark ? "Studio · Remote work" : `Work · ${dest.label}`, icon: "work" },
      { t: "13:00", label: "Lunch · Market Arcade", icon: "food" },
      { t: "18:00", label: "Commute home", icon: "transit" },
      { t: "19:30", label: "Leisure · Commons Park", icon: "park" },
      { t: "23:00", label: `Rest · ${home.label}`, icon: "home" },
    ],
  };
}

function buildCity(): City {
  const rng = mulberry32(SEED);
  // Cosmetic stats run on a SEPARATE stream so tweaking vitals/labels never
  // perturbs the structural RNG (and therefore never reshuffles the city).
  const srng = mulberry32(0x5713a7);
  const labelIdx: Record<string, number> = {};
  const nextLabel = (kind: BuildingKind): string => {
    const pool = LABELS[kind];
    const i = labelIdx[kind] ?? 0;
    labelIdx[kind] = i + 1;
    return pool[i % pool.length];
  };

  const blocks = Math.floor(SIZE / ROAD);
  const occupied = new Set<string>();
  const buildings: Building[] = [];

  const blocked = (c: number, r: number): boolean =>
    c < 0 || r < 0 || c >= SIZE || r >= SIZE || isRoad(c, r) || isWater(c, r) || isMetro(c, r) || occupied.has(`${c},${r}`);

  const free = (col: number, row: number, w: number, d: number): boolean => {
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < d; dr++) if (blocked(col + dc, row + dr)) return false;
    return true;
  };

  const place = (col: number, row: number, slot: Slot, zone: ZoneKind) => {
    for (let dc = 0; dc < slot.w; dc++) for (let dr = 0; dr < slot.d; dr++) occupied.add(`${col + dc},${row + dr}`);
    const v = vitals(slot.kind, srng);
    buildings.push({
      id: `b-${col}-${row}-${slot.kind}`,
      kind: slot.kind,
      zone,
      col,
      row,
      w: slot.w,
      d: slot.d,
      height: slot.height,
      depth: col + slot.w + row + slot.d,
      palette: paletteFor(slot.kind),
      phase: srng() * Math.PI * 2,
      label: nextLabel(slot.kind),
      stat: statFor(slot.kind, srng),
      status: STATUS[slot.kind],
      tone: TONE[slot.kind],
      metrics: v.metrics,
      summary: v.summary,
      gauge: v.gauge,
      gaugeLabel: v.gaugeLabel,
      trend: v.trend,
      delta: v.delta,
    });
  };

  const fillHouses = (c0: number, r0: number, span: number, zone: ZoneKind) => {
    for (let c = c0; c < c0 + span; c++) {
      for (let r = r0; r < r0 + span; r++) {
        if (blocked(c, r)) continue;
        place(c, r, { kind: "house", w: 1, d: 1, height: 16 + Math.floor(rng() * 12) }, zone);
      }
    }
  };

  // Pre-compute a zone for every block (deterministic).
  const span = ROAD - 1;
  const allBlocks: [number, number][] = [];
  for (let bc = 0; bc < blocks; bc++) for (let br = 0; br < blocks; br++) allBlocks.push([bc, br]);
  const zoneMap = new Map<string, ZoneKind>();
  for (const [bc, br] of allBlocks) zoneMap.set(`${bc},${br}`, zoneForBlock(bc, br, blocks, rng));

  // Guarantee civic assets by designating specific FREE blocks up front — so the
  // city always has a government seat, hospitals and schools no matter how the
  // river / roads carve the map. (Previously these were probabilistic and could
  // vanish entirely on some layouts.)
  const blockFree = (bc: number, br: number, w: number, d: number) => free(bc * ROAD + 1, br * ROAD + 1, w, d);
  const eligible = (bc: number, br: number) => {
    const z = zoneMap.get(`${bc},${br}`);
    return z !== "park" && z !== "industrial";
  };
  const designated = new Map<string, BuildingKind>();
  const bMid = (blocks - 1) / 2;
  const byCenter = [...allBlocks].sort(
    (a, b) => Math.abs(a[0] - bMid) + Math.abs(a[1] - bMid) - (Math.abs(b[0] - bMid) + Math.abs(b[1] - bMid)),
  );
  for (const [bc, br] of byCenter) {
    if (eligible(bc, br) && blockFree(bc, br, span, span)) {
      designated.set(`${bc},${br}`, "government");
      break;
    }
  }
  const pickCivic = (kind: BuildingKind, n: number, order: [number, number][]) => {
    let count = 0;
    for (const [bc, br] of order) {
      if (count >= n) break;
      const key = `${bc},${br}`;
      if (designated.has(key) || !eligible(bc, br)) continue;
      if (blockFree(bc, br, 2, 2)) {
        designated.set(key, kind);
        count++;
      }
    }
  };
  pickCivic("hospital", 2, allBlocks);
  pickCivic("school", 2, [...allBlocks].reverse());

  // Fill blocks
  for (const [bc, br] of allBlocks) {
    const c0 = bc * ROAD + 1;
    const r0 = br * ROAD + 1;
    const key = `${bc},${br}`;
    const civic = designated.get(key);

    if (civic === "government") {
      place(c0, r0, { kind: "government", w: span, d: span, height: 60 + Math.floor(rng() * 16) }, "civic");
      continue;
    }
    if (civic === "hospital") {
      place(c0, r0, { kind: "hospital", w: 2, d: 2, height: 52 + Math.floor(rng() * 14) }, "civic");
      fillHouses(c0, r0, span, "residential");
      continue;
    }
    if (civic === "school") {
      place(c0, r0, { kind: "school", w: 2, d: 2, height: 30 + Math.floor(rng() * 12) }, "civic");
      fillHouses(c0, r0, span, "residential");
      continue;
    }

    const zone = zoneMap.get(key)!;

    if (zone === "park") {
      if (free(c0, r0, span, span)) {
        place(c0, r0, { kind: "park", w: span, d: span, height: 4 }, zone);
      } else {
        for (let c = c0; c < c0 + span; c++)
          for (let r = r0; r < r0 + span; r++) if (!blocked(c, r)) place(c, r, { kind: "park", w: 1, d: 1, height: 4 }, zone);
      }
      continue;
    }

    if (zone === "industrial") {
      if (free(c0, r0, span, 2)) {
        place(c0, r0, { kind: "factory", w: span, d: 2, height: 30 + Math.floor(rng() * 16) }, zone);
        if (free(c0, r0 + 2, 1, 1)) place(c0, r0 + 2, { kind: "shop", w: 1, d: 1, height: 24 }, zone);
        else fillHouses(c0, r0 + 2, span, zone);
      } else {
        fillHouses(c0, r0, span, "residential");
      }
      continue;
    }

    for (let c = c0; c < c0 + span; c++) {
      for (let r = r0; r < r0 + span; r++) {
        if (blocked(c, r)) continue;
        if (zone === "commercial") {
          if (rng() < 0.34 && free(c, r, 2, 2)) place(c, r, { kind: "office", w: 2, d: 2, height: 80 + Math.floor(rng() * 80) }, zone);
          else place(c, r, { kind: "shop", w: 1, d: 1, height: 22 + Math.floor(rng() * 18) }, zone);
        } else {
          if (rng() < 0.22 && free(c, r, 2, 2)) place(c, r, { kind: "apartment", w: 2, d: 2, height: 52 + Math.floor(rng() * 44) }, zone);
          else place(c, r, { kind: "house", w: 1, d: 1, height: 16 + Math.floor(rng() * 14) }, zone);
        }
      }
    }
  }

  buildings.sort((a, b) => a.depth - b.depth);

  // --- Road lanes (for asphalt bands + animated centerlines) ---
  const roadLanes: RoadLane[] = [];
  for (let k = 0; k <= SIZE; k += ROAD) {
    roadLanes.push({ vertical: true, k, center: [iso(k + 0.5, 0), iso(k + 0.5, SIZE)] });
    roadLanes.push({ vertical: false, k, center: [iso(0, k + 0.5), iso(SIZE, k + 0.5)] });
  }

  // --- River geometry ---
  const left: Point[] = [];
  const right: Point[] = [];
  const shoreL: Point[] = [];
  const shoreR: Point[] = [];
  const center: Point[] = [];
  for (let r = -1; r <= SIZE + 1; r += 0.5) {
    const cc = riverCenter(r);
    left.push(iso(cc - RIVER_HALF, r));
    right.push(iso(cc + RIVER_HALF, r));
    shoreL.push(iso(cc - RIVER_HALF - 0.55, r));
    shoreR.push(iso(cc + RIVER_HALF + 0.55, r));
    center.push(iso(cc, r));
  }
  const river: River = {
    ribbon: [...left, ...right.reverse()],
    shore: [...shoreL, ...shoreR.reverse()],
    center,
  };

  // --- Metro lines (ground) + stations ---
  const metroLines: MetroLine[] = [
    {
      id: "m-a",
      color: "#8A74FF",
      center: Array.from({ length: SIZE - 2 }, (_, i) => iso(i + 1.5, METRO_ROW + 0.5)),
    },
    {
      id: "m-b",
      color: "#13B5C8",
      center: Array.from({ length: SIZE - 2 }, (_, i) => iso(METRO_COL + 0.5, i + 1.5)),
    },
  ];

  const metroStations: Building[] = [];
  const addStation = (col: number, row: number) => {
    occupied.add(`${col},${row}`);
    const v = vitals("metro", srng);
    metroStations.push({
      id: `metro-${col}-${row}`,
      kind: "metro",
      zone: "civic",
      col,
      row,
      w: 1,
      d: 1,
      height: 14,
      depth: col + 1 + row + 1,
      palette: paletteFor("metro"),
      phase: srng() * Math.PI * 2,
      label: `${nextLabel("metro")} Station`,
      stat: statFor("metro", srng),
      status: STATUS.metro,
      tone: TONE.metro,
      metrics: v.metrics,
      summary: v.summary,
      gauge: v.gauge,
      gaugeLabel: v.gaugeLabel,
      trend: v.trend,
      delta: v.delta,
    });
  };
  for (const c of [3, 9, 18, 27]) addStation(c, METRO_ROW);
  for (const r of [4, 18, 26]) addStation(METRO_COL, r);

  // --- Traffic: cars, buses, and metro trains ---
  const lift = 0.5;
  const horiz = (row: number, a: number, b: number): Point[] => {
    const s = b > a ? 1 : -1;
    const pts: Point[] = [];
    for (let c = a; c !== b + s; c += s) pts.push(iso(c + lift, row + lift));
    return pts;
  };
  const vert = (col: number, a: number, b: number): Point[] => {
    const s = b > a ? 1 : -1;
    const pts: Point[] = [];
    for (let r = a; r !== b + s; r += s) pts.push(iso(col + lift, r + lift));
    return pts;
  };

  // Metro trains ride their lines (shuttle back and forth).
  const metroTrains: Route[] = [
    { id: "train-a", kind: "metro", color: "#8A74FF", duration: 14, delay: 0, points: metroLines[0].center },
    { id: "train-b", kind: "metro", color: "#13B5C8", duration: 16, delay: 1.0, points: metroLines[1].center },
  ];

  // --- Road fleet: cars, buses, ambulances, police ---
  // Vehicles circulate on closed rectangular loops built from the road grid.
  // A closed loop means repeatType "loop" never teleports — smooth forever.
  // Several vehicles share a loop with evenly-staggered delays, forming moving
  // platoons; busier loops carry more vehicles -> a visible traffic-density map.
  const roadIdx: number[] = [];
  for (let k = 0; k <= SIZE - ROAD; k += ROAD) roadIdx.push(k);

  const rectLoop = (c1: number, r1: number, c2: number, r2: number): Point[] => {
    const top = horiz(r1, c1, c2);
    const right = vert(c2, r1, r2).slice(1);
    const bottom = horiz(r2, c2, c1).slice(1);
    const left = vert(c1, r2, r1).slice(1);
    return [...top, ...right, ...bottom, ...left];
  };

  const SPEED: Record<VehicleKind, number> = { car: 1.0, bus: 0.66, ambulance: 1.75, police: 1.6 };
  const SEC_PER_TILE = 0.34;
  const carColors = ["#2B3748", "#3F5170", "#6B7686", "#C0492F", "#2F6BFF", "#0FA7A2", "#E0A12E", "#9AA3B2"];

  const fleet: Vehicle[] = [];
  let vid = 0;
  const addOnLoop = (loop: Point[], dir: number, count: number, withBus: boolean) => {
    const path = dir < 0 ? [...loop].reverse() : loop;
    for (let j = 0; j < count; j++) {
      const isBus = withBus && j === 0;
      const kind: VehicleKind = isBus ? "bus" : "car";
      const duration = (path.length * SEC_PER_TILE) / SPEED[kind];
      fleet.push({
        id: `v-${vid++}`,
        kind,
        color: isBus ? "#2F6BFF" : carColors[Math.floor(rng() * carColors.length)],
        points: path,
        duration,
        // even spacing around the loop -> a continuous stream of traffic
        delay: (duration * j) / count + rng() * 0.5,
        emergency: false,
      });
    }
  };

  for (let a = 0; a < roadIdx.length - 1; a++) {
    for (let b = 0; b < roadIdx.length - 1; b++) {
      if (rng() < 0.45) continue; // not every block circulates
      const c1 = roadIdx[a];
      const c2 = roadIdx[Math.min(a + 1 + (rng() < 0.28 ? 1 : 0), roadIdx.length - 1)];
      const r1 = roadIdx[b];
      const r2 = roadIdx[Math.min(b + 1 + (rng() < 0.28 ? 1 : 0), roadIdx.length - 1)];
      if (c2 <= c1 || r2 <= r1) continue;
      const loop = rectLoop(c1, r1, c2, r2);
      const busy = rng();
      const count = busy < 0.25 ? 1 : busy < 0.6 ? 2 : busy < 0.85 ? 3 : 4; // density variation
      addOnLoop(loop, rng() < 0.5 ? 1 : -1, count, rng() < 0.3);
    }
  }

  // Emergency vehicles patrol long perimeter loops, faster, with flashing lights.
  const lo = roadIdx[0];
  const hi = roadIdx[roadIdx.length - 1];
  const mid = roadIdx[Math.floor(roadIdx.length / 2)];
  const emLoops: Point[][] = [
    rectLoop(lo, lo, hi, hi),
    rectLoop(lo, lo, mid, hi),
    rectLoop(mid, lo, hi, mid),
  ];
  const emKinds: VehicleKind[] = ["ambulance", "police", "ambulance", "police"];
  emLoops.forEach((loop, i) => {
    for (let k = 0; k < 2; k++) {
      const kind = emKinds[(i * 2 + k) % emKinds.length];
      const path = k % 2 ? [...loop].reverse() : loop;
      const duration = (path.length * SEC_PER_TILE) / SPEED[kind];
      fleet.push({
        id: `v-${vid++}`,
        kind,
        color: kind === "ambulance" ? "#F4F6F9" : "#1B2436",
        points: path,
        duration,
        delay: rng() * duration,
        emergency: true,
      });
    }
  });

  // --- Citizens: a living population of 500 ---
  // Each citizen runs one choreographed loop: emerge from a building, walk the
  // road grid, then either gather in a park or enter a workplace. The view
  // plays it with repeatType "mirror", so the return leg re-enters home — the
  // four behaviours (leave / walk / gather / enter) all fall out of one path.
  const czColors = ["#0FA7A2", "#2F6BFF", "#F6B73C", "#F45D6B", "#2FB36D", "#775CFF", "#E8743B", "#2BB3C0"];
  const homes = buildings.filter((b) => b.kind === "house" || b.kind === "apartment");
  const works = buildings.filter((b) =>
    ["office", "shop", "factory", "hospital", "school", "government"].includes(b.kind),
  );
  const parks = buildings.filter((b) => b.kind === "park");
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const snap = (v: number) => clamp(Math.round(v / ROAD) * ROAD, 0, SIZE);
  const ctr = (b: Building) => ({ c: b.col + b.w / 2, r: b.row + b.d / 2 });

  // Route between two grid points along the road grid (Manhattan on road lines).
  const roadWaypoints = (c0: number, r0: number, c1: number, r1: number): Point[] => {
    const kv0 = snap(c0);
    const kv1 = snap(c1);
    const kh1 = snap(r1);
    const grid: [number, number][] = [
      [c0, r0],
      [kv0, r0],
      [kv0, kh1],
      [kv1, kh1],
      [kv1, r1],
      [c1, r1],
    ];
    const out: Point[] = [];
    let prev: [number, number] | null = null;
    for (const g of grid) {
      if (prev && Math.abs(prev[0] - g[0]) < 0.01 && Math.abs(prev[1] - g[1]) < 0.01) continue;
      out.push(iso(g[0] + 0.5, g[1] + 0.5));
      prev = g;
    }
    return out;
  };

  const citizens: Citizen[] = [];
  for (let i = 0; i < 500; i++) {
    const home = homes.length ? pick(homes) : pick(buildings);
    const h = ctr(home);
    const toPark = rng() < 0.42 && parks.length > 0;

    let pts: Point[];
    let arriveIdx: number;
    let destBuilding: Building;
    if (toPark) {
      const p = pick(parks);
      destBuilding = p;
      const gx = p.col + (0.2 + rng() * 0.6) * p.w;
      const gy = p.row + (0.2 + rng() * 0.6) * p.d;
      const route = roadWaypoints(h.c, h.r, gx, gy);
      arriveIdx = route.length - 1;
      const wander: Point[] = [];
      for (let w = 0; w < 3; w++) wander.push(iso(gx + 0.5 + (rng() - 0.5), gy + 0.5 + (rng() - 0.5)));
      pts = [...route, ...wander];
    } else {
      const dest = works.length ? pick(works) : pick(buildings);
      destBuilding = dest;
      const d = ctr(dest);
      pts = roadWaypoints(h.c, h.r, d.c, d.r);
      arriveIdx = pts.length - 1;
    }
    if (pts.length < 2) pts = [pts[0] ?? iso(h.c, h.r), { x: (pts[0]?.x ?? 0) + 8, y: pts[0]?.y ?? 0 }];

    const n = pts.length;
    const opacity = new Array<number>(n).fill(1);
    const scale = new Array<number>(n).fill(1);
    opacity[0] = 0;
    scale[0] = 0.3; // emerge from home
    if (!toPark) {
      opacity[n - 1] = 0;
      scale[n - 1] = 0.3; // enter workplace
    }

    // Constant-ish speed via distance-weighted times, with a dwell at the park.
    const weights: number[] = [];
    for (let k = 0; k < n - 1; k++) {
      const dx = pts[k + 1].x - pts[k].x;
      const dy = pts[k + 1].y - pts[k].y;
      let wgt = Math.hypot(dx, dy) + 2;
      if (toPark && k >= arriveIdx) wgt += 120; // linger while gathering
      weights.push(wgt);
    }
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const times: number[] = [0];
    let acc = 0;
    for (const wgt of weights) {
      acc += wgt;
      times.push(clamp(acc / total, 0, 1));
    }
    times[times.length - 1] = 1;

    citizens.push({
      id: `cz-${i}`,
      pts,
      times,
      opacity,
      scale,
      duration: 20 + rng() * 22,
      delay: rng() * 18,
      color: czColors[i % czColors.length],
      r: 2.1 + rng() * 1.0,
      behavior: toPark ? "park" : "commute",
      profile: makeProfile(`cz-${i}`, srng, home, destBuilding, toPark, czColors[i % czColors.length]),
    });
  }

  // --- Clouds ---
  const clouds: Cloud[] = Array.from({ length: 6 }, (_, i) => ({
    x: -260 + i * 240,
    y: -300 - (i % 3) * 70,
    scale: 0.7 + (i % 3) * 0.4,
    duration: 70 + i * 12,
    delay: i * 4,
  }));

  // --- Riverside scenery trees (on free banks) ---
  const scenery: Tree[] = [];
  for (let r = 1; r < SIZE; r += 1) {
    const cc = riverCenter(r);
    for (const side of [-1, 1]) {
      const c = Math.round(cc + side * (RIVER_HALF + 0.9));
      if (c < 0 || c >= SIZE) continue;
      if (!blocked(c, r) && rng() < 0.5) {
        occupied.add(`${c},${r}`);
        scenery.push({ p: iso(c + 0.5, r + 0.5), scale: 0.8 + rng() * 0.5, phase: rng() * Math.PI * 2 });
      }
    }
  }
  scenery.sort((a, b) => a.p.y - b.p.y);

  // --- Bounds ---
  const maxH = buildings.reduce((m, b) => Math.max(m, b.height), 0);
  const minX = iso(0, SIZE).x - 90;
  const maxX = iso(SIZE, 0).x + 90;
  const minY = iso(0, 0).y - maxH - 340;
  const maxY = iso(SIZE, SIZE).y + 100;
  const bounds: Bounds = { minX, minY, width: maxX - minX, height: maxY - minY };

  const allForCount = [...buildings, ...metroStations];
  const counts = allForCount.reduce(
    (acc, b) => {
      acc[b.kind] = (acc[b.kind] ?? 0) + 1;
      return acc;
    },
    {} as Record<BuildingKind, number>,
  );

  return {
    size: SIZE,
    roadStep: ROAD,
    buildings,
    roadLanes,
    river,
    metroLines,
    metroStations,
    metroTrains,
    fleet,
    citizens,
    clouds,
    scenery,
    bounds,
    counts,
  };
}

/** The city is generated once at module load and shared everywhere. */
export const CITY: City = buildCity();
