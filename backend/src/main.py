from fastapi import FastAPI



app = FastAPI(
    title="Mimica Backend",
    description="Backend API for Mimica",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
