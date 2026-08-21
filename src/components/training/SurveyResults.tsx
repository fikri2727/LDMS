const RATING_QUESTIONS: { name: string; en: string; bm: string }[] = [
  { name: "courseRelevance", en: "Course Relevance and Usefulness", bm: "Kursus Berkaitan & Berguna" },
  { name: "practicalExercises", en: "Practical, Discussion & Exercises", bm: "Amali, Perbincangan & Latihan" },
  { name: "sufficientTime", en: "Sufficient Time Spent on Course Topic", bm: "Masa yang mencukupi untuk kursus" },
  { name: "trainerEffectiveness", en: "Overall Effectiveness of Course Trainer", bm: "Keberkesanan Keseluruhan Jurulatih" },
  { name: "courseEffectiveness", en: "Overall Effectiveness of Course", bm: "Keberkesanan Keseluruhan Kursus" },
];

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export interface SurveyAnswers {
  courseRelevance: number | null;
  practicalExercises: number | null;
  sufficientTime: number | null;
  trainerEffectiveness: number | null;
  courseEffectiveness: number | null;
  whatLearnt: string | null;
  actionPlan: string | null;
  commentSuggestions: string | null;
}

export function SurveyResults({ answers }: { answers: SurveyAnswers }) {
  return (
    <div className="max-w-2xl">
      {RATING_QUESTIONS.map((q) => {
        const score = answers[q.name as keyof SurveyAnswers] as number | null;
        return (
          <div key={q.name} className="py-4 border-b border-border last:border-0">
            <p className="text-sm text-text-primary">
              <span className="uppercase tracking-wide">{q.en}</span>{" "}
              <span className="italic text-text-muted">/ ({q.bm})</span>
            </p>
            <p className="mt-1.5 text-sm">
              {score ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary-dark font-medium px-2.5 py-0.5">
                  {score} — {RATING_LABELS[score]}
                </span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </p>
          </div>
        );
      })}

      <div className="py-4 border-b border-border">
        <p className="text-sm text-text-primary">Identify What You Have Learnt From The Course</p>
        <p className="italic text-sm text-text-muted mb-1.5">
          Kenalpasti perkara yang telah anda pelajari dalam kursus ini
        </p>
        <p className="text-sm text-text-secondary">{answers.whatLearnt || "—"}</p>
      </div>

      <div className="py-4 border-b border-border">
        <p className="text-sm text-text-primary">
          Explain Your Personal Actions Plans On How To Apply What You Have Learnt On The Job
        </p>
        <p className="italic text-sm text-text-muted mb-1.5">
          Terangkan bagaimana anda akan mengaplikasikan perkara yang telah anda pelajari dalam tugas anda.
        </p>
        <p className="text-sm text-text-secondary">{answers.actionPlan || "—"}</p>
      </div>

      <div className="py-4">
        <p className="text-sm text-text-primary">Comment &amp; Suggestions (if any)</p>
        <p className="italic text-sm text-text-muted mb-1.5">Komen dan cadangan (jika ada)</p>
        <p className="text-sm text-text-secondary">{answers.commentSuggestions || "—"}</p>
      </div>
    </div>
  );
}
