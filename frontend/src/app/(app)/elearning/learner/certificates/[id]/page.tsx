import { format } from "date-fns";
import { requireSession } from "@/lib/guard";
import { api } from "@/lib/api";
import type { ElearningCertificate, ElearningModule, StaffOption } from "@/lib/db-types";
import { CertificateView } from "@/components/elearning/CertificateView";
import { CertificateBackLink } from "@/components/elearning/CertificateBackLink";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  // Own certificate, or any certificate for an e-learning admin.
  const certificate = await api.get<ElearningCertificate & { module: ElearningModule; user: StaffOption }>(
    `/api/elearning/learner/certificates/${Number(id)}`,
    undefined,
    { on403: "/elearning/learner" }
  );

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
