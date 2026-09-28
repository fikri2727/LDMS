"""Read-only check: every model table/column exists in the live database.

Run from the backend folder:  python -m scripts.check_db
"""

from sqlalchemy import func, inspect, select

from app.db import SessionLocal, engine
from app.models import Base, User


def main() -> None:
    insp = inspect(engine)
    db_tables = set(insp.get_table_names())
    problems = 0

    for table in Base.metadata.tables.values():
        if table.name not in db_tables:
            print(f"MISSING TABLE  {table.name}")
            problems += 1
            continue
        db_cols = {c["name"] for c in insp.get_columns(table.name)}
        model_cols = {c.name for c in table.columns}
        for col in sorted(model_cols - db_cols):
            print(f"MISSING COLUMN {table.name}.{col}")
            problems += 1
        for col in sorted(db_cols - model_cols):
            print(f"UNMAPPED       {table.name}.{col}  (in database, not in model)")
            problems += 1

    with SessionLocal() as db:
        users = db.scalar(select(func.count()).select_from(User))

    print(f"\nTables checked: {len(Base.metadata.tables)}  |  Problems: {problems}  |  Users in DB: {users}")


if __name__ == "__main__":
    main()
