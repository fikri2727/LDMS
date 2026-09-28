from app.models import ElearningCertificate, ElearningCompletion, ElearningLesson, ElearningQuestion, User
from tests.conftest import login_as


def test_elearning_full_flow(client, db, admin, staff_user):
    login_as(client, admin)
    r = client.post("/api/elearning/modules", data={"title": "Py Module", "objectives": "a\nb", "passThreshold": ""})
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    assert client.post(f"/api/elearning/modules/{mid}/publish").json()["detail"] == "Add at least one lesson before publishing."

    assert client.post(f"/api/elearning/modules/{mid}/lessons?type=SLIDE", data={"title": "Intro", "slideContent": "word " * 450}).status_code == 200
    assert client.post(f"/api/elearning/modules/{mid}/lessons?type=VIDEO", data={"title": "Vid"}).status_code == 400
    assert client.post(f"/api/elearning/modules/{mid}/lessons?type=VIDEO", data={"title": "Vid", "videoUrl": "https://x/y"}).status_code == 200
    qr = client.post(f"/api/elearning/modules/{mid}/lessons?type=QUIZ", data={"title": "Quiz", "passPercent": "60", "maxAttempts": "2", "showCorrectAnswers": "on"})
    quiz_id = qr.json()["id"]

    assert client.post(f"/api/elearning/lessons/{quiz_id}/questions", data={"question": "Q?", "optionText": ["a", ""], "correctOption": "0"}).json() == {"error": "Provide at least two answer options."}
    client.post(f"/api/elearning/lessons/{quiz_id}/questions", data={"type": "SINGLE_CHOICE", "question": "2+2?", "optionText": ["3", "4", "5"], "correctOption": "1", "explanation": "math"})
    client.post(f"/api/elearning/lessons/{quiz_id}/questions", data={"type": "TRUE_FALSE", "question": "Sky blue?", "trueFalseAnswer": "true", "marks": "2"})

    lessons = db.query(ElearningLesson).filter_by(module_id=mid).order_by(ElearningLesson.order).all()
    assert [l.order for l in lessons] == [1, 2, 3]
    client.post(f"/api/elearning/modules/{mid}/lessons/{lessons[1].id}/reorder?direction=up")
    db.expire_all()
    assert db.get(ElearningLesson, lessons[1].id).order == 1
    client.post(f"/api/elearning/modules/{mid}/lessons/{quiz_id}/duplicate")
    copy = db.query(ElearningLesson).filter_by(module_id=mid, title="Quiz (Copy)").one()
    assert db.query(ElearningQuestion).filter_by(lesson_id=copy.id).count() == 2
    client.delete(f"/api/elearning/modules/{mid}/lessons/{copy.id}")

    detail = client.get(f"/api/elearning/modules/{mid}").json()
    assert len(detail["lessons"]) == 3 and detail["lessons"][2]["questions"]
    assert client.post(f"/api/elearning/modules/{mid}/publish").status_code == 200
    assert client.post(f"/api/elearning/modules/{mid}/assign", data={"target": "individual", "userIds": str(staff_user.id), "mandatory": "on", "dueDate": "2026-12-31"}).status_code == 200
    assert client.get("/api/elearning/admin/analytics").status_code == 200

    # ---- learner ----
    login_as(client, staff_user)
    assert client.post(f"/api/elearning/modules/{mid}/publish").status_code == 403
    dash = client.get("/api/elearning/learner/dashboard").json()
    mod = next(m for m in dash["allPublished"] if m["id"] == mid)
    assert len(mod["lessons"]) == 3 and dash["progress"][str(mid)]["percent"] == 0
    assert dash["estimatedHours"][str(mid)] == round((3 + 10 + 5) / 60, 2)

    quiz = client.get(f"/api/elearning/learner/modules/{mid}/quiz/{quiz_id}").json()
    opts = [o for q in quiz["lesson"]["questions"] for o in q["options"]]
    assert not any(o["isCorrect"] for o in opts), "answers must not leak before review"
    assert all(q["explanation"] is None for q in quiz["lesson"]["questions"])

    q1, q2 = db.query(ElearningQuestion).filter_by(lesson_id=quiz_id).order_by(ElearningQuestion.order).all()
    wrong1 = next(o.id for o in q1.options if not o.is_correct)
    true2 = next(o.id for o in q2.options if o.text == "True")

    r = client.post(f"/api/elearning/learner/modules/{mid}/quiz/{quiz_id}", data={f"q_{q1.id}": str(wrong1)})
    assert r.json() == {"score": 0, "passed": False}
    r = client.post(f"/api/elearning/learner/modules/{mid}/quiz/{quiz_id}", data={f"q_{q1.id}": str(wrong1), f"q_{q2.id}": str(true2)})
    assert r.json() == {"score": 66.67, "passed": True}
    assert db.query(ElearningCompletion).filter_by(module_id=mid, user_id=staff_user.id).count() == 0  # slides not done

    review = client.get(f"/api/elearning/learner/modules/{mid}/quiz/{quiz_id}").json()
    assert any(o["isCorrect"] for q in review["lesson"]["questions"] for o in q["options"])

    for l in lessons[:2]:
        assert client.post(f"/api/elearning/learner/modules/{mid}/lessons/{l.id}/complete").status_code == 200
    comp = db.query(ElearningCompletion).filter_by(module_id=mid, user_id=staff_user.id).one()
    cert = db.query(ElearningCertificate).filter_by(completion_id=comp.id).one()
    assert comp.final_score == 66.67 and cert.certificate_no.startswith("CERT-")
    assert client.get(f"/api/elearning/learner/certificates/{cert.id}").json()["certificateNo"] == cert.certificate_no
    player = client.get(f"/api/elearning/learner/modules/{mid}").json()
    assert player["progress"]["percent"] == 100 and player["completion"]

    other = db.query(User).filter(User.id != staff_user.id, User.role_type == "STAFF").first()
    login_as(client, other)
    assert client.get(f"/api/elearning/learner/certificates/{cert.id}").status_code == 403

    login_as(client, admin)
    client.post(f"/api/elearning/modules/{mid}/unpublish")
    login_as(client, staff_user)
    assert client.get(f"/api/elearning/learner/modules/{mid}").status_code == 404
