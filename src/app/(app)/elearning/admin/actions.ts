"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { saveUpload, deleteUpload, saveSlideFile } from "@/lib/uploads";
import type { LessonType, QuestionType } from "@/generated/prisma/client";

async function requireElearningAdmin() {
  const session = await requireSession();
  if (!canManageElearning(session)) {
    throw new Error("You do not have permission to manage e-learning modules.");
  }
  return session;
}

// ---------- Module ----------

export async function createModule(formData: FormData) {
  const session = await requireElearningAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const categoryIdRaw = String(formData.get("categoryId") ?? "");
  const passThreshold = Number(formData.get("passThreshold")) || 80;

  let certificateBackground: { certificateBackgroundName: string; certificateBackgroundPath: string } | null = null;
  const bgFile = formData.get("certificateBackground") as File | null;
  if (bgFile && bgFile.size > 0) {
    const filePath = await saveUpload("certificate-backgrounds", bgFile);
    certificateBackground = { certificateBackgroundName: bgFile.name, certificateBackgroundPath: filePath };
  }

  const module_ = await prisma.elearningModule.create({
    data: {
      title,
      categoryId: categoryIdRaw ? Number(categoryIdRaw) : null,
      description: String(formData.get("description") ?? "").trim() || null,
      objectives: String(formData.get("objectives") ?? "").trim() || null,
      passThreshold,
      createdByUserId: session.userId,
      ...certificateBackground,
    },
  });

  revalidatePath("/elearning/admin");
  redirect(`/elearning/admin/modules/${module_.id}`);
}

export async function updateModule(id: number, formData: FormData) {
  await requireElearningAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const categoryIdRaw = String(formData.get("categoryId") ?? "");
  const passThreshold = Number(formData.get("passThreshold")) || 80;

  const existing = await prisma.elearningModule.findUniqueOrThrow({ where: { id } });

  let certificateBackgroundUpdate:
    | { certificateBackgroundName: string | null; certificateBackgroundPath: string | null }
    | undefined;
  const bgFile = formData.get("certificateBackground") as File | null;
  const removeBackground = formData.get("removeCertificateBackground") === "on";
  if (bgFile && bgFile.size > 0) {
    if (existing.certificateBackgroundPath) await deleteUpload(existing.certificateBackgroundPath);
    const filePath = await saveUpload("certificate-backgrounds", bgFile);
    certificateBackgroundUpdate = { certificateBackgroundName: bgFile.name, certificateBackgroundPath: filePath };
  } else if (removeBackground && existing.certificateBackgroundPath) {
    await deleteUpload(existing.certificateBackgroundPath);
    certificateBackgroundUpdate = { certificateBackgroundName: null, certificateBackgroundPath: null };
  }

  await prisma.elearningModule.update({
    where: { id },
    data: {
      title,
      categoryId: categoryIdRaw ? Number(categoryIdRaw) : null,
      description: String(formData.get("description") ?? "").trim() || null,
      objectives: String(formData.get("objectives") ?? "").trim() || null,
      passThreshold,
      ...certificateBackgroundUpdate,
    },
  });

  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
  redirect(`/elearning/admin/modules/${id}`);
}

export async function deleteModule(id: number) {
  await requireElearningAdmin();
  const module_ = await prisma.elearningModule.delete({ where: { id } });
  if (module_.certificateBackgroundPath) await deleteUpload(module_.certificateBackgroundPath);
  revalidatePath("/elearning/admin");
  redirect("/elearning/admin");
}

