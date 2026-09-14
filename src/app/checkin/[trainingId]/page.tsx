import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckinFlow } from "@/components/checkin/CheckinFlow";

export default async function CheckinPage({ params }: { params: Promise<{ trainingId: string }> }) {
  const { trainingId: raw } = await params;
  const trainingId = Number(raw);
  if (!Number.isInteger(trainingId)) notFound();

  const training = await prisma.training.findUnique({
    where: { id: trainingId },
    select: { id: true, title: true },
  });
  if (!training) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f7] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8">
        <CheckinFlow trainingId={training.id} trainingTitle={training.title} />
      </div>
    </div>
  );
}
