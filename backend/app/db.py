import os
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

# Supabase's transaction-mode pooler (PgBouncer) can't keep server-side
# prepared statements across transactions, so disable them.
_connect_args = {"prepare_threshold": None}

if os.environ.get("VERCEL"):
    # Serverless (Fluid compute reuses warm instances): keep a small pool so a
    # warm instance reuses its connection instead of paying a new TCP+TLS+auth
    # handshake per request. pre_ping/recycle drop connections that went stale
    # while the instance was idle. Supabase's pooler does the fan-in.
    engine = create_engine(
        get_settings().sqlalchemy_url,
        pool_size=2,
        max_overflow=3,
        pool_pre_ping=True,
        pool_recycle=240,
        connect_args=_connect_args,
    )
else:
    engine = create_engine(
        get_settings().sqlalchemy_url,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        connect_args=_connect_args,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
