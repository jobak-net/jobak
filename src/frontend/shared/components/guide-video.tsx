"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Play } from "lucide-react";

import { cn } from "@/frontend/shared/lib";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * A short how-to video, for a `LockedFeature`'s `guide` (or anywhere a
 * feature needs a "here's how" next to its form).
 *
 * - `collapsed`: starts as one row ("Watch the setup, 1:59") that opens the
 *   player, so a long setup card stays short; nothing is downloaded until
 *   it's opened.
 * - `chapters`: buttons under the player that jump to each part, e.g. one
 *   per step of the form beside it.
 * - Captions when given (off by default, since the video is narrated), and a
 *   `fallback` when there's no video or it can't be played.
 */
export function GuideVideo({
    title,
    src,
    poster,
    captionsSrc,
    duration,
    chapters,
    collapsed = false,
    fallback,
}: {
    /** What it shows: "Watch the setup". */
    title: string;
    /** The video file, e.g. "/guides/livekit-setup.mp4"; leave empty while it isn't made yet. */
    src?: string;
    poster?: string;
    /** A WebVTT file with the narration as captions. */
    captionsSrc?: string;
    /** Shown next to the title, e.g. "1:59". */
    duration?: string;
    /** Parts to jump to, with their start in seconds. */
    chapters?: { label: string; start: number }[];
    /** Start closed, as a row that opens the player. */
    collapsed?: boolean;
    /** Shown instead of the video when there's none or it fails to load. */
    fallback?: ReactNode;
}) {
    const id = useId();
    const video = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(!collapsed);
    const [failed, setFailed] = useState(false);
    const playable = Boolean(src) && !failed;

    function jump(start: number) {
        const el = video.current;
        if (!el) return;
        el.currentTime = start;
        void el.play().catch(() => {
            /* autoplay refused: the player's own button still works */
        });
    }

    return (
        <div className="overflow-hidden rounded-card border border-border-subtle bg-white/2">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls={`${id}-player`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-white/2 focus-visible:bg-white/3"
            >
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/14 text-accent-text">
                    <Play className="ml-0.5 size-3.5 fill-current" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-fg-primary">
                    {title}
                    {duration && playable && <span className="ml-2 font-normal tabular-nums text-fg-quaternary">{duration}</span>}
                </span>
                <ChevronDown
                    aria-hidden="true"
                    className={cn("size-4 text-fg-tertiary transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")}
                />
            </button>

            {open && (
                <div id={`${id}-player`} className="border-t border-border-subtle p-3">
                    {playable ? (
                        <>
                            <video
                                ref={video}
                                controls
                                playsInline
                                preload="metadata"
                                poster={poster}
                                onError={() => setFailed(true)}
                                className="aspect-video w-full rounded-control bg-black"
                            >
                                <source src={src} onError={() => setFailed(true)} />
                                {/* Off by default (the video is narrated, and captions would cover the screen it shows); the player's CC button turns them on. */}
                                {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" />}
                            </video>
                            {chapters && chapters.length > 0 && (
                                <div role="group" aria-label="Jump to" className="mt-3 flex flex-wrap gap-2">
                                    {chapters.map((chapter) => (
                                        <button
                                            key={chapter.label}
                                            type="button"
                                            onClick={() => jump(chapter.start)}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-[12px] text-fg-secondary outline-none hover:border-border-standard hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-accent/60"
                                        >
                                            <span className="tabular-nums text-fg-quaternary">{clock(chapter.start)}</span>
                                            {chapter.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        fallback && <div className="p-2">{fallback}</div>
                    )}
                </div>
            )}
        </div>
    );
}
