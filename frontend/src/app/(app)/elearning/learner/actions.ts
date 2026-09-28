"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export async function markLessonComplete(lessonId: number, moduleId: number) {
  await api.post(`/api/elearning/learner/modules/${moduleId}/lessons/${lessonId}/complete`);
  revalidatePath(`/elearning/learner/modules/${moduleId}`);
  revalidatePath("/elearning/learner");
}

export async function submitQuiz(lessonId: number, moduleId: number, formData: FormData) {
  const result = await api.post<{ score: number; passed: boolean }>(
    `/api/elearning/learner/modules/${moduleId}/quiz/${lessonId}`,
    formData
  );
  revalidatePath(`/elearning/learner/modules/${moduleId}`);
  revalidatePath("/elearning/learner");
  return result;
}
