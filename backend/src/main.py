from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.playwright.routes import router as playwright_router


app = FastAPI(
    title="Mimica Backend",
    description="Backend API for Mimica UX Testing Platform",
    version="0.1.0",
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
