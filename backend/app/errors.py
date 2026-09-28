import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

FK_VIOLATION = "23503"
UNIQUE_VIOLATION = "23505"


def _pgcode(e: IntegrityError) -> str | None:
    return getattr(getattr(e, "orig", None), "sqlstate", None)


def is_fk_error(e: IntegrityError) -> bool:
    return _pgcode(e) == FK_VIOLATION


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(IntegrityError)
    async def integrity_error(_: Request, e: IntegrityError):
        code = _pgcode(e)
        logging.getLogger("ldms").warning("IntegrityError %s: %s", code, e.orig)
        if code == FK_VIOLATION:
            msg = "This record is still linked to other records and can't be changed or deleted."
        elif code == UNIQUE_VIOLATION:
            msg = "A record with the same value already exists."
        else:
            msg = "The data could not be saved."
        return JSONResponse({"detail": msg}, status_code=400)
