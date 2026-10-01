"""SQLAlchemy models mapped onto the existing Prisma-created PostgreSQL tables.

Table, column and enum-type names are the exact (quoted, camelCase) names
Prisma created, so this backend reads and writes the same data as ldms-web.
Python attributes are snake_case; the API layer converts to camelCase JSON.

Prisma's @updatedAt has no database default (Prisma sets it client-side), so
`updated_at` is set here via default/onupdate.
"""

import enum
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    """Prisma stores timestamp(3) without time zone, in UTC."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


def pg_enum(py_enum: type[enum.Enum]) -> ENUM:
    # The Postgres type already exists (created by Prisma) and is named after the enum.
    return ENUM(py_enum, name=py_enum.__name__, create_type=False)


def created_at_col() -> Mapped[datetime]:
    return mapped_column("createdAt", DateTime, server_default=func.now(), default=utcnow)


def updated_at_col() -> Mapped[datetime]:
    return mapped_column("updatedAt", DateTime, default=utcnow, onupdate=utcnow)


# ---------- Enums ----------


class RoleType(str, enum.Enum):
    ADMIN = "ADMIN"
    CLERK = "CLERK"
    STAFF = "STAFF"
    CREATOR = "CREATOR"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class Designation(str, enum.Enum):
    EXECUTIVE = "EXECUTIVE"
    MANAGER = "MANAGER"
    NON_EXECUTIVE = "NON_EXECUTIVE"
    CONTRACT = "CONTRACT"
    TRAINEE = "TRAINEE"


class StaffStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESIGN = "RESIGN"


class TrainingProgram(str, enum.Enum):
    EXT = "EXT"  # External public program
    INTX = "INTX"  # Internal training, external trainer
    INTI = "INTI"  # Internal training, internal trainer


class Platform(str, enum.Enum):
    PHYSICAL = "PHYSICAL"
    ONLINE = "ONLINE"


class TrainingFunction(str, enum.Enum):
    BUSINESS = "BUSINESS"
    DIGITAL = "DIGITAL"
    LEADERSHIP = "LEADERSHIP"
    PERSONAL_EFFECTIVENESS = "PERSONAL_EFFECTIVENESS"


class AttendanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    ABSENT = "ABSENT"


class TrainerType(str, enum.Enum):
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"


class PmeStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"


class RatingBand(str, enum.Enum):
    EXCELLENT = "EXCELLENT"
    VERY_GOOD = "VERY_GOOD"
    GOOD = "GOOD"
    SATISFACTORY = "SATISFACTORY"
    FAIR = "FAIR"
    POOR = "POOR"


class ModuleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class LessonType(str, enum.Enum):
    SLIDE = "SLIDE"
    VIDEO = "VIDEO"
    QUIZ = "QUIZ"


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"
    MULTIPLE_ANSWER = "MULTIPLE_ANSWER"


class TnaSection(str, enum.Enum):
    ESG = "ESG"
    SELF = "SELF"
    LEAD = "LEAD"
    DATA = "DATA"
    FUNCTIONAL = "FUNCTIONAL"
    BUSINESS = "BUSINESS"
    SPECIAL = "SPECIAL"


class TnaTrainingType(str, enum.Enum):
    OJT = "OJT"
    COACHING = "COACHING"
    EXTERNAL = "EXTERNAL"


class TnaStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"


class RequisitionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


# ---------- Organization structure ----------


class Division(Base):
    __tablename__ = "Division"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True)
    short_name: Mapped[str | None] = mapped_column("shortName", Text)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    departments: Mapped[list["Department"]] = relationship(back_populates="division", passive_deletes=True, cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "Department"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    division_id: Mapped[int] = mapped_column("divisionId", ForeignKey("Division.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    short_name: Mapped[str | None] = mapped_column("shortName", Text)
    # Head of department (nullable — assigned separately from staff records)
    hod_user_id: Mapped[int | None] = mapped_column("hodUserId", ForeignKey("User.id", ondelete="SET NULL"), unique=True)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    division: Mapped[Division] = relationship(back_populates="departments")
    hod: Mapped["User | None"] = relationship(foreign_keys=[hod_user_id])
    sections: Mapped[list["Section"]] = relationship(back_populates="department", passive_deletes=True, cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "Section"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column("departmentId", ForeignKey("Department.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    short_name: Mapped[str | None] = mapped_column("shortName", Text)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    department: Mapped[Department] = relationship(back_populates="sections")


# ---------- Staff / auth ----------


class User(Base):
    __tablename__ = "User"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    staff_no: Mapped[str] = mapped_column("staffNo", Text, unique=True)
    password: Mapped[str] = mapped_column(Text)
    password_is_default: Mapped[bool] = mapped_column("passwordIsDefault", Boolean, default=True)
    staff_name: Mapped[str] = mapped_column("staffName", Text)
    email: Mapped[str | None] = mapped_column(Text)
    gender: Mapped[Gender] = mapped_column(pg_enum(Gender))
    designation: Mapped[Designation] = mapped_column(pg_enum(Designation))
    nationality: Mapped[str | None] = mapped_column(Text)

    division_id: Mapped[int | None] = mapped_column("divisionId", ForeignKey("Division.id"))
    department_id: Mapped[int | None] = mapped_column("departmentId", ForeignKey("Department.id"))
    section_id: Mapped[int | None] = mapped_column("sectionId", ForeignKey("Section.id"))

    status: Mapped[StaffStatus] = mapped_column(pg_enum(StaffStatus), default=StaffStatus.ACTIVE)
    date_resign: Mapped[datetime | None] = mapped_column("dateResign", DateTime)

    # Denormalized pointer to this staff's HOD (synced when Department.hodUserId changes).
    # Org-chart purposes only — NOT used for PME (see supervisor_id).
    hod_id: Mapped[int | None] = mapped_column("hodId", ForeignKey("User.id", ondelete="SET NULL"))
    is_hod: Mapped[bool] = mapped_column("isHod", Boolean, default=False)
    role_type: Mapped[RoleType] = mapped_column("roleType", pg_enum(RoleType), default=RoleType.STAFF)

    # Individual reporting line — who performs this staff member's PME evaluation.
    supervisor_id: Mapped[int | None] = mapped_column("supervisorId", ForeignKey("User.id", ondelete="SET NULL"))

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    division: Mapped[Division | None] = relationship(foreign_keys=[division_id])
    department: Mapped[Department | None] = relationship(foreign_keys=[department_id])
    section: Mapped[Section | None] = relationship(foreign_keys=[section_id])
    hod: Mapped["User | None"] = relationship(foreign_keys=[hod_id], remote_side=[id])
    supervisor: Mapped["User | None"] = relationship(foreign_keys=[supervisor_id], remote_side=[id])


# ---------- Public / Inhouse training ----------


class Training(Base):
    __tablename__ = "Training"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_code: Mapped[str] = mapped_column("trainingCode", Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    program: Mapped[TrainingProgram] = mapped_column(pg_enum(TrainingProgram))
    cost: Mapped[float] = mapped_column(Float, default=0)
    platform: Mapped[Platform] = mapped_column(pg_enum(Platform))
    function: Mapped[TrainingFunction] = mapped_column(pg_enum(TrainingFunction))
    venue: Mapped[str] = mapped_column(Text)
    hrdc_claimable: Mapped[bool] = mapped_column("hrdcClaimable", Boolean, default=False)
    start_date: Mapped[datetime] = mapped_column("startDate", DateTime)
    end_date: Mapped[datetime] = mapped_column("endDate", DateTime)
    start_time: Mapped[str] = mapped_column("startTime", Text)
    end_time: Mapped[str] = mapped_column("endTime", Text)
    trainer: Mapped[str] = mapped_column(Text)
    created_by_user_id: Mapped[int | None] = mapped_column("createdByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    created_by: Mapped[User | None] = relationship()
    participations: Mapped[list["Participation"]] = relationship(back_populates="training", passive_deletes=True, cascade="all, delete-orphan")
    certificates: Mapped[list["Certificate"]] = relationship(back_populates="training", passive_deletes=True, cascade="all, delete-orphan")


class Participation(Base):
    __tablename__ = "Participation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_id: Mapped[int] = mapped_column("trainingId", ForeignKey("Training.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    attendance: Mapped[AttendanceStatus] = mapped_column(pg_enum(AttendanceStatus), default=AttendanceStatus.PENDING)

    # Post-training survey (1-5: Poor/Fair/Good/Very Good/Excellent)
    course_relevance: Mapped[int | None] = mapped_column("courseRelevance", Integer)
    practical_exercises: Mapped[int | None] = mapped_column("practicalExercises", Integer)
    sufficient_time: Mapped[int | None] = mapped_column("sufficientTime", Integer)
    trainer_effectiveness: Mapped[int | None] = mapped_column("trainerEffectiveness", Integer)
    course_effectiveness: Mapped[int | None] = mapped_column("courseEffectiveness", Integer)
    what_learnt: Mapped[str | None] = mapped_column("whatLearnt", Text)
    action_plan: Mapped[str | None] = mapped_column("actionPlan", Text)
    comment_suggestions: Mapped[str | None] = mapped_column("commentSuggestions", Text)
    # Set when an admin filled in the survey on the participant's behalf (audit only).
    keyed_in_by_id: Mapped[int | None] = mapped_column("keyedInById", ForeignKey("User.id", ondelete="SET NULL"))

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    training: Mapped[Training] = relationship(back_populates="participations")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    keyed_in_by: Mapped[User | None] = relationship(foreign_keys=[keyed_in_by_id])
    pme: Mapped["Pme | None"] = relationship(back_populates="participation", passive_deletes=True, cascade="all, delete-orphan")


class Certificate(Base):
    __tablename__ = "Certificate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_id: Mapped[int] = mapped_column("trainingId", ForeignKey("Training.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column("fileName", Text)
    file_path: Mapped[str] = mapped_column("filePath", Text)
    uploaded_by_user_id: Mapped[int | None] = mapped_column("uploadedByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    uploaded_at: Mapped[datetime] = mapped_column("uploadedAt", DateTime, server_default=func.now(), default=utcnow)

    training: Mapped[Training] = relationship(back_populates="certificates")
    uploaded_by: Mapped[User | None] = relationship()


# ---------- OJT (on-the-job training) ----------


class Ojt(Base):
    __tablename__ = "Ojt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_code: Mapped[str] = mapped_column("trainingCode", Text, unique=True)
    title: Mapped[str] = mapped_column(Text)
    start_date: Mapped[datetime] = mapped_column("startDate", DateTime)
    end_date: Mapped[datetime] = mapped_column("endDate", DateTime)
    start_time: Mapped[str] = mapped_column("startTime", Text)
    end_time: Mapped[str] = mapped_column("endTime", Text)
    venue: Mapped[str] = mapped_column(Text)
    trainer_type: Mapped[TrainerType] = mapped_column("trainerType", pg_enum(TrainerType))
    trainer_name: Mapped[str] = mapped_column("trainerName", Text)
    total_day: Mapped[int] = mapped_column("totalDay", Integer)
    total_hour: Mapped[float] = mapped_column("totalHour", Float)
    total_man: Mapped[int] = mapped_column("totalMan", Integer, default=1)
    created_by_user_id: Mapped[int | None] = mapped_column("createdByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    created_by: Mapped[User | None] = relationship()
    participants: Mapped[list["ParticipateOjt"]] = relationship(back_populates="ojt", passive_deletes=True, cascade="all, delete-orphan")


class ParticipateOjt(Base):
    __tablename__ = "ParticipateOjt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ojt_id: Mapped[int] = mapped_column("ojtId", ForeignKey("Ojt.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    attendance: Mapped[AttendanceStatus] = mapped_column(pg_enum(AttendanceStatus), default=AttendanceStatus.PENDING)
    q1: Mapped[str | None] = mapped_column(Text)  # what was learned
    q2: Mapped[int | None] = mapped_column(Integer)  # self-rated skill before (1-5)
    q3: Mapped[int | None] = mapped_column(Integer)  # self-rated skill after (1-5)
    total_man: Mapped[int] = mapped_column("totalMan", Integer, default=1)
    department: Mapped[str | None] = mapped_column(Text)  # denormalized snapshot at time of entry
    clerk_id: Mapped[int | None] = mapped_column("clerkId", ForeignKey("User.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    ojt: Mapped[Ojt] = relationship(back_populates="participants")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    clerk: Mapped[User | None] = relationship(foreign_keys=[clerk_id])


# ---------- PME (Performance Monitoring Evaluation) ----------


class Pme(Base):
    __tablename__ = "Pme"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_id: Mapped[int] = mapped_column("trainingId", ForeignKey("Training.id", ondelete="CASCADE"))
    participation_id: Mapped[int] = mapped_column("participationId", ForeignKey("Participation.id", ondelete="CASCADE"), unique=True)
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    # Snapshot of the participant's supervisor when this PME was created.
    supervisor_id: Mapped[int | None] = mapped_column("supervisorId", ForeignKey("User.id", ondelete="SET NULL"))

    designation: Mapped[Designation] = mapped_column(pg_enum(Designation))
    staff_name: Mapped[str] = mapped_column("staffName", Text)
    staff_no: Mapped[str] = mapped_column("staffNo", Text)
    department: Mapped[str] = mapped_column(Text)
    training_title: Mapped[str] = mapped_column("trainingTitle", Text)
    from_date: Mapped[datetime | None] = mapped_column("fromDate", DateTime)
    to_date: Mapped[datetime | None] = mapped_column("toDate", DateTime)
    ojt_conducted: Mapped[bool | None] = mapped_column("ojtConducted", Boolean)
    ojt_details: Mapped[str | None] = mapped_column("ojtDetails", Text)

    level_rating: Mapped[RatingBand | None] = mapped_column("levelRating", pg_enum(RatingBand))
    level_percent: Mapped[str | None] = mapped_column("levelPercent", Text)
    level_remark: Mapped[str | None] = mapped_column("levelRemark", Text)
    level_rating2: Mapped[RatingBand | None] = mapped_column("levelRating2", pg_enum(RatingBand))
    level_percent2: Mapped[str | None] = mapped_column("levelPercent2", Text)
    level_remark2: Mapped[str | None] = mapped_column("levelRemark2", Text)
    behavioral_rating: Mapped[RatingBand | None] = mapped_column("behavioralRating", pg_enum(RatingBand))
    behavioral_percent: Mapped[str | None] = mapped_column("behavioralPercent", Text)
    behavioral_remark: Mapped[str | None] = mapped_column("behavioralRemark", Text)
    result_rating: Mapped[RatingBand | None] = mapped_column("resultRating", pg_enum(RatingBand))
    result_percent: Mapped[str | None] = mapped_column("resultPercent", Text)
    result_remark: Mapped[str | None] = mapped_column("resultRemark", Text)

    total_mark: Mapped[int | None] = mapped_column("totalMark", Integer)
    average_mark: Mapped[float | None] = mapped_column("averageMark", Float)
    status: Mapped[PmeStatus] = mapped_column(pg_enum(PmeStatus), default=PmeStatus.PENDING)
    evaluated_at: Mapped[datetime | None] = mapped_column("evaluatedAt", DateTime)
    # Set when an admin evaluated on the supervisor's behalf (audit only; "Evaluated By" stays the supervisor).
    keyed_in_by_id: Mapped[int | None] = mapped_column("keyedInById", ForeignKey("User.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    training: Mapped[Training] = relationship()
    participation: Mapped[Participation] = relationship(back_populates="pme")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    supervisor: Mapped[User | None] = relationship(foreign_keys=[supervisor_id])
    keyed_in_by: Mapped[User | None] = relationship(foreign_keys=[keyed_in_by_id])


# ---------- E-Learning ----------


class ElearningCategory(Base):
    __tablename__ = "ElearningCategory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = created_at_col()


class ElearningModule(Base):
    __tablename__ = "ElearningModule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    objectives: Mapped[str | None] = mapped_column(Text)  # newline-separated list
    pass_threshold: Mapped[int] = mapped_column("passThreshold", Integer, default=80)
    status: Mapped[ModuleStatus] = mapped_column(pg_enum(ModuleStatus), default=ModuleStatus.DRAFT)
    category_id: Mapped[int | None] = mapped_column("categoryId", ForeignKey("ElearningCategory.id", ondelete="SET NULL"))
    created_by_user_id: Mapped[int | None] = mapped_column("createdByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    published_at: Mapped[datetime | None] = mapped_column("publishedAt", DateTime)
    certificate_background_name: Mapped[str | None] = mapped_column("certificateBackgroundName", Text)
    certificate_background_path: Mapped[str | None] = mapped_column("certificateBackgroundPath", Text)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    category: Mapped[ElearningCategory | None] = relationship()
    created_by: Mapped[User | None] = relationship()
    lessons: Mapped[list["ElearningLesson"]] = relationship(
        back_populates="module", order_by="ElearningLesson.order", passive_deletes=True, cascade="all, delete-orphan"
    )
    assignments: Mapped[list["ElearningAssignment"]] = relationship(back_populates="module", passive_deletes=True, cascade="all, delete-orphan")


class ElearningLesson(Base):
    __tablename__ = "ElearningLesson"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column("moduleId", ForeignKey("ElearningModule.id", ondelete="CASCADE"))
    type: Mapped[LessonType] = mapped_column(pg_enum(LessonType))
    title: Mapped[str] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, default=0)

    # SLIDE
    slide_content: Mapped[str | None] = mapped_column("slideContent", Text)
    slide_file_name: Mapped[str | None] = mapped_column("slideFileName", Text)
    slide_file_path: Mapped[str | None] = mapped_column("slideFilePath", Text)
    slide_file_type: Mapped[str | None] = mapped_column("slideFileType", Text)
    # VIDEO
    video_url: Mapped[str | None] = mapped_column("videoUrl", Text)
    video_description: Mapped[str | None] = mapped_column("videoDescription", Text)
    video_file_name: Mapped[str | None] = mapped_column("videoFileName", Text)
    video_file_path: Mapped[str | None] = mapped_column("videoFilePath", Text)
    # QUIZ settings
    pass_percent: Mapped[int | None] = mapped_column("passPercent", Integer, default=80)
    max_attempts: Mapped[int | None] = mapped_column("maxAttempts", Integer, default=3)
    randomize_questions: Mapped[bool] = mapped_column("randomizeQuestions", Boolean, default=False)
    randomize_options: Mapped[bool] = mapped_column("randomizeOptions", Boolean, default=False)
    show_correct_answers: Mapped[bool] = mapped_column("showCorrectAnswers", Boolean, default=True)
    show_explanation: Mapped[bool] = mapped_column("showExplanation", Boolean, default=True)
    time_limit_minutes: Mapped[int | None] = mapped_column("timeLimitMinutes", Integer)

    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    module: Mapped[ElearningModule] = relationship(back_populates="lessons")
    questions: Mapped[list["ElearningQuestion"]] = relationship(
        back_populates="lesson", order_by="ElearningQuestion.order", passive_deletes=True, cascade="all, delete-orphan"
    )


class ElearningQuestion(Base):
    __tablename__ = "ElearningQuestion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column("lessonId", ForeignKey("ElearningLesson.id", ondelete="CASCADE"))
    type: Mapped[QuestionType] = mapped_column(pg_enum(QuestionType))
    question: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    marks: Mapped[int] = mapped_column(Integer, default=1)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    lesson: Mapped[ElearningLesson] = relationship(back_populates="questions")
    options: Mapped[list["ElearningOption"]] = relationship(
        back_populates="question", order_by="ElearningOption.order", passive_deletes=True, cascade="all, delete-orphan"
    )


class ElearningOption(Base):
    __tablename__ = "ElearningOption"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column("questionId", ForeignKey("ElearningQuestion.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column("isCorrect", Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped[ElearningQuestion] = relationship(back_populates="options")


class ElearningAssignment(Base):
    __tablename__ = "ElearningAssignment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column("moduleId", ForeignKey("ElearningModule.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    assigned_by_user_id: Mapped[int | None] = mapped_column("assignedByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    start_date: Mapped[datetime | None] = mapped_column("startDate", DateTime)
    due_date: Mapped[datetime | None] = mapped_column("dueDate", DateTime)
    mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = created_at_col()

    module: Mapped[ElearningModule] = relationship(back_populates="assignments")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    assigned_by: Mapped[User | None] = relationship(foreign_keys=[assigned_by_user_id])


class ElearningLessonProgress(Base):
    __tablename__ = "ElearningLessonProgress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column("lessonId", ForeignKey("ElearningLesson.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column("completedAt", DateTime)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()


class ElearningQuizAttempt(Base):
    __tablename__ = "ElearningQuizAttempt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column("lessonId", ForeignKey("ElearningLesson.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    attempt_no: Mapped[int] = mapped_column("attemptNo", Integer)
    score: Mapped[float] = mapped_column(Float)  # percent, 0-100
    passed: Mapped[bool] = mapped_column(Boolean)
    answers: Mapped[str] = mapped_column(Text)  # JSON: { questionId: [selected option ids] }
    submitted_at: Mapped[datetime] = mapped_column("submittedAt", DateTime, server_default=func.now(), default=utcnow)


class ElearningCompletion(Base):
    __tablename__ = "ElearningCompletion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column("moduleId", ForeignKey("ElearningModule.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    final_score: Mapped[float | None] = mapped_column("finalScore", Float)
    completed_at: Mapped[datetime] = mapped_column("completedAt", DateTime, server_default=func.now(), default=utcnow)

    certificate: Mapped["ElearningCertificate | None"] = relationship(back_populates="completion", passive_deletes=True, cascade="all, delete-orphan")


class ElearningCertificate(Base):
    __tablename__ = "ElearningCertificate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    certificate_no: Mapped[str] = mapped_column("certificateNo", Text, unique=True)
    completion_id: Mapped[int] = mapped_column("completionId", ForeignKey("ElearningCompletion.id", ondelete="CASCADE"), unique=True)
    module_id: Mapped[int] = mapped_column("moduleId", ForeignKey("ElearningModule.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    score: Mapped[float] = mapped_column(Float)
    issued_at: Mapped[datetime] = mapped_column("issuedAt", DateTime, server_default=func.now(), default=utcnow)

    completion: Mapped[ElearningCompletion] = relationship(back_populates="certificate")
    module: Mapped[ElearningModule] = relationship()
    user: Mapped[User] = relationship()


# ---------- TNA (Training Need Analysis) ----------


class Tna(Base):
    __tablename__ = "Tna"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    year: Mapped[int] = mapped_column(Integer)
    status: Mapped[TnaStatus] = mapped_column(pg_enum(TnaStatus), default=TnaStatus.PENDING)
    approved_at: Mapped[datetime | None] = mapped_column("approvedAt", DateTime)
    approved_by_user_id: Mapped[int | None] = mapped_column("approvedByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    approved_by: Mapped[User | None] = relationship(foreign_keys=[approved_by_user_id])
    items: Mapped[list["TnaItem"]] = relationship(
        back_populates="tna", order_by="TnaItem.order", passive_deletes=True, cascade="all, delete-orphan"
    )


class TnaItem(Base):
    __tablename__ = "TnaItem"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tna_id: Mapped[int] = mapped_column("tnaId", ForeignKey("Tna.id", ondelete="CASCADE"))
    section: Mapped[TnaSection] = mapped_column(pg_enum(TnaSection))
    order: Mapped[int] = mapped_column(Integer, default=0)
    problem_statement: Mapped[str] = mapped_column("problemStatement", Text)
    training: Mapped[str] = mapped_column(Text)
    target_skill: Mapped[int] = mapped_column("targetSkill", Integer)
    current_skill: Mapped[int] = mapped_column("currentSkill", Integer)
    training_type: Mapped[TnaTrainingType] = mapped_column("trainingType", pg_enum(TnaTrainingType))
    month_apply: Mapped[str] = mapped_column("monthApply", Text)
    created_at: Mapped[datetime] = created_at_col()

    tna: Mapped[Tna] = relationship(back_populates="items")


class TnaTrainingOption(Base):
    """Admin-managed catalogue of selectable trainings per TNA section."""

    __tablename__ = "TnaTrainingOption"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section: Mapped[TnaSection] = mapped_column(pg_enum(TnaSection))
    group_name: Mapped[str | None] = mapped_column("groupName", Text)
    label: Mapped[str] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = created_at_col()


# ---------- Staff Training Requisition ----------


class TrainingRequisition(Base):
    __tablename__ = "TrainingRequisition"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))
    title: Mapped[str] = mapped_column(Text)
    training_date: Mapped[datetime] = mapped_column("trainingDate", DateTime)
    training_end_date: Mapped[datetime | None] = mapped_column("trainingEndDate", DateTime)
    start_time: Mapped[str] = mapped_column("startTime", Text)
    end_time: Mapped[str] = mapped_column("endTime", Text)
    venue: Mapped[str] = mapped_column(Text)
    objective: Mapped[str] = mapped_column(Text)
    fees: Mapped[float] = mapped_column(Float)
    hrdc_claimable: Mapped[bool] = mapped_column("hrdcClaimable", Boolean, default=False)
    # Whether this training is under the department's Annual Training Plan (ATP).
    under_atp: Mapped[bool] = mapped_column("underAtp", Boolean, default=False)
    remarks: Mapped[str | None] = mapped_column(Text)
    training_provider: Mapped[str] = mapped_column("trainingProvider", Text)
    brochure_file_name: Mapped[str | None] = mapped_column("brochureFileName", Text)
    brochure_file_path: Mapped[str | None] = mapped_column("brochureFilePath", Text)
    status: Mapped[RequisitionStatus] = mapped_column(pg_enum(RequisitionStatus), default=RequisitionStatus.PENDING)
    grant_id: Mapped[str | None] = mapped_column("grantId", Text)
    reviewed_by_user_id: Mapped[int | None] = mapped_column("reviewedByUserId", ForeignKey("User.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column("reviewedAt", DateTime)
    review_remarks: Mapped[str | None] = mapped_column("reviewRemarks", Text)
    created_at: Mapped[datetime] = created_at_col()
    updated_at: Mapped[datetime] = updated_at_col()

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
    participants: Mapped[list["RequisitionParticipant"]] = relationship(
        back_populates="requisition", passive_deletes=True, cascade="all, delete-orphan"
    )


class RequisitionParticipant(Base):
    __tablename__ = "RequisitionParticipant"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requisition_id: Mapped[int] = mapped_column("requisitionId", ForeignKey("TrainingRequisition.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("User.id"))

    requisition: Mapped[TrainingRequisition] = relationship(back_populates="participants")
    user: Mapped[User] = relationship()
