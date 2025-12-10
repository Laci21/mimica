import datetime
from pathlib import Path
import json
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from src.workflow import Workflow
from src.event_store import store as events
from src.tkf_store import tkf
from src.persona_repository import repository as persona_repo

from src.playwright.routes import router as playwright_router

async def inititalize_server():
    print("Seeding TKF...")
    workflow = Workflow(events, tkf)
    await workflow.initialize_tkf()
    # Note: process_from_playwright_events() is commented out because TKF is now
    # seeded from seeds.py which already contains the processed playwright data.
    # Only uncomment if you want to reprocess playwright-runs/ folder on startup.
    # await workflow.process_from_playwright_events()
    print("TKF seeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await inititalize_server()
    yield
    # Shutdown (if needed)


app = FastAPI(
    title="Mimica Backend",
    description="Backend API for Mimica UX Testing Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Playwright routes
app.include_router(playwright_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Mimica backend is running"}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Mimica Backend API",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "playwright": "/playwright"
        }
    }

@app.get("/persona/{id}")
async def get_persona_by_id(id: str):
    """Get a persona by id."""
    persona = persona_repo.get_by_id(id)
    if persona is None:
        raise HTTPException(status_code=404, detail=f"Persona '{id}' not found")
    return persona


@app.get("/persona")
async def get_all_personas():
    """Get all personas."""
    return persona_repo.get_all()


@app.get("/tkf/full-content")
async def get_tkf():
    """Get the TKF."""
    return await tkf.get_full_content()

@app.get("/tkf/updates")
async def get_tkf_updates(request: Request):
    """Get the TKF updates filtered by query parameters."""
    # Convert MultiDict of query params to a plain dict[str, str]
    filters = dict(request.query_params)
    return await tkf.get_updates_by_metadata_filter(filters)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
