export type TnaSectionKey = "ESG" | "SELF" | "LEAD" | "DATA" | "FUNCTIONAL" | "BUSINESS" | "SPECIAL";

export const TNA_SECTIONS: { key: TnaSectionKey; label: string }[] = [
  { key: "ESG", label: "a. ESG (Environment-Social-Governance)" },
  { key: "SELF", label: "b. Soft Skills (Based on individual development competencies i.e, communication)" },
  {
    key: "LEAD",
    label:
      "c. Leadership Awareness (This area will inculcate the nurturing aspect of the talent hence inspiring others towards achieving excellence)",
  },
  { key: "DATA", label: "d. Data Driven" },
  {
    key: "FUNCTIONAL",
    label:
      "e. Functional Awareness (Based on job requirement in terms of knowledge and skills required to perform the duties; technical skills or knowledge) - Critical Priorities & Future Growth",
  },
  {
    key: "BUSINESS",
    label: "f. Digital Transformation & Innovation (Based on company digital objective and expansion requirement for future growth)",
  },
  { key: "SPECIAL", label: "g. Special Project (Short term project either functional or cross - functional)" },
];

export interface TnaOptionGroup {
  group: string;
  options: string[];
}

export interface TnaTrainingOptionRow {
  section: TnaSectionKey;
  groupName: string | null;
  label: string;
  order: number;
}

/**
 * Builds the section -> training-course dropdown shape (flat list, or grouped
 * into optgroups) from the admin-managed TnaTrainingOption rows in the DB.
 */
export function buildTrainingOptionsMap(
  rows: TnaTrainingOptionRow[]
): Record<TnaSectionKey, string[] | TnaOptionGroup[]> {
  const bySection = new Map<TnaSectionKey, TnaTrainingOptionRow[]>();
  for (const s of TNA_SECTIONS) bySection.set(s.key, []);
  for (const r of rows) bySection.get(r.section)?.push(r);

  const result = {} as Record<TnaSectionKey, string[] | TnaOptionGroup[]>;
  for (const s of TNA_SECTIONS) {
    const items = [...(bySection.get(s.key) ?? [])].sort((a, b) => a.order - b.order);
    const hasGroups = items.some((i) => i.groupName);
    if (!hasGroups) {
      result[s.key] = items.map((i) => i.label);
    } else {
      const groups: TnaOptionGroup[] = [];
      const byGroup = new Map<string, string[]>();
      for (const i of items) {
        const g = i.groupName ?? "OTHER";
        if (!byGroup.has(g)) {
          byGroup.set(g, []);
          groups.push({ group: g, options: byGroup.get(g)! });
        }
        byGroup.get(g)!.push(i.label);
      }
      result[s.key] = groups;
    }
  }
  return result;
}

export function isGrouped(options: string[] | TnaOptionGroup[]): options is TnaOptionGroup[] {
  return options.length > 0 && typeof options[0] === "object";
}

export const TNA_SKILL_LEVELS: { value: number; label: string; description: string }[] = [
  { value: 1, label: "1 - Fundamental Awareness", description: "Basic knowledge" },
  { value: 2, label: "2 - Novice", description: "Little experience or competence in the skill" },
  { value: 3, label: "3 - Intermediate", description: "Has some competence but remains below level required" },
  { value: 4, label: "4 - Proficient", description: "Competent and confident in the area" },
  { value: 5, label: "5 - Expert", description: "An expert in that skill" },
];

export const TNA_TRAINING_TYPE_LABELS: Record<string, string> = {
  OJT: "1 - On Job Training",
  COACHING: "2 - Coaching",
  EXTERNAL: "3 - External / In-house",
};

export const TNA_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const TNA_MAX_TASKS_PER_SECTION = 3;

export const TNA_SECTION_SHORT_LABELS: Record<TnaSectionKey, string> = {
  ESG: "ESG",
  SELF: "Soft Skill",
  LEAD: "Leadership Awareness",
  DATA: "Data Driven",
  FUNCTIONAL: "Functional Awareness",
  BUSINESS: "Digital Transformation",
  SPECIAL: "Special Project",
};

export const TNA_SECTION_COLORS: Record<TnaSectionKey, string> = {
  ESG: "#46BEA2",
  SELF: "#6D3ECD",
  LEAD: "#8A8D94",
  DATA: "#46BEA2",
  FUNCTIONAL: "#6D3ECD",
  BUSINESS: "#8A8D94",
  SPECIAL: "#46BEA2",
};

export const TNA_TRAINING_TYPE_SHORT_LABELS: Record<string, string> = {
  EXTERNAL: "External/In-House",
  COACHING: "Coaching",
  OJT: "On Job Training",
};

export const TNA_TRAINING_TYPE_COLORS: Record<string, string> = {
  EXTERNAL: "#46BEA2",
  COACHING: "#6D3ECD",
  OJT: "#8A8D94",
};

export interface TnaRowState {
  problem: string;
  training: string;
  trainingOther: string;
  target: number;
  current: number;
  type: string;
  month: string;
}

export type TnaFormState = Record<TnaSectionKey, TnaRowState[]>;

export function emptyTnaFormState(): TnaFormState {
  const state = {} as TnaFormState;
  for (const s of TNA_SECTIONS) state[s.key] = [];
  return state;
}

export function defaultTnaRow(): TnaRowState {
  return { problem: "", training: "", trainingOther: "", target: 3, current: 1, type: "OJT", month: "Jan" };
}

/** A brand-new TNA (no submission yet) starts with one blank task row per section, matching the legacy form. */
export function defaultTnaFormState(): TnaFormState {
  const state = emptyTnaFormState();
  for (const s of TNA_SECTIONS) state[s.key] = [defaultTnaRow()];
  return state;
}
