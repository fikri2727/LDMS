from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import install_error_handlers
from app.routers import auth, checkin, dashboard, elearning, ojt, org, pme, requisition, staff, tna, training

app = FastAPI(title="TAMCO LDMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_credentials=True,  # the login cookie
    allow_methods=["*"],
    allow_headers=["*"],
)
install_error_handlers(app)

for r in (auth, dashboard, staff, org, training, ojt, checkin, pme, elearning, tna, requisition):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"ok": True}
