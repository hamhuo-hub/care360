import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.alerts import router as alerts_router
from routes.config_api import router as config_router
from routes.status import router as status_router

app = FastAPI(title="Care360 Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alerts_router, prefix="/api")
app.include_router(config_router, prefix="/api")
app.include_router(status_router, prefix="/api")

# Serve built React SPA (only after `npm run build`)
_DIST = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.isdir(_DIST):
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="spa")
