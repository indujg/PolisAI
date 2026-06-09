# PolisAI Endpoint Inventory And Product Vision

This document lists every currently exposed API route and captures the product vision for the website and app experience.

Base URLs:
- **Production (Cloudflare Tunnel):** `https://keeps-larger-doubt-diploma.trycloudflare.com`
- **API Docs:** `https://keeps-larger-doubt-diploma.trycloudflare.com/docs`
- **ReDoc:** `https://keeps-larger-doubt-diploma.trycloudflare.com/redoc`
- HTTP API: `/api/v1`
- WebSocket API: `/ws`
- Local dev server: `http://127.0.0.1:8000`

Auth notes:
- Public routes include health, readiness, auth register/login/refresh/logout, analytics routes, and OpenAPI docs in development.
- Protected routes require `Authorization: Bearer <access_token>`.
- Role levels are `citizen`, `researcher`, `policy_maker`, and `admin`.

## Health

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/v1/healthz` | Liveness probe. Confirms the app process is responding. | Public |
| GET | `/api/v1/readyz` | Readiness probe. Checks app version, environment, and Supabase health. | Public |

## Auth

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Create a user account and return tokens. | Public |
| POST | `/api/v1/auth/login` | Sign in and return user plus tokens. | Public |
| POST | `/api/v1/auth/logout` | Best effort sign out. | Public with optional token |
| POST | `/api/v1/auth/refresh` | Refresh an auth session. | Public |
| GET | `/api/v1/auth/me` | Return the current user profile. | Any authenticated user |
| PATCH | `/api/v1/auth/me` | Update the current user's profile. | Any authenticated user |
| PUT | `/api/v1/auth/users/{user_id}/role` | Change a user's role. Accepts JSON body like `{"role":"policy_maker"}`. | Admin |
| DELETE | `/api/v1/auth/users/{user_id}` | Deactivate a user account. | Admin |

## Simulations

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/simulations` | Create a new simulation and default government. | Policy maker or admin |
| GET | `/api/v1/simulations` | List simulations owned by the current user. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}` | Get one simulation. | Researcher or higher |
| PATCH | `/api/v1/simulations/{sim_id}` | Update simulation metadata or config. | Policy maker or admin |
| DELETE | `/api/v1/simulations/{sim_id}` | Delete a simulation. | Policy maker or admin |
| POST | `/api/v1/simulations/{sim_id}/start` | Start scheduled ticking. Supports `max_ticks` query param. | Policy maker or admin |
| POST | `/api/v1/simulations/{sim_id}/pause` | Pause a running simulation. | Policy maker or admin |
| POST | `/api/v1/simulations/{sim_id}/stop` | Stop a simulation and mark it completed. | Policy maker or admin |
| POST | `/api/v1/simulations/{sim_id}/tick` | Run manual ticks. Supports `ticks` query param. | Policy maker or admin |
| GET | `/api/v1/simulations/{sim_id}/state` | Return simulation, government, citizen count, scheduler state, and latest result. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/results` | Return paginated tick results. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/citizens` | Return paginated citizen rows. | Researcher or higher |

## Population

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/simulations/{sim_id}/population/seed` | Start a background population seed job. | Policy maker or admin |
| GET | `/api/v1/simulations/{sim_id}/population/jobs/{job_id}` | Poll a population seed job. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/population/stats` | Get aggregate population demographics and wellbeing stats. | Researcher or higher |
| DELETE | `/api/v1/simulations/{sim_id}/population` | Delete all citizens for a simulation. | Policy maker or admin |

## World

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/simulations/{sim_id}/world/seed` | Seed businesses, infrastructure, institutions, employment, and relationships. | Policy maker or admin |
| GET | `/api/v1/simulations/{sim_id}/world/jobs/{job_id}` | Poll a world seed job. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/world` | Get world overview counts and averages. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/businesses` | List businesses. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/businesses/{biz_id}` | Get one business. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/businesses/{biz_id}/employees` | List employees for one business. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/infrastructure` | List infrastructure nodes. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/infrastructure/{infra_id}` | Get one infrastructure node. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/institutions` | List institutions. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/institutions/{inst_id}` | Get one institution. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/elections` | List elections. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/elections/latest` | Get the latest completed election. | Researcher or higher |
| POST | `/api/v1/simulations/{sim_id}/elections/trigger` | Manually run an election. | Policy maker or admin |
| GET | `/api/v1/simulations/{sim_id}/citizens/{citizen_id}/relationships` | Get citizen relationships. | Researcher or higher |
| GET | `/api/v1/simulations/{sim_id}/citizens/{citizen_id}/employment` | Get citizen employment. | Researcher or higher |

## Policies

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/policies` | Create a policy for a simulation government. | Policy maker or admin |
| GET | `/api/v1/policies` | List policies by simulation, status, category, or government. | Researcher or higher |
| GET | `/api/v1/policies/{policy_id}` | Get one policy. | Researcher or higher |
| PATCH | `/api/v1/policies/{policy_id}` | Update a policy. | Policy maker or admin |
| DELETE | `/api/v1/policies/{policy_id}` | Delete a proposed, rejected, or repealed policy. | Policy maker or admin |
| POST | `/api/v1/policies/{policy_id}/activate` | Activate a policy and stamp `enacted_tick`. | Policy maker or admin |
| POST | `/api/v1/policies/{policy_id}/deactivate` | Repeal an active policy and stamp `repealed_tick`. | Policy maker or admin |
| POST | `/api/v1/policies/{policy_id}/simulate` | Forecast policy impact without mutating simulation state. | Researcher or higher |

## Analytics

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/v1/analytics` | Get current KPI snapshot and trends for one simulation. | Public |
| GET | `/api/v1/analytics/dashboard` | Get multi-simulation dashboard overview. | Public |
| GET | `/api/v1/analytics/reports` | Get time-series KPI report with optional field filters. | Public |
| GET | `/api/v1/analytics/simulation/{sim_id}/summary` | Get a complete simulation summary for detail pages. | Public |

