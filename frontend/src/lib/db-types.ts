/**
 * Database enum and model types, formerly imported from the generated Prisma
 * client. The Python backend returns data in this same shape.
 */

export type RoleType = "ADMIN" | "CLERK" | "STAFF" | "CREATOR";
export type Gender = "MALE" | "FEMALE";
export type Designation = "EXECUTIVE" | "MANAGER" | "NON_EXECUTIVE" | "CONTRACT" | "TRAINEE";
export type StaffStatus = "ACTIVE" | "RESIGN";
export type TrainingProgram = "EXT" | "INTX" | "INTI";
export type Platform = "PHYSICAL" | "ONLINE";
export type TrainingFunction = "BUSINESS" | "DIGITAL" | "LEADERSHIP" | "PERSONAL_EFFECTIVENESS";
export type AttendanceStatus = "PENDING" | "COMPLETED" | "ABSENT";
export type TrainerType = "INTERNAL" | "EXTERNAL";
export type PmeStatus = "PENDING" | "VERIFIED";
export type RatingBand = "EXCELLENT" | "VERY_GOOD" | "GOOD" | "SATISFACTORY" | "FAIR" | "POOR";
export type ModuleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type LessonType = "SLIDE" | "VIDEO" | "QUIZ";
export type QuestionType = "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_ANSWER";
export type TnaSection = "ESG" | "SELF" | "LEAD" | "DATA" | "FUNCTIONAL" | "BUSINESS" | "SPECIAL";
export type TnaTrainingType = "OJT" | "COACHING" | "EXTERNAL";
export type TnaStatus = "PENDING" | "APPROVED";
export type RequisitionStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

