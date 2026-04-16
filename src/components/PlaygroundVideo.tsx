import { useCallback, useEffect, useRef, useState } from 'react';

type PlaygroundVideoProps = {
  src: string;
  title: string;
  description: string;
  poster?: string;
  /** MIME type for the `<source>` element (default video/mp4). */
  mimeType?: string;
};

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—:—';
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export function PlaygroundVideo({
  src,
  title,
  description,
  poster,
  mimeType = 'video/mp4',
}: PlaygroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);

  const captureDuration = useCallback(() => {
    const el = videoRef.current;
    const d = el?.duration;
    if (el && Number.isFinite(d) && d > 0) {
      setDurationLabel(formatDuration(d));
    }
  }, []);

  useEffect(() => {
    setDurationLabel(null);
  }, [src]);

  return (
    <article className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:shadow-slate-900/50">
      <div className="aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          controls
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={title}
          onLoadedMetadata={captureDuration}
          onDurationChange={captureDuration}
        >
          <source src={src} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="border-t border-slate-100 p-5 sm:p-6 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h3 className="min-w-0 flex-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <div
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums text-slate-500 dark:text-slate-400"
            title={durationLabel ? `Duration ${durationLabel}` : 'Loading duration'}
          >
            <ClockIcon className="h-4 w-4 shrink-0 opacity-80" />
            <span className={durationLabel ? '' : 'animate-pulse'}>{durationLabel ?? '…'}</span>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </article>
  );
}
