export const DESIGNATION_LABELS: Record<string, string> = {
  EXECUTIVE: "Executive",
  MANAGER: "Manager",
  NON_EXECUTIVE: "Non-Executive",
  CONTRACT: "Contract",
  TRAINEE: "Trainee",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  CLERK: "Clerk",
  STAFF: "Staff",
  CREATOR: "Creator",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  RESIGN: "Resigned",
};

export const PROGRAM_LABELS: Record<string, string> = {
  EXT: "Public (External)",
  INTX: "Inhouse (External Trainer)",
  INTI: "Inhouse (Internal Trainer)",
};

export const PLATFORM_LABELS: Record<string, string> = {
  PHYSICAL: "Physical",
  ONLINE: "Online",
};

export const FUNCTION_LABELS: Record<string, string> = {
  BUSINESS: "Business",
  DIGITAL: "Digital",
  LEADERSHIP: "Leadership",
  PERSONAL_EFFECTIVENESS: "Personal Effectiveness",
};

export const TRAINER_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  ABSENT: "Absent",
};

export const PME_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Evaluation",
  VERIFIED: "Verified",
};

export const RATING_BAND_LABELS: Record<string, string> = {
  EXCELLENT: "> 90 % : Excellent - Excellent understanding of the topics learned and can explain to others",
  VERY_GOOD: "80 % - 89 % : Very Good - Very good understanding and can explain to others",
  GOOD: "70 % - 79 % : Good - Good understanding and can explain to others",
  SATISFACTORY: "60 % - 69 % : Satisfactory - Can understand most of the topics learned",
  FAIR: "50 % - 59 % : Fair - Understand only some of the topics learned",
  POOR: "< 50 % : Poor - Very weak understanding and requires further explanation",
};

/** Valid percent range [min, max] for each rating band — enforced when the evaluator specifies the exact criteria. */
export const RATING_BAND_RANGES: Record<string, [number, number]> = {
  EXCELLENT: [91, 100],
  VERY_GOOD: [80, 89],
  GOOD: [70, 79],
  SATISFACTORY: [60, 69],
  FAIR: [50, 59],
  POOR: [0, 49],
};

/** Short form for compact summary displays. */
export const RATING_BAND_SHORT_LABELS: Record<string, string> = {
  EXCELLENT: "Excellent (>90%)",
  VERY_GOOD: "Very Good (80-89%)",
  GOOD: "Good (70-79%)",
  SATISFACTORY: "Satisfactory (60-69%)",
  FAIR: "Fair (50-59%)",
  POOR: "Poor (<50%)",
};

/** PME-eligible designations — matches the legacy app's Executive/Manager-only PME rule. */
export const PME_ELIGIBLE_DESIGNATIONS = ["EXECUTIVE", "MANAGER"];

export const MODULE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REVIEW: "Review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const LESSON_TYPE_LABELS: Record<string, string> = {
  SLIDE: "Slide",
  VIDEO: "Video",
  QUIZ: "Quiz",
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  MULTIPLE_ANSWER: "Multiple Answer",
};

export const TNA_STATUS_LABELS: Record<string, string> = {
  NOT_SUBMITTED: "Not Submitted",
  PENDING: "Waiting for Approval",
  APPROVED: "TNA Approved",
};

export const REQUISITION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
