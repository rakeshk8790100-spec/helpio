from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.router import router
from app.core.database import close_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_database()


app = FastAPI(title="Helpio API", lifespan=lifespan)
app.include_router(router)
