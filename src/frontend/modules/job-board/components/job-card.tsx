import Link from "next/link";
import { Banknote, Clock, MapPin, Wifi } from "lucide-react";

import type { PublicJobCard } from "@/shared/contracts/job-board";

import { formatPostedAt } from "../lib/format-posted-at";

/** One listing on the board, linking to its own page. */
export function JobCard({ job }: { job: PublicJobCard }) {
  return (
    <Link
        href={`/jobs/${job.slug}`}
      className="group flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2 hover:border-foreground/30 transition-all"
    >
      <h2 className="text-base font-semibold leading-snug group-hover:text-accent-text transition-colors">
        {job.title}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{job.company}</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
        {/*
          Guarded because `jobs.location` held the literal string
          "[object Object]" for the sources that publish a structured
          location — see db/supabase/013_repair_job_data.sql. Repaired rows are
          blank, and a blank location should render as nothing at all.
        */}
        {job.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[14rem]">{job.location}</span>
          </span>
        )}
        {job.workplace === "remote" && (
          <span className="inline-flex items-center gap-1.5 text-accent-text">
            <Wifi className="w-3 h-3 shrink-0" />
            Remote
          </span>
        )}
        {job.workplace === "hybrid" && <span>Hybrid</span>}
        {job.salary && (
          <span className="inline-flex items-center gap-1.5">
            <Banknote className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[10rem]">{job.salary}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto pt-4 text-xs text-muted-foreground/70">
        <Clock className="w-3 h-3 shrink-0" />
        {formatPostedAt(job.postedAt)}
        {job.source && <span className="ml-auto truncate">{job.source}</span>}
      </div>
    </Link>
  );
}
