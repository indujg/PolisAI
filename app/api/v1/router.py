from fastapi import APIRouter

from app.api.v1.endpoints import agents, ai, analytics, auth, health, policy, population, simulation, world, ws

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(simulation.router)
api_router.include_router(policy.router)
api_router.include_router(agents.router)
api_router.include_router(ai.router)
api_router.include_router(analytics.router)
api_router.include_router(population.router)
api_router.include_router(world.router)

# WebSocket routes are registered on the app directly (no /api/v1 prefix)
# We expose the router here so main.py can include it separately
ws_router = ws.router
