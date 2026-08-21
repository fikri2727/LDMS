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
  const module_ = await prisma.elearningModule.findUnique({ where: { id: Number(id) } });
  if (!module_ || !module_.certificateBackgroundPath || !module_.certificateBackgroundName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(uploadFullPath(module_.certificateBackgroundPath));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": guessMimeType(module_.certificateBackgroundName),
      "Content-Disposition": `inline; filename="${module_.certificateBackgroundName}"`,
    },
  });
}
