from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.categories import router as categories_router
from app.api.routes.products import router as products_router
from app.api.routes.churches import router as churches_router
from app.api.routes.stock import router as stock_router
from app.api.routes.orders import router as orders_router
from app.api.routes.dash import router as dash_router
from app.api.routes.reports import router as reports_router

app = FastAPI(title="CCB CNS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(products_router)
app.include_router(churches_router)
app.include_router(stock_router)
app.include_router(orders_router)
app.include_router(dash_router)
app.include_router(reports_router)


@app.get("/", tags=["root"])  # simple root
def read_root():
    return {"name": "CCB CNS API", "status": "ok"}
