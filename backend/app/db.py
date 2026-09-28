import os
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

# Supabase's transaction-mode pooler (PgBouncer) can't keep server-side
# prepared statements across transactions, so disable them.
_connect_args = {"prepare_threshold": None}

if os.environ.get("VERCEL"):
    # Serverless: instances are short-lived and many run at once, so don't hold
    # connections open — Supabase's pooler does the pooling.
    engine = create_engine(get_settings().sqlalchemy_url, poolclass=NullPool, connect_args=_connect_args)
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
