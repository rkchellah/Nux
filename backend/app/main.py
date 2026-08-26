import sys

if sys.platform == "win32":
    # Windows consoles default to cp1252, which can't encode the emoji used
    # in log prints throughout this app and crashes the process on import.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.websocket import router as ws_router
from app.api.memory import router as memory_router

app = FastAPI(title="Nux API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sightline-frontend-59597652459.europe-west1.run.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)
app.include_router(memory_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "nux-backend"}