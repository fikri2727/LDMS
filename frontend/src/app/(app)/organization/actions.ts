"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

// ---------- Division ----------

export async function createDivision(formData: FormData) {
  await api.post("/api/org/divisions", formData);
  revalidatePath("/organization");
}

export async function updateDivision(id: number, formData: FormData) {
  await api.post(`/api/org/divisions/${id}`, formData);
  revalidatePath("/organization");
}

export async function deleteDivision(id: number) {
  await api.del(`/api/org/divisions/${id}`);
  revalidatePath("/organization");
}

// ---------- Department ----------

export async function createDepartment(divisionId: number, formData: FormData) {
  await api.post(`/api/org/divisions/${divisionId}/departments`, formData);
  revalidatePath("/organization");
}

export async function updateDepartment(id: number, formData: FormData) {
  await api.post(`/api/org/departments/${id}`, formData);
  revalidatePath("/organization");
}

export async function deleteDepartment(id: number) {
  await api.del(`/api/org/departments/${id}`);
  revalidatePath("/organization");
}

export async function assignHod(departmentId: number, formData: FormData) {
  await api.post(`/api/org/departments/${departmentId}/hod`, formData);
  revalidatePath("/organization");
  revalidatePath("/staff");
}

// ---------- Section ----------

export async function createSection(departmentId: number, formData: FormData) {
  await api.post(`/api/org/departments/${departmentId}/sections`, formData);
  revalidatePath("/organization");
}

export async function updateSection(id: number, formData: FormData) {
  await api.post(`/api/org/sections/${id}`, formData);
  revalidatePath("/organization");
}

export async function deleteSection(id: number) {
  await api.del(`/api/org/sections/${id}`);
  revalidatePath("/organization");
}
