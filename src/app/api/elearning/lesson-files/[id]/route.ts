import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageElearning } from "@/lib/rbac";
import { readUpload, guessMimeType } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind");

  const lesson = await prisma.elearningLesson.findUnique({
    where: { id: Number(id) },
    include: { module: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mirror the module player's own gate — a learner can't reach a lesson page
  // for an unpublished module, so the raw file shouldn't be reachable either.
  if (lesson.module.status !== "PUBLISHED" && !canManageElearning(session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = kind === "video" ? lesson.videoFilePath : lesson.slideFilePath;
  const fileName = kind === "video" ? lesson.videoFileName : lesson.slideFileName;
  if (!filePath || !fileName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mimeType = kind === "video" ? guessMimeType(fileName) : (lesson.slideFileType ?? guessMimeType(fileName));

  const buffer = await readUpload(filePath);
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