export async function publishModule(id: number) {
  await requireElearningAdmin();
  const lessonCount = await prisma.elearningLesson.count({ where: { moduleId: id } });
  if (lessonCount === 0) {
    throw new Error("Add at least one lesson before publishing.");
  }
  await prisma.elearningModule.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

export async function unpublishModule(id: number) {
  await requireElearningAdmin();
  await prisma.elearningModule.update({ where: { id }, data: { status: "DRAFT" } });
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

export async function archiveModule(id: number) {
  await requireElearningAdmin();
  await prisma.elearningModule.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/elearning/admin");
  revalidatePath(`/elearning/admin/modules/${id}`);
}

// ---------- Category ----------

export async function createCategory(formData: FormData) {
  await requireElearningAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Category name is required.");
  await prisma.elearningCategory.create({ data: { name } });
  revalidatePath("/elearning/admin/modules/new");
}

// ---------- Lessons ----------

export async function createLesson(moduleId: number, type: LessonType, formData: FormData) {
  await requireElearningAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Lesson title is required.");

  const maxOrder = await prisma.elearningLesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  let slideFile: { slideFileName: string; slideFilePath: string; slideFileType: string } | null = null;
  if (type === "SLIDE") {
    const file = formData.get("slideFile") as File | null;
    if (file && file.size > 0) {
      slideFile = await saveSlideFile(file);
    }
  }

  let videoFile: { videoFileName: string; videoFilePath: string } | null = null;
  const videoUrl = type === "VIDEO" ? String(formData.get("videoUrl") ?? "").trim() : "";
  if (type === "VIDEO") {
    const file = formData.get("videoFile") as File | null;
    if (file && file.size > 0) {
      const filePath = await saveUpload("elearning-videos", file);
      videoFile = { videoFileName: file.name, videoFilePath: filePath };
    }
    if (!videoUrl && !videoFile) {
      throw new Error("Provide a video URL or upload a video file.");
    }
  }

  const lesson = await prisma.elearningLesson.create({
    data: {
      moduleId,
      type,
      title,
      order: (maxOrder._max.order ?? 0) + 1,
      slideContent: type === "SLIDE" ? String(formData.get("slideContent") ?? "").trim() || null : null,
      ...slideFile,
      videoUrl: type === "VIDEO" ? videoUrl || null : null,
      videoDescription: type === "VIDEO" ? String(formData.get("videoDescription") ?? "").trim() || null : null,
      ...videoFile,
      ...(type === "QUIZ"
        ? {
            passPercent: Number(formData.get("passPercent")) || 80,
            maxAttempts: Number(formData.get("maxAttempts")) || 3,
            randomizeQuestions: formData.get("randomizeQuestions") === "on",
            randomizeOptions: formData.get("randomizeOptions") === "on",
            showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
            showExplanation: formData.get("showExplanation") === "on",
            timeLimitMinutes: formData.get("timeLimitMinutes") ? Number(formData.get("timeLimitMinutes")) : null,
          }
        : {}),
    },
  });

  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(
    type === "QUIZ"
      ? `/elearning/admin/modules/${moduleId}/lessons/${lesson.id}/questions`
      : `/elearning/admin/modules/${moduleId}`
  );
}

export async function updateLesson(id: number, moduleId: number, type: LessonType, formData: FormData) {
  await requireElearningAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Lesson title is required.");

  const existing = await prisma.elearningLesson.findUniqueOrThrow({ where: { id } });

  let slideFileUpdate: { slideFileName: string | null; slideFilePath: string | null; slideFileType: string | null } | undefined;
  if (type === "SLIDE") {
    const file = formData.get("slideFile") as File | null;
    const removeFile = formData.get("removeSlideFile") === "on";
    if (file && file.size > 0) {
      if (existing.slideFilePath) await deleteUpload(existing.slideFilePath);
      slideFileUpdate = await saveSlideFile(file);
    } else if (removeFile && existing.slideFilePath) {
      await deleteUpload(existing.slideFilePath);
      slideFileUpdate = { slideFileName: null, slideFilePath: null, slideFileType: null };
    }
  }

  let videoFileUpdate: { videoFileName: string | null; videoFilePath: string | null } | undefined;
  const videoUrl = type === "VIDEO" ? String(formData.get("videoUrl") ?? "").trim() : "";
  if (type === "VIDEO") {
    const file = formData.get("videoFile") as File | null;
    const removeFile = formData.get("removeVideoFile") === "on";
    if (file && file.size > 0) {
      if (existing.videoFilePath) await deleteUpload(existing.videoFilePath);
      const filePath = await saveUpload("elearning-videos", file);
      videoFileUpdate = { videoFileName: file.name, videoFilePath: filePath };
    } else if (removeFile && existing.videoFilePath) {
      await deleteUpload(existing.videoFilePath);
      videoFileUpdate = { videoFileName: null, videoFilePath: null };
    }

    const willHaveFile = videoFileUpdate ? !!videoFileUpdate.videoFilePath : !!existing.videoFilePath;
    if (!videoUrl && !willHaveFile) {
      throw new Error("Provide a video URL or upload a video file.");
    }
  }

  await prisma.elearningLesson.update({
    where: { id },
    data: {
      title,
      slideContent: type === "SLIDE" ? String(formData.get("slideContent") ?? "").trim() || null : undefined,
      ...slideFileUpdate,
      videoUrl: type === "VIDEO" ? videoUrl || null : undefined,
      videoDescription:
        type === "VIDEO" ? String(formData.get("videoDescription") ?? "").trim() || null : undefined,
      ...videoFileUpdate,
      ...(type === "QUIZ"
        ? {
            passPercent: Number(formData.get("passPercent")) || 80,
            maxAttempts: Number(formData.get("maxAttempts")) || 3,
            randomizeQuestions: formData.get("randomizeQuestions") === "on",
            randomizeOptions: formData.get("randomizeOptions") === "on",
            showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
            showExplanation: formData.get("showExplanation") === "on",
            timeLimitMinutes: formData.get("timeLimitMinutes") ? Number(formData.get("timeLimitMinutes")) : null,
          }
        : {}),
    },
  });

  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(`/elearning/admin/modules/${moduleId}`);
}

export async function deleteLesson(id: number, moduleId: number) {
  await requireElearningAdmin();
  const lesson = await prisma.elearningLesson.delete({ where: { id } });
  if (lesson.slideFilePath) await deleteUpload(lesson.slideFilePath);
  if (lesson.videoFilePath) await deleteUpload(lesson.videoFilePath);
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

export async function duplicateLesson(id: number, moduleId: number) {
  await requireElearningAdmin();
  const lesson = await prisma.elearningLesson.findUniqueOrThrow({
    where: { id },
    include: { questions: { include: { options: true } } },
  });

  const maxOrder = await prisma.elearningLesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  await prisma.elearningLesson.create({
    data: {
      moduleId,
      type: lesson.type,
      title: `${lesson.title} (Copy)`,
      order: (maxOrder._max.order ?? 0) + 1,
      slideContent: lesson.slideContent,
      videoUrl: lesson.videoUrl,
      videoDescription: lesson.videoDescription,
      passPercent: lesson.passPercent,
      maxAttempts: lesson.maxAttempts,
      randomizeQuestions: lesson.randomizeQuestions,
      randomizeOptions: lesson.randomizeOptions,
      showCorrectAnswers: lesson.showCorrectAnswers,
      showExplanation: lesson.showExplanation,
      timeLimitMinutes: lesson.timeLimitMinutes,
      questions: {
        create: lesson.questions.map((q) => ({
          type: q.type,
          question: q.question,
          explanation: q.explanation,
          marks: q.marks,
          order: q.order,
          options: {
            create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })),
          },
        })),
      },
    },
  });

  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

export async function reorderLesson(id: number, moduleId: number, direction: "up" | "down") {
  await requireElearningAdmin();

  const lessons = await prisma.elearningLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });
  const index = lessons.findIndex((l) => l.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= lessons.length) return;

  const a = lessons[index];
  const b = lessons[swapIndex];

  await prisma.$transaction([
    prisma.elearningLesson.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.elearningLesson.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}

// ---------- Quiz questions ----------

export async function addQuestion(lessonId: number, moduleId: number, formData: FormData) {
  await requireElearningAdmin();

  const type = String(formData.get("type") ?? "SINGLE_CHOICE") as QuestionType;
  const question = String(formData.get("question") ?? "").trim();
  if (!question) throw new Error("Question text is required.");

  const marks = Number(formData.get("marks")) || 1;
  const explanation = String(formData.get("explanation") ?? "").trim() || null;

  const maxOrder = await prisma.elearningQuestion.aggregate({
    where: { lessonId },
    _max: { order: true },
  });

  let options: { text: string; isCorrect: boolean; order: number }[];

  if (type === "TRUE_FALSE") {
    const correct = String(formData.get("trueFalseAnswer") ?? "true");
    options = [
      { text: "True", isCorrect: correct === "true", order: 0 },
      { text: "False", isCorrect: correct === "false", order: 1 },
    ];
  } else {
    const texts = formData.getAll("optionText").map((v) => String(v).trim());
    const correctIndexes = new Set(formData.getAll("correctOption").map((v) => Number(v)));
    options = texts
      .map((text, i) => ({ text, isCorrect: correctIndexes.has(i), order: i }))
      .filter((o) => o.text.length > 0);

    if (options.length < 2) throw new Error("Provide at least two answer options.");
    if (!options.some((o) => o.isCorrect)) throw new Error("Mark at least one option as correct.");
  }

  await prisma.elearningQuestion.create({
    data: {
      lessonId,
      type,
      question,
      explanation,
      marks,
      order: (maxOrder._max.order ?? 0) + 1,
      options: { create: options },
    },
  });

  revalidatePath(`/elearning/admin/modules/${moduleId}/lessons/${lessonId}/questions`);
}

export async function deleteQuestion(id: number, lessonId: number, moduleId: number) {
  await requireElearningAdmin();
  await prisma.elearningQuestion.delete({ where: { id } });
  revalidatePath(`/elearning/admin/modules/${moduleId}/lessons/${lessonId}/questions`);
}

// ---------- Assignment ----------

export async function assignModule(moduleId: number, formData: FormData) {
  const session = await requireElearningAdmin();

  const target = String(formData.get("target") ?? "individual");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? "");
  const mandatory = formData.get("mandatory") === "on";

  let userIds: number[] = [];

  if (target === "individual") {
    userIds = formData.getAll("userIds").map((v) => Number(v));
  } else if (target === "department") {
    const departmentId = Number(formData.get("departmentId"));
    const users = await prisma.user.findMany({ where: { departmentId, status: "ACTIVE" }, select: { id: true } });
    userIds = users.map((u) => u.id);
  } else if (target === "all") {
    const users = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    userIds = users.map((u) => u.id);
  }

  if (userIds.length === 0) throw new Error("Select at least one learner.");

  await prisma.$transaction(
    userIds.map((userId) =>
      prisma.elearningAssignment.upsert({
        where: { moduleId_userId: { moduleId, userId } },
        update: {
          dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          mandatory,
        },
        create: {
          moduleId,
          userId,
          assignedByUserId: session.userId,
          dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          mandatory,
        },
      })
    )
  );

  revalidatePath(`/elearning/admin/modules/${moduleId}`);
  redirect(`/elearning/admin/modules/${moduleId}`);
}

export async function removeAssignment(id: number, moduleId: number) {
  await requireElearningAdmin();
  await prisma.elearningAssignment.delete({ where: { id } });
  revalidatePath(`/elearning/admin/modules/${moduleId}`);
}
