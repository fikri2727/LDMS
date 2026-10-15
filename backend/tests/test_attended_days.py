"""Multi-day Public/Inhouse trainings: participants who only came on some of the days."""

from app.models import Participation
from tests.conftest import login_as

TWO_DAY = {
    "title": "two day course", "program": "EXT", "platform": "PHYSICAL", "function": "DIGITAL", "venue": "hq",
    "startDate": "2026-06-01", "endDate": "2026-06-02", "startTime": "09:00", "endTime": "17:00", "trainer": "t",
}
SURVEY = {"courseRelevance": "4", "practicalExercises": "4", "sufficientTime": "4", "trainerEffectiveness": "4",
          "courseEffectiveness": "4", "whatLearnt": "x", "actionPlan": "y", "commentSuggestions": "z"}


def _setup(client, admin, user):
    login_as(client, admin)
    tid = client.post("/api/training/public", data=TWO_DAY).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(user.id)})
    pid = client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["id"]
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data=SURVEY)  # -> COMPLETED
    return tid, pid


def _set_days(client, tid, pid, days):
    return client.post(f"/api/training/public/{tid}/participants/{pid}/days", data={"days": [str(d) for d in days]})


def test_set_attended_days(client, db, admin, staff_user):
    tid, pid = _setup(client, admin, staff_user)
    p = db.get(Participation, pid)
    assert p.attended_days is None  # default: all days

    r = _set_days(client, tid, pid, [2])
    assert r.status_code == 200 and r.json() == {"attendedDays": [2]}
    db.refresh(p)
    assert p.attended_days == [2]

    assert _set_days(client, tid, pid, [1, 2]).json() == {"attendedDays": None}  # all days -> stored as "all"
    assert _set_days(client, tid, pid, []).json()["detail"].startswith("Tick at least one day")
    assert _set_days(client, tid, pid, [3]).json()["detail"] == "This training only has 2 day(s)."

    login_as(client, staff_user)  # admins only
    assert _set_days(client, tid, pid, [1]).status_code == 403


def test_hours_count_only_attended_days(client, db, admin, staff_user):
    tid, pid = _setup(client, admin, staff_user)

    def staff_hours():
        login_as(client, admin)
        rows = client.get(f"/api/staff/{staff_user.id}/training-record").json()["rows"]
        return next(r["totalHours"] for r in rows if r["type"] == "training" and r["id"] == tid)

    def org_hours():
        login_as(client, admin)
        dash = client.get("/api/dashboard", params={"start": "2026-01-01", "end": "2026-12-31"}).json()
        return dash["overview"]["totalHour"]

    def my_public_hours():
        login_as(client, staff_user)
        dash = client.get("/api/dashboard", params={"start": "2026-01-01", "end": "2026-12-31"}).json()
        return next(s["value"] for s in dash["split"] if s["name"] == "Public / Inhouse"), dash["overview"]["totalDay"]

    assert staff_hours() == 16  # 2 days x 8 h
    org_before, (mine_before, days_before) = org_hours(), my_public_hours()

    login_as(client, admin)
    _set_days(client, tid, pid, [2])  # came on day 2 only
    assert staff_hours() == 8
    assert round(org_before - org_hours(), 2) == 8
    mine_after, days_after = my_public_hours()
    assert round(mine_before - mine_after, 2) == 8 and days_before - days_after == 1


def test_absence_remark(client, db, admin, staff_user):
    login_as(client, admin)
    tid = client.post("/api/training/public", data=TWO_DAY).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(staff_user.id)})
    pid = client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["id"]
    client.post(f"/api/training/public/{tid}/participants/{pid}/absent")

    url = f"/api/training/public/{tid}/participants/{pid}/remark"
    assert client.post(url, data={"remark": "  MC (sick leave)  "}).json() == {"remark": "MC (sick leave)"}
    assert client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["remark"] == "MC (sick leave)"
    assert client.post(url, data={"remark": "x" * 501}).status_code == 400
    assert client.post(url, data={"remark": ""}).json() == {"remark": None}  # blank clears it

    login_as(client, staff_user)  # admins only
    assert client.post(url, data={"remark": "x"}).status_code == 403
