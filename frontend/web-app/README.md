# PolisAI Design System

Production-ready Next.js, TailwindCSS, and Shadcn UI implementation for a premium light-mode smart city SaaS product.

## Stack

- Next.js App Router
- TailwindCSS design tokens
- Shadcn UI-compatible component primitives
- Radix UI dialog and label primitives
- Recharts visual system
- Lucide iconography

## Run

```bash
npm install
npm run dev
```

## System

- Color roles are defined as CSS variables in `app/globals.css` and mapped through `tailwind.config.ts`.
- Typography, spacing, radius, shadow, chart, and glassmorphism tokens live in Tailwind.
- Core Shadcn-style primitives live in `components/ui`.
- The design-system showcase lives in `components/polisai/design-system-showcase.tsx`.
- The production app shell lives in `app/(console)/layout.tsx` and `components/polisai`.

## App Routes

- `/dashboard`
- `/simulation`
- `/policies`
- `/citizens`
- `/analytics`
- `/news`
- `/agents`
- `/settings`

The root route `/` serves the PolisAI landing page, and `/dashboard` opens the product command center.

## Live City Simulation

The `/simulation` route is a Mapbox-powered live city simulation screen with roads, buildings, hospitals, schools, factories, citizens, vehicles, zoom, pan, hover details, tooltips, and animated movement.

To enable the Mapbox base layer, set:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

Without a token, the screen falls back to a local illustrated simulation map so development and builds continue to work.

## Direction

PolisAI uses civic aqua, signal blue, solar amber, transit violet, park green, and graphite neutrals over layered light surfaces. The UI language is calm, operational, and premium: compact controls, crisp borders, translucent cards, data-rich tables, and chart styling for sensor-heavy city operations.