export interface User {
  id: number;
  staffNo: string;
  passwordIsDefault: boolean;
  staffName: string;
  email: string | null;
  gender: Gender;
  designation: Designation;
  nationality: string | null;
  divisionId: number | null;
  departmentId: number | null;
  sectionId: number | null;
  status: StaffStatus;
  dateResign: Date | null;
  hodId: number | null;
  isHod: boolean;
  roleType: RoleType;
  supervisorId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Division {
  id: number;
  name: string;
  shortName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: number;
  divisionId: number;
  name: string;
  shortName: string | null;
  hodUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: number;
  departmentId: number;
  name: string;
  shortName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipateOjt {
  id: number;
  ojtId: number;
  userId: number;
  attendance: AttendanceStatus;
  q1: string | null;
  q2: number | null;
  q3: number | null;
  totalMan: number;
  department: string | null;
  clerkId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Training {
  id: number;
  trainingCode: string;
  title: string;
  program: TrainingProgram;
  cost: number;
  platform: Platform;
  function: TrainingFunction;
  venue: string;
  hrdcClaimable: boolean;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  trainer: string;
  createdByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participation {
  id: number;
  trainingId: number;
  userId: number;
  attendance: AttendanceStatus;
  courseRelevance: number | null;
  practicalExercises: number | null;
  sufficientTime: number | null;
  trainerEffectiveness: number | null;
  courseEffectiveness: number | null;
  whatLearnt: string | null;
  actionPlan: string | null;
  commentSuggestions: string | null;
  keyedInById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: number;
  trainingId: number;
  fileName: string;
  filePath: string;
  uploadedByUserId: number | null;
  uploadedAt: Date;
}

export interface Ojt {
  id: number;
  trainingCode: string;
  title: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  venue: string;
  trainerType: TrainerType;
  trainerName: string;
  totalDay: number;
  totalHour: number;
  totalMan: number;
  createdByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pme {
  id: number;
  trainingId: number;
  participationId: number;
  userId: number;
  supervisorId: number | null;
  designation: Designation;
  staffName: string;
  staffNo: string;
  department: string;
  trainingTitle: string;
  fromDate: Date | null;
  toDate: Date | null;
  ojtConducted: boolean | null;
  ojtDetails: string | null;
  levelRating: RatingBand | null;
  levelPercent: string | null;
  levelRemark: string | null;
  levelRating2: RatingBand | null;
  levelPercent2: string | null;
  levelRemark2: string | null;
  behavioralRating: RatingBand | null;
  behavioralPercent: string | null;
  behavioralRemark: string | null;
  resultRating: RatingBand | null;
  resultPercent: string | null;
  resultRemark: string | null;
  totalMark: number | null;
  averageMark: number | null;
  status: PmeStatus;
  evaluatedAt: Date | null;
  keyedInById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElearningCategory {
  id: number;
  name: string;
  createdAt: Date;
}

export interface ElearningModule {
  id: number;
  title: string;
  description: string | null;
  objectives: string | null;
  passThreshold: number;
  status: ModuleStatus;
  categoryId: number | null;
  createdByUserId: number | null;
  publishedAt: Date | null;
  certificateBackgroundName: string | null;
  certificateBackgroundPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElearningLesson {
  id: number;
  moduleId: number;
  type: LessonType;
  title: string;
  order: number;
  slideContent: string | null;
  slideFileName: string | null;
  slideFilePath: string | null;
  slideFileType: string | null;
  videoUrl: string | null;
  videoDescription: string | null;
  videoFileName: string | null;
  videoFilePath: string | null;
  passPercent: number | null;
  maxAttempts: number | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showCorrectAnswers: boolean;
  showExplanation: boolean;
  timeLimitMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElearningQuestion {
  id: number;
  lessonId: number;
  type: QuestionType;
  question: string;
  explanation: string | null;
  marks: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElearningOption {
  id: number;
  questionId: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface ElearningAssignment {
  id: number;
  moduleId: number;
  userId: number;
  assignedByUserId: number | null;
  startDate: Date | null;
  dueDate: Date | null;
  mandatory: boolean;
  createdAt: Date;
}

export interface ElearningLessonProgress {
  id: number;
  lessonId: number;
  userId: number;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElearningQuizAttempt {
  id: number;
  lessonId: number;
  userId: number;
  attemptNo: number;
  score: number;
  passed: boolean;
  answers: string;
  submittedAt: Date;
}

export interface ElearningCompletion {
  id: number;
  moduleId: number;
  userId: number;
  finalScore: number | null;
  completedAt: Date;
}

export interface ElearningCertificate {
  id: number;
  certificateNo: string;
  completionId: number;
  moduleId: number;
  userId: number;
  score: number;
  issuedAt: Date;
}

export interface Tna {
  id: number;
  userId: number;
  year: number;
  status: TnaStatus;
  approvedAt: Date | null;
  approvedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TnaItem {
  id: number;
  tnaId: number;
  section: TnaSection;
  order: number;
  problemStatement: string;
  training: string;
  targetSkill: number;
  currentSkill: number;
  trainingType: TnaTrainingType;
  monthApply: string;
  createdAt: Date;
}

export interface TnaTrainingOption {
  id: number;
  section: TnaSection;
  groupName: string | null;
  label: string;
  order: number;
  createdAt: Date;
}

export interface TrainingRequisition {
  id: number;
  userId: number;
  title: string;
  trainingDate: Date;
  trainingEndDate: Date | null;
  startTime: string;
  endTime: string;
  venue: string;
  objective: string;
  fees: number;
  hrdcClaimable: boolean;
  underAtp: boolean;
  remarks: string | null;
  trainingProvider: string;
  brochureFileName: string | null;
  brochureFilePath: string | null;
  status: RequisitionStatus;
  grantId: string | null;
  reviewedByUserId: number | null;
  reviewedAt: Date | null;
  reviewRemarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequisitionParticipant {
  id: number;
  requisitionId: number;
  userId: number;
}

/** A staff picker option. */
export type StaffOption = Pick<User, "id" | "staffNo" | "staffName">;

/** Division -> departments -> sections, as used by the org page and staff forms. */
export type DivisionTree = Division & { departments: (Department & { sections: Section[] })[] };
