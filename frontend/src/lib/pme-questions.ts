/**
 * The four fixed PME evaluation questions, keyed by the field prefix used on
 * Pme (level/level2/behavioral/result). Shared by the evaluation form and the
 * read-only verified view so a supervisor — or an auditor reviewing a
 * completed PME — sees exactly what was asked, not just the section title.
 *
 * Deliberately its own module with no other imports: @/lib/pme pulls in
 * Prisma (server-only, native bindings), and this file is imported from the
 * client-side PmeEvaluationForm — importing it from @/lib/pme would drag
 * Prisma into the browser bundle and break the build.
 */
export const PME_QUESTIONS = {
  level: {
    number: 1,
    section: "Learning Level",
    question:
      "Evaluate employees Knowledge Sharing Sessions (KSS) and On-the-Job Training (OJT) conducted for their teams after attending training",
  },
  level2: {
    number: 2,
    section: "Learning Level",
    question: "Did the employee learn what he / she is are supposed to learn from the training attended ?",
  },
  behavioral: {
    number: 3,
    section: "Behavioral Change",
    question: "Did the employee apply his / her newly acquired skills and knowledge to his / her jobs ?",
  },
  result: {
    number: 4,
    section: "Result Training Attended",
    question: "Did the training has any measurable business impact ?",
  },
} as const;

export const PME_OJT_QUESTION = "Please confirm whether the On-the-Job Training (OJT) has been conducted.";