## Agents

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/v1/agents` | List registered domain agents. | Researcher or higher |
| GET | `/api/v1/agents/{agent_id}` | Get one agent by id. | Researcher or higher |
| POST | `/api/v1/agents/run/{sim_id}` | Run all domain agents for one or more ticks. Simulation must be `draft`, `running`, or `paused`. | Policy maker or admin |

Default agents:
- `economy`
- `climate`
- `healthcare`
- `governance`
- `mobility`
- `news`

## AI

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/v1/ai/policy/{policy_id}/analyse` | Generate AI policy analysis. | Researcher or higher |
| POST | `/api/v1/ai/simulations/{sim_id}/explain` | Generate a plain-English simulation explanation. | Researcher or higher |
| POST | `/api/v1/ai/simulations/{sim_id}/news` | Generate a news article for the latest simulation state. | Researcher or higher |
| POST | `/api/v1/ai/simulations/{sim_id}/recommend` | Generate prioritized policy recommendations. | Policy maker or admin |

## WebSockets

| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| WS | `/ws/simulations/{sim_id}` | Real-time stream for one simulation. Supports `channels` query param. | Optional token |
| WS | `/ws/global` | Cross-simulation monitoring stream. | Public |

Simulation WebSocket channels:
- `tick`
- `citizens`
- `events`
- `policy`
- `agents`
- `*`

## Recommended Frontend Flows

1. Create or log in as a policy maker.
2. Create a simulation with `/api/v1/simulations`.
3. Seed citizens with `/population/seed`, then poll `/population/jobs/{job_id}`.
4. Seed the world with `/world/seed`, then poll `/world/jobs/{job_id}`.
5. Open a live simulation view using `/state`, `/world`, `/citizens`, analytics endpoints, and `/ws/simulations/{sim_id}`.
6. Let the user start, pause, stop, or manually tick the simulation.
7. Let the user create policies, simulate impact, activate policies, and watch metrics change.
8. Use agents and AI endpoints to explain what happened and recommend next moves.

## Website And App Vision

PolisAI should feel like a living civic simulation, not a static dashboard. The first screen should put the user directly inside a city-scale digital twin where policy choices visibly change the world.

Core experience:
- A real-time simulation map with citizens walking through streets, buildings, institutions, businesses, infrastructure nodes, and districts.
- Citizens should feel like individual agents with age, income, health, happiness, stress, education, political alignment, relationships, employment, and voting behavior.
- Buildings should represent actual world entities from the backend: businesses, hospitals, schools, courts, banks, media organizations, roads, rail, airports, power grids, housing, ports, and internet infrastructure.
- The city should respond to ticks. Citizens move, businesses employ people, infrastructure quality changes, elections happen, policies activate, news breaks, and KPIs update.
- The simulation should be explorable at multiple zoom levels: national overview, city map, district view, building detail, citizen profile, and policy impact view.

Website direction:
- The public website should explain PolisAI as an AI-powered societal digital twin for testing policy, governance, economics, climate, healthcare, mobility, and civic outcomes.
- It should show the product visually: a living simulated city, not only charts.
- It should communicate that users can create societies, seed populations, run policies, watch citizens react, and ask AI agents what is happening.
- It should include strong visual proof: moving citizens, changing buildings, dashboards, live news, policy cards, election results, and agent insights.

App direction:
- The app should open into the actual simulation workspace, not a marketing landing page.
- The main layout should combine:
  - Live city/world viewport.
  - Simulation controls for start, pause, stop, and manual tick.
  - KPI strip for happiness, health, GDP, income, crime, literacy, approval, unemployment, and inequality.
  - Policy workbench for create, simulate, activate, deactivate, and compare.
  - Citizen explorer with filters for age, occupation, income, health, happiness, education, political alignment, employment, and relationships.
  - World explorer for businesses, institutions, infrastructure, elections, relationships, and employment.
  - Agent panel showing economy, climate, healthcare, governance, mobility, and news insights.
  - AI briefing panel with explain, news, recommendations, and policy analysis.

Simulation visuals:
- Citizens should walk between homes, workplaces, schools, hospitals, institutions, shops, and civic spaces.
- Buildings should have states: active, strained, low quality, high utilization, underfunded, or impacted by policy.
- Infrastructure should visibly degrade or improve over time.
- Elections should create civic events, public sentiment shifts, and leadership outcomes.
- News should appear as an in-world feed, not just text in a separate screen.
- Policy effects should be visualized on the city: affected regions, citizen groups, businesses, and KPIs.

Strategic product promise:
- PolisAI lets people test governance ideas before they affect real societies.
- It turns policy from static debate into an interactive, observable simulation.
- It makes complex systems legible by showing citizens, institutions, money, health, mobility, climate, politics, and AI analysis in one living environment.

## Verification Snapshot

Latest local verification:
- Unit and integration tests: `164 passed`
- Full live endpoint retest: all expected routes passed after correcting the script order for `/agents/run`
- Focused `/agents/run` retest on a draft simulation: `200`, six agents succeeded, zero agent errors
- WebSockets verified for simulation and global streams
