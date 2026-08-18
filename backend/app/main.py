from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.identity.router import router as identity_router
from app.modules.index_registry.router import router as index_registry_router
from app.modules.methodology_engine.router import router as methodology_router
from app.modules.data_layer.router import router as data_layer_router
from app.modules.ai_orchestration.router import router as ai_router
from app.modules.publishing.router import router as publishing_router
from app.modules.notifications.router import router as notifications_router
from app.modules.analytics_audit.router import router as audit_router
from app.modules.methodology_engine.weighting_router import (
    router as weighting_router,
)
from app.modules.methodology_engine.calculation_router import (
    router as calculation_router,
)

app = FastAPI(title=settings.app_name)


allowed_origins = [
    origin.strip()
    for origin in settings.allowed_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identity_router)
app.include_router(index_registry_router)
app.include_router(methodology_router)
app.include_router(data_layer_router)
app.include_router(ai_router)
app.include_router(publishing_router)
app.include_router(notifications_router)
app.include_router(audit_router)
app.include_router(weighting_router)
app.include_router(calculation_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.environment,
    }