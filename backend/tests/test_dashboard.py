from datetime import datetime

from app.models import (
    AttendanceStatus,
    Ojt,
    ParticipateOjt,
    Participation,
    Platform,
    StaffStatus,
    TrainerType,
    Training,
    TrainingFunction,
    TrainingProgram,
    User,
)
from tests.conftest import login_as


def _training(db, title, start, end, cost, trainer):
    t = Training(training_code=f"T-{title}", title=title, program=TrainingProgram.EXT, cost=cost,
                 platform=Platform.PHYSICAL, function=TrainingFunction.DIGITAL, venue="V", start_date=start,
                 end_date=end, start_time="09:00", end_time="17:00", trainer=trainer)
    db.add(t)
    db.flush()
    return t


def test_dashboard_figures(client, db, admin):
    staff = (
        db.query(User)
        .filter(User.status == StaffStatus.ACTIVE, User.department_id.isnot(None), User.role_type == "STAFF")
        .order_by(User.id)
        .limit(2)
        .all()
    )
    a, b = staff
    # 2-day training, 8h/day, both completed -> 16h session, 32 man-hours, RM 1000 in March
    t1 = _training(db, "T1", datetime(2029, 3, 2), datetime(2029, 3, 3), 1000, "ALICE")
    db.add_all([Participation(training_id=t1.id, user_id=a.id, attendance=AttendanceStatus.COMPLETED),
                Participation(training_id=t1.id, user_id=b.id, attendance=AttendanceStatus.COMPLETED)])
    # 1-day training, only A enrolled (pending) -> 8h session, 0 man-hours, RM 250.5 in May
    t2 = _training(db, "T2", datetime(2029, 5, 10), datetime(2029, 5, 10), 250.5, "BOB")
    db.add(Participation(training_id=t2.id, user_id=a.id, attendance=AttendanceStatus.PENDING))
    # OJT 1 day x 3.5h, B completed -> 3.5 man-hours
    o = Ojt(training_code="OJ-X", title="O1", start_date=datetime(2029, 6, 1), end_date=datetime(2029, 6, 1),
            start_time="08:30", end_time="12:00", venue="P", trainer_type=TrainerType.INTERNAL,
            trainer_name="ALICE", total_day=1, total_hour=3.5)
    db.add(o)
    db.flush()
    db.add(ParticipateOjt(ojt_id=o.id, user_id=b.id, attendance=AttendanceStatus.COMPLETED))
    db.flush()

    rng = {"start": "2029-01-01", "end": "2029-12-31"}
    login_as(client, admin)
    r = client.get("/api/dashboard", params=rng).json()
    assert r["orgWide"]
    assert r["overview"] == {"totalTraining": 3, "totalUser": 2, "totalDay": 4, "totalHour": 35.5}
    assert r["split"] == [{"name": "Public / Inhouse", "value": 32}, {"name": "OJT", "value": 3.5},
                          {"name": "E-Learning", "value": 0}]
    assert r["monthlyCost"][2] == {"month": "MAC", "cost": 1000} and r["monthlyCost"][4]["cost"] == 250.5
    # T1/T2 are external (Public) trainings -> not counted; only ALICE's internal OJT (3.5h)
    assert r["topTrainers"] == [{"trainer": "ALICE", "totalHour": 3.5}]
    dept_a = next(d for d in r["departmentData"] if d["departmentFullName"] == a.department.name)
    assert dept_a["manHour"] >= 16

    login_as(client, a)
    r = client.get("/api/dashboard", params=rng).json()
    assert not r["orgWide"] and r["monthlyCost"] is None and r["departmentData"] is None
    # Staff A: T1 (16h) + T2 (8h, pending) — personal view counts session hours, not man-hours
    assert r["overview"] == {"totalTraining": 2, "totalUser": 1, "totalDay": 3, "totalHour": 24}
    assert r["monthlyHours"][2]["hours"] == 16 and r["monthlyHours"][4]["hours"] == 8
    assert [x["title"] for x in r["recentRecords"]][:2] == ["T2", "T1"]
    assert r["myDepartmentData"][0]["departmentFullName"] == a.department.name


def test_top_trainers_internal_staff_only(client, db, admin):
    """Only Inhouse (Internal Trainer) trainings and internal-trainer OJT count."""
    from tests.conftest import login_as

    login_as(client, admin)
    base = {"platform": "PHYSICAL", "function": "DIGITAL", "venue": "hq", "startTime": "08:00", "endTime": "18:00"}
    big = {"startDate": "2026-02-02", "endDate": "2026-02-27"}  # long enough to reach the top 5
    client.post("/api/training/public", data={**base, **big, "title": "ext zz", "program": "EXT", "trainer": "ZZ OUTSIDE VENDOR"})
    client.post("/api/training/public", data={**base, **big, "title": "intx zz", "program": "INTX", "trainer": "ZZ HIRED TRAINER"})
    client.post("/api/training/public", data={**base, **big, "title": "inti zz", "program": "INTI", "trainer": "ZZ TAMCO STAFF"})
    names = [r["trainer"] for r in client.get("/api/dashboard", params={"start": "2026-01-01", "end": "2026-12-31"}).json()["topTrainers"]]
    assert "ZZ TAMCO STAFF" in names
    assert "ZZ OUTSIDE VENDOR" not in names and "ZZ HIRED TRAINER" not in names
