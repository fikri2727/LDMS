from app.models import Designation, Pme, User
from tests.conftest import login_as


def test_pme_flow(client, db, admin):
    login_as(client, admin)
    exec_user = (
        db.query(User)
        .filter(User.designation == Designation.EXECUTIVE, User.status == "ACTIVE", User.supervisor_id.isnot(None))
        .first()
    )
    supervisor = db.get(User, exec_user.supervisor_id)
    form = {"title": "old training", "program": "INTI", "platform": "ONLINE", "function": "BUSINESS", "venue": "x",
            "startDate": "2025-01-06", "endDate": "2025-01-07", "trainer": "t"}
    tid = client.post("/api/training/public", data=form).json()["id"]
    client.post(f"/api/training/public/{tid}/participants", data={"userId": str(exec_user.id)})
    pid = client.get(f"/api/training/public/{tid}").json()["training"]["participations"][0]["id"]
    client.post(f"/api/training/public/{tid}/participants/{pid}/survey", data={"courseRelevance": "5"})
    pme = db.query(Pme).filter_by(participation_id=pid).one()

    admin_view = client.get(f"/api/pme/{pme.id}")
    assert admin_view.status_code == 200 and admin_view.json()["supervisor"]["id"] == supervisor.id
    # (admins may evaluate on the supervisor's behalf - see test_on_behalf.py; incomplete forms are refused)
    assert client.post(f"/api/pme/{pme.id}/evaluate", data={}).json()["detail"].startswith("Please give a rating")

    login_as(client, exec_user)  # the employee themself can't see it
    assert client.get(f"/api/pme/{pme.id}").status_code == 403

    login_as(client, supervisor)
    lst = client.get("/api/pme").json()
    assert not lst["viewAll"] and any(p["id"] == pme.id for p in lst["myPmes"])
    r = client.post(f"/api/pme/{pme.id}/evaluate", data={"levelRating": "EXCELLENT", "levelPercent": "85%"})
    assert r.status_code == 400
    assert r.json()["detail"] == '"Knowledge Sharing / OJT": 85% doesn\'t match "Excellent (>90%)" — must be between 91% and 100%.'

    r = client.post(f"/api/pme/{pme.id}/evaluate", data={
        "ojtConducted": "yes", "ojtDetails": "done", "levelRating": "VERY_GOOD", "levelPercent": "85%",
        "level2Rating": "GOOD", "level2Percent": "72.5", "behavioralRating": "EXCELLENT", "behavioralPercent": "95",
        "resultRating": "SATISFACTORY", "resultPercent": "60", "resultRemark": " ok "})
    assert r.status_code == 200, r.text
    db.refresh(pme)
    assert pme.status.value == "VERIFIED" and pme.total_mark == 313 and pme.average_mark == 78.125
    assert pme.level_rating2.value == "GOOD" and pme.result_remark == "ok" and pme.ojt_conducted is True
    assert pme.from_date.date().isoformat() == "2025-01-08" and pme.to_date.date().isoformat() == "2025-04-08"
    assert client.post(f"/api/pme/{pme.id}/evaluate", data={}).json()["detail"] == "This PME has already been evaluated."
