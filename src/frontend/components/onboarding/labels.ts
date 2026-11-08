import type { JobType, Seniority, WorkMode } from "@/backend/modules/preferences/domain/job-preferences";

/** How each stored value reads on screen. One place, so the steps and the review agree. */

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    "on-site": "On-site",
};

export const JOB_TYPE_LABEL: Record<JobType, string> = {
    "full-time": "Full-time",
    "part-time": "Part-time",
    contract: "Contract",
    freelance: "Freelance",
};

export const SENIORITY_LABEL: Record<Seniority, string> = {
    entry: "Entry level",
    mid: "Mid level",
    senior: "Senior",
    lead: "Lead or manager",
};
