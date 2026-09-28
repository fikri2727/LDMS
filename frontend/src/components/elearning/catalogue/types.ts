import type { LearnerModuleStatus } from "@/components/elearning/catalogue/StatusBadge";

export interface LearningModuleCardData {
  id: number;
  title: string;
  description: string | null;
  objectives: string[];
  category: string;
  lessonCount: number;
  estimatedHours: number;
  status: LearnerModuleStatus;
  percent: number;
  score: number | null;
  dueDate: string | null;
  completedAt: string | null;
  owner: string | null;
  certificateId: number | null;
}
