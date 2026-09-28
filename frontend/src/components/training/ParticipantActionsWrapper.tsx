"use client";

import { ParticipantActions } from "@/components/training/ParticipantActions";

export function ParticipantActionsWrapper({
  trainingId,
  participationId,
  attendance,
  onRemove,
  onMarkAbsent,
}: {
  trainingId: number;
  participationId: number;
  attendance: string;
  onRemove: (trainingId: number, participationId: number) => Promise<void>;
  onMarkAbsent: (trainingId: number, participationId: number) => Promise<void>;
}) {
  return (
    <ParticipantActions
      canManage
      showMarkAbsent={attendance === "PENDING"}
      onRemove={() => onRemove(trainingId, participationId)}
      onMarkAbsent={() => onMarkAbsent(trainingId, participationId)}
    />
  );
}
