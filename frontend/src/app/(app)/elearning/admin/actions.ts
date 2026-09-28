"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { LessonType } from "@/lib/db-types";

// ---------- Module ----------

export async function createModule(formData: FormData) {
  const { id } = await api.post<{ id: number }>("/api/elearning/modules", formData);
  revalidatePath("/elearning/admin");
  redirect(`/elearning/admin/modules/${id}`);
}

export async function updateModule(id: number, formData: FormData) {
  await api.post(`/api/elearning/modules/${id}`, formData);
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
  redirect(`/elearning/admin/modules/${id}`);
}

export async function deleteModule(id: number) {
  await api.del(`/api/elearning/modules/${id}`);
  revalidatePath("/elearning/admin");
  redirect("/elearning/admin");
}

export async function publishModule(id: number) {
  await api.post(`/api/elearning/modules/${id}/publish`);
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

export async function unpublishModule(id: number) {
  await api.post(`/api/elearning/modules/${id}/unpublish`);
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

export async function archiveModule(id: number) {
  await api.post(`/api/elearning/modules/${id}/archive`);
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

// ---------- Category ----------

export async function createCategory(formData: FormData) {
  await api.post("/api/elearning/categories", formData);
  revalidatePath("/elearning/admin/modules/new");
}

// ---------- Lessons ----------

export async function createLesson(moduleId: number, type: LessonType, formData: FormData) {
  const { id } = await api.post<{ id: number }>(`/api/elearning/modules/${moduleId}/lessons?type=${type}`, formData);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(
    type === "QUIZ" ? `/elearning/admin/modules/${moduleId}/lessons/${id}/questions` : `/elearning/admin/modules/${moduleId}`
  );
}

export async function updateLesson(id: number, moduleId: number, type: LessonType, formData: FormData) {
  await api.post(`/api/elearning/modules/${moduleId}/lessons/${id}?type=${type}`, formData);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(`/elearning/admin/modules/${moduleId}`);
}

export async function deleteLesson(id: number, moduleId: number) {
  await api.del(`/api/elearning/modules/${moduleId}/lessons/${id}`);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

export async function duplicateLesson(id: number, moduleId: number) {
  await api.post(`/api/elearning/modules/${moduleId}/lessons/${id}/duplicate`);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

export async function reorderLesson(id: number, moduleId: number, direction: "up" | "down") {
  await api.post(`/api/elearning/modules/${moduleId}/lessons/${id}/reorder?direction=${direction}`);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

// ---------- Quiz questions ----------

export async function addQuestion(
  lessonId: number,
  moduleId: number,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const result = await api.post<{ error?: string }>(`/api/elearning/lessons/${lessonId}/questions`, formData);
  if (result.error) return { error: result.error };
  revalidatePath(`/elearning/admin/modules/${moduleId}/lessons/${lessonId}/questions`);
}

export async function deleteQuestion(id: number, lessonId: number, moduleId: number) {
  await api.del(`/api/elearning/questions/${id}`);
  revalidatePath(`/elearning/admin/modules/${moduleId}/lessons/${lessonId}/questions`);
}

// ---------- Assignment ----------

export async function assignModule(moduleId: number, formData: FormData) {
  await api.post(`/api/elearning/modules/${moduleId}/assign`, formData);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(`/elearning/admin/modules/${moduleId}`);
}

export async function removeAssignment(id: number, moduleId: number) {
  await api.del(`/api/elearning/assignments/${id}`);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}
