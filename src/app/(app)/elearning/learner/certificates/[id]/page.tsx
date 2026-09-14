import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CertificateView } from "@/components/elearning/CertificateView";
import { CertificateBackLink } from "@/components/elearning/CertificateBackLink";

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
      <CertificateBackLink />
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
