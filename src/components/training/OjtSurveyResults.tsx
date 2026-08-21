export interface OjtSurveyAnswers {
  q1: string | null;
  q2: number | null;
  q3: number | null;
}

export function OjtSurveyResults({ answers }: { answers: OjtSurveyAnswers }) {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-sm font-medium text-text-secondary mb-1">What have you learned from this OJT?</p>
        <p className="text-sm text-text-secondary">{answers.q1 || "—"}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-text-secondary mb-1">Self-rated skill level BEFORE this OJT</p>
        <p className="text-sm text-text-secondary">{answers.q2 ?? "—"}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-text-secondary mb-1">Self-rated skill level AFTER this OJT</p>
        <p className="text-sm text-text-secondary">{answers.q3 ?? "—"}</p>
      </div>
    </div>
  );
}
