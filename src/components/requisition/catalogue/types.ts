export interface RequisitionCardData {
  id: number;
  title: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
  trainingDate: string;
  trainingEndDate: string | null;
  startTime: string;
  endTime: string;
  venue: string;
  trainingProvider: string;
  objective: string;
  remarks: string | null;
  fees: number;
  hrdcClaimable: boolean;
  underAtp: boolean;
  grantId: string | null;
  brochureFileName: string | null;
  createdAt: string;
  applicantName: string | null;
  applicantNo: string | null;
  department: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  participantCount: number;
}
