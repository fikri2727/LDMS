"""Pending Evaluations monitoring page (by department)."""

from app.models import StaffStatus
from tests.conftest import login_as

FORM = {"program": "EXT", "platform": "PHYSICAL", "function": "DIGITAL", "venue": "hq",
        "startTime": "09:00", "endTime": "17:00", "trainer": "t"}


def _training(client, title, start, end, user):
    tid = client.post("/api/training/public", data={**FORM, "title": title, "startDate": start, "endDate": end}).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(user.id)})
    pid = client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["id"]
    return tid, pid


def _mine(client, user):
    data = client.get("/api/training/pending-evaluations").json()
    for d in data["departments"]:
        for s in d["staff"]:
            if s["id"] == user.id:
                return d, s
    return None, None


def test_pending_evaluations_by_department(client, db, admin, staff_user):
    login_as(client, admin)
    past, _ = _training(client, "past course zz", "2025-03-03", "2025-03-04", staff_user)
    future, _ = _training(client, "future course zz", "2099-03-03", "2099-03-04", staff_user)
    done, done_pid = _training(client, "done course zz", "2025-04-01", "2025-04-01", staff_user)
    client.post(f"/api/training/public/{done}/participants/{done_pid}/survey", data={"courseRelevance": "5"})
    absent, absent_pid = _training(client, "absent course zz", "2025-05-01", "2025-05-01", staff_user)
    client.post(f"/api/training/public/{absent}/participants/{absent_pid}/absent")

    dept, me = _mine(client, staff_user)
    titles = [i["title"] for i in me["items"]]
    assert "PAST COURSE ZZ" in titles  # started already, not evaluated
    assert "FUTURE COURSE ZZ" not in titles  # hasn't happened yet
    assert "DONE COURSE ZZ" not in titles and "ABSENT COURSE ZZ" not in titles
    item = next(i for i in me["items"] if i["title"] == "PAST COURSE ZZ")
    assert item["type"] == "training" and item["href"] == f"/training/public/{past}" and item["daysOutstanding"] > 0
    assert dept["id"] == staff_user.department_id and dept["pendingCount"] >= len(me["items"])

    # resigned staff drop off the list
    staff_user.status = StaffStatus.RESIGN
    db.flush()
    assert _mine(client, staff_user) == (None, None)


def test_pending_evaluations_admin_only(client, staff_user):
    login_as(client, staff_user)
    assert client.get("/api/training/pending-evaluations").status_code == 403
