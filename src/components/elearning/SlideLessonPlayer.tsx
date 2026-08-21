"use client";

import { useState } from "react";
import { SlideContent } from "@/components/elearning/SlideContent";
import { LessonNav } from "@/components/elearning/LessonNav";

export function SlideLessonPlayer({
  content,
  fileUrl,
  fileType,
  fileName,
  lessonId,
  moduleId,
  completed,
  prevHref,
  nextHref,
}: {
  content: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  lessonId: number;
  moduleId: number;
  completed: boolean;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const isPdf = fileType === "application/pdf";
  const [viewedAllSlides, setViewedAllSlides] = useState(!isPdf);

  return (
    <div>
      <SlideContent
        content={content}
        fileUrl={fileUrl}
        fileType={fileType}
        fileName={fileName}
        onReachLastPage={isPdf ? () => setViewedAllSlides(true) : undefined}
      />
      <div className="mt-6">
        <LessonNav
          lessonId={lessonId}
          moduleId={moduleId}
          completed={completed}
          prevHref={prevHref}
          nextHref={nextHref}
          disabled={!viewedAllSlides}
          disabledReason={!viewedAllSlides ? "Go through all the slides before marking this lesson complete." : undefined}
        />
      </div>
    </div>
  );
}
