"use client";

import { OjtParticipantActions } from "@/components/training/OjtParticipantActions";

export function OjtParticipantActionsWrapper({
  ojtId,
  participationId,
  onRemove,
}: {
  ojtId: number;
  participationId: number;
  onRemove: (ojtId: number, participationId: number) => Promise<void>;
}) {
  return <OjtParticipantActions onRemove={() => onRemove(ojtId, participationId)} />;
}
