import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OjtCheckinFlow } from "@/components/checkin/OjtCheckinFlow";

export default async function OjtCheckinPage({ params }: { params: Promise<{ ojtId: string }> }) {
  const { ojtId: raw } = await params;
  const ojtId = Number(raw);
  if (!Number.isInteger(ojtId)) notFound();

  const ojt = await prisma.ojt.findUnique({
    where: { id: ojtId },
    select: { id: true, title: true },
  });
  if (!ojt) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f7] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <OjtCheckinFlow ojtId={ojt.id} ojtTitle={ojt.title} />
      </div>
    </div>
  );
}
