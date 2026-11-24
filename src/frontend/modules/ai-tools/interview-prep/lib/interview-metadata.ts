/**
 * What the interviewer agent is told about this interview: sent as the
 * agent's dispatch metadata, which Agent Builder reads as JSON and offers to
 * its instructions as {{metadata.<key>}}. The keys must match
 * `METADATA_KEYS` in interviewer-instructions.ts.
 */

export interface InterviewDetails {
    role: string;
    company: string;
    jobDescription: string;
}

export const INTERVIEW_LIMITS = { role: 120, company: 120, jobDescription: 4000, name: 80 } as const;

const cap = (value: string, limit: number) => value.trim().slice(0, limit);

/** All three fields have text. */
export function canStart(details: InterviewDetails): boolean {
    return details.role.trim() !== "" && details.company.trim() !== "" && details.jobDescription.trim() !== "";
}

export function buildAgentMetadata(details: InterviewDetails, candidateName: string | null): string {
    return JSON.stringify({
        role: cap(details.role, INTERVIEW_LIMITS.role),
        company: cap(details.company, INTERVIEW_LIMITS.company),
        job_description: cap(details.jobDescription, INTERVIEW_LIMITS.jobDescription),
        candidate_name: cap(candidateName ?? "", INTERVIEW_LIMITS.name) || "the candidate",
    });
}
