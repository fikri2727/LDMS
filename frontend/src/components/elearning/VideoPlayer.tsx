"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: { events: { onStateChange: (e: { data: number }) => void } }
      ) => unknown;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: {
      Player: new (el: HTMLElement) => { on: (event: string, cb: () => void) => void };
    };
  }
}

function getEmbedUrl(url: string): { type: "youtube" | "vimeo" | "file"; src: string } {
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (youtubeMatch) {
    return { type: "youtube", src: `https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1` };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };

  return { type: "file", src: url };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if ((existing as HTMLScriptElement).dataset.loaded === "true") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    document.head.appendChild(script);
  });
}

export function VideoPlayer({
  url,
  fileUrl,
  onEnded,
}: {
  url: string;
  fileUrl?: string | null;
  onEnded?: () => void;
}) {
  const embed = fileUrl ? { type: "file" as const, src: fileUrl } : getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!onEnded || embed.type === "file") return;
    const handleEnded = onEnded;
    let cancelled = false;

    if (embed.type === "youtube") {
      loadScript("https://www.youtube.com/iframe_api").then(() => {
        function create() {
          if (cancelled || !iframeRef.current || !window.YT) return;
          new window.YT.Player(iframeRef.current, {
            events: {
              onStateChange: (e) => {
                if (e.data === window.YT!.PlayerState.ENDED) handleEnded();
              },
            },
          });
        }
        if (window.YT?.Player) {
          create();
        } else {
          window.onYouTubeIframeAPIReady = create;
        }
      });
    } else if (embed.type === "vimeo") {
      loadScript("https://player.vimeo.com/api/player.js").then(() => {
        if (cancelled || !iframeRef.current || !window.Vimeo) return;
        const player = new window.Vimeo.Player(iframeRef.current);
        player.on("ended", () => handleEnded());
      });
    }

    return () => {
      cancelled = true;
    };
  }, [embed.type, onEnded]);

  if (embed.type === "file") {
    return (
      <video controls className="w-full rounded-lg bg-black aspect-video" onEnded={onEnded}>
        <source src={embed.src} />
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={embed.src}
      className="w-full aspect-video rounded-lg"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
