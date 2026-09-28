import { NextRequest } from "next/server";
import { proxyFile } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") === "video" ? "video" : "slide";
  return proxyFile(`/api/elearning/lessons/${Number(id)}/file?kind=${kind}`);
}
