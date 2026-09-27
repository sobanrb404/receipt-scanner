from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, export, receipts


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creates tables if they don't exist yet. Fine for local dev; once you
    # need real migrations, switch to `alembic upgrade head` and remove this.
    # Runs at startup (not at import time) so importing app.main — e.g. in
    # tests with a different DATABASE_URL — never touches the real DB.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Receipt Scanner API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your web/mobile app origins before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(receipts.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"status": "ok"}
