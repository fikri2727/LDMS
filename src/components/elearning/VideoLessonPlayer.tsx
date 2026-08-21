"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/elearning/VideoPlayer";
import { LessonNav } from "@/components/elearning/LessonNav";

export function VideoLessonPlayer({
  url,
  fileUrl,
  description,
  lessonId,
  moduleId,
  completed,
  prevHref,
  nextHref,
}: {
  url: string;
  fileUrl: string | null;
  description: string | null;
  lessonId: number;
  moduleId: number;
  completed: boolean;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const [watchedToEnd, setWatchedToEnd] = useState(false);

  return (
    <div>
      <VideoPlayer url={url} fileUrl={fileUrl} onEnded={() => setWatchedToEnd(true)} />
      {description && <p className="text-sm text-gray-600 mt-3">{description}</p>}
      <div className="mt-6">
        <LessonNav
          lessonId={lessonId}
          moduleId={moduleId}
          completed={completed}
          prevHref={prevHref}
          nextHref={nextHref}
          disabled={!watchedToEnd}
          disabledReason={!watchedToEnd ? "Watch the video to the end before marking this lesson complete." : undefined}
        />
      </div>
    </div>
  );
}
