import json

import pytest

from app.models import Tna, TnaTrainingOption, TrainingRequisition, User
from tests.conftest import login_as

YEAR = 2031  # a year with no real data


@pytest.fixture
def hod_and_staff(db):
    hod = db.query(User).filter(User.is_hod.is_(True), User.status == "ACTIVE").first()
    member = db.query(User).filter(User.hod_id == hod.id, User.id != hod.id, User.status == "ACTIVE").first()
    return hod, member


def _item(section="ESG", order=0):
    return {"section": section, "order": order, "problemStatement": "p", "training": "T", "targetSkill": 4,
            "currentSkill": 2, "trainingType": "OJT", "monthApply": "MAR"}


def test_tna_flow(client, db, admin, hod_and_staff):
    hod, member = hod_and_staff
    login_as(client, member)
    assert client.post("/api/tna", data={"year": str(YEAR), "payload": "[]"}).status_code == 400

    login_as(client, hod)
    r = client.post("/api/tna", data={"year": str(YEAR), "payload": json.dumps([_item(), _item("LEAD", 1)])})
    assert r.status_code == 200, r.text
    mine = client.get("/api/tna/mine", params={"year": YEAR}).json()
    assert len(mine["tna"]["items"]) == 2 and mine["tna"]["status"] == "PENDING"
    client.post("/api/tna", data={"year": str(YEAR), "payload": json.dumps([_item("DATA")])})  # resubmit replaces
    tna = db.query(Tna).filter_by(user_id=hod.id, year=YEAR).one()
    db.refresh(tna)
    assert [i.section.value for i in tna.items] == ["DATA"]

    login_as(client, admin)
    overview = client.get("/api/tna/admin", params={"year": YEAR}).json()
    assert any(t["id"] == tna.id and t["_count"]["items"] == 1 for t in overview["yearTnas"])
    assert overview["reportItems"][0]["tna"]["user"]["staffNo"] == hod.staff_no
    assert client.get(f"/api/tna/{tna.id}").json()["tna"]["user"]["id"] == hod.id
    assert client.get("/api/tna/summary", params={"year": YEAR}).json()["items"] == [{"section": "DATA", "trainingType": "OJT"}]
    assert client.post(f"/api/tna/{tna.id}/approve").status_code == 200

    login_as(client, hod)
    r = client.post("/api/tna", data={"year": str(YEAR), "payload": json.dumps([_item()])})
    assert r.json()["detail"] == "This TNA record has already been approved and can no longer be edited."

    login_as(client, admin)
    assert client.post("/api/tna/options?section=SELF", data={"label": "time mgmt", "groupName": "soft"}).status_code == 200
    opt = db.query(TnaTrainingOption).filter_by(label="TIME MGMT").one()
    assert opt.group_name == "SOFT"
    client.post(f"/api/tna/options/{opt.id}", data={"label": "time management"})
    db.refresh(opt)
    assert opt.label == "TIME MANAGEMENT" and opt.group_name is None
    assert client.delete(f"/api/tna/options/{opt.id}").status_code == 200


REQ = {"title": "Excel course", "trainingDate": "2031-02-01", "startTime": "09:00", "endTime": "17:00",
       "venue": "KL", "objective": "skills", "fees": "500", "hrdcClaimable": "yes", "underAtp": "no",
       "trainingProvider": "Vendor"}


def test_requisition_flow(client, db, admin, hod_and_staff):
    hod, member = hod_and_staff
    login_as(client, member)
    assert client.post("/api/requisitions", data={**REQ, "participantUserIds": []}).json()["detail"] == "Add at least one participant."
    r = client.post("/api/requisitions", data={**REQ, "participantUserIds": [str(member.id), str(member.id)]})
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    req = db.get(TrainingRequisition, rid)
    assert req.training_end_date == req.training_date and len(req.participants) == 1 and req.hrdc_claimable
    assert any(x["id"] == rid and x["_count"]["participants"] == 1 for x in client.get("/api/requisitions").json()["myApplications"])
    assert client.post(f"/api/requisitions/{rid}/review", json={"decision": "APPROVED"}).json()["detail"] == "Not authorized to review this requisition."

    other = db.query(User).filter(User.id.notin_([member.id, hod.id]), User.role_type == "STAFF", User.is_hod.is_(False)).first()
    login_as(client, other)
    assert client.get(f"/api/requisitions/{rid}").status_code == 403

    login_as(client, hod)
    assert any(x["id"] == rid for x in client.get("/api/requisitions").json()["pendingForReview"])
    assert client.post(f"/api/requisitions/{rid}/review", json={"decision": "COMPLETED"}).json()["detail"] == "Only an Admin can mark a requisition as Completed."
    assert client.post(f"/api/requisitions/{rid}/review", json={"decision": "APPROVED"}).status_code == 200
    assert client.post(f"/api/requisitions/{rid}/review", json={"decision": "REJECTED"}).json()["detail"] == "This requisition has already been reviewed."

    login_as(client, admin)
    assert client.post(f"/api/requisitions/{rid}/grant-id", json={"grantId": " G-1 "}).status_code == 200
    assert client.post(f"/api/requisitions/{rid}/review", json={"decision": "COMPLETED"}).status_code == 200
    db.refresh(req)
    assert req.grant_id == "G-1" and req.status.value == "COMPLETED" and req.reviewed_by_user_id == admin.id
    assert client.get(f"/api/requisitions/{rid}").json()["participants"][0]["user"]["id"] == member.id
    assert client.get(f"/api/requisitions/{rid}/brochure").status_code == 404
    assert client.delete(f"/api/requisitions/{rid}").status_code == 200
