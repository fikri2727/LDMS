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
  const requisition = await prisma.trainingRequisition.findUnique({ where: { id: Number(id) } });
  if (!requisition || !requisition.brochureFilePath || !requisition.brochureFileName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(uploadFullPath(requisition.brochureFilePath));
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": guessMimeType(requisition.brochureFileName),
      "Content-Disposition": `attachment; filename="${requisition.brochureFileName}"`,
    },
  });
}
