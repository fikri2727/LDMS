import { NextRequest } from "next/server";
import { proxyFile } from "@/lib/api";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFile(`/api/elearning/modules/${Number(id)}/certificate-background`);
}
