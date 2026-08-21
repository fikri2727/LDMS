import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CertificateView } from "@/components/elearning/CertificateView";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const certificate = await prisma.elearningCertificate.findUnique({
    where: { id: Number(id) },
    include: { module: true, user: true },
  });

  if (!certificate) notFound();
  if (certificate.userId !== session.userId && !canManageElearning(session)) {
    redirect("/elearning/learner");
  }

  return (
    <div>
      <Link
        href="/elearning/learner"
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 print:hidden"
      >
        <ArrowLeft size={15} /> Back to My Learning
      </Link>
      <CertificateView
        staffName={certificate.user.staffName}
        moduleTitle={certificate.module.title}
        score={certificate.score}
        issuedAt={format(certificate.issuedAt, "d MMMM yyyy")}
        certificateNo={certificate.certificateNo}
        backgroundUrl={
          certificate.module.certificateBackgroundPath
            ? `/api/elearning/certificate-backgrounds/${certificate.module.id}`
            : null
        }
      />
    </div>
  );
}
