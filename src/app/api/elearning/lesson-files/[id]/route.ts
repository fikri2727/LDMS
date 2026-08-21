import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { uploadFullPath, guessMimeType } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind");

  const lesson = await prisma.elearningLesson.findUnique({ where: { id: Number(id) } });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = kind === "video" ? lesson.videoFilePath : lesson.slideFilePath;
  const fileName = kind === "video" ? lesson.videoFileName : lesson.slideFileName;
  if (!filePath || !fileName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mimeType = kind === "video" ? guessMimeType(fileName) : (lesson.slideFileType ?? guessMimeType(fileName));

  const buffer = await readFile(uploadFullPath(filePath));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
