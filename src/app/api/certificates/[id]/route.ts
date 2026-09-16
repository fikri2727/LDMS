import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { readUpload } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cert = await prisma.certificate.findUnique({ where: { id: Number(id) } });
  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readUpload(cert.filePath);
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${cert.fileName}"`,
    },
  });
}
