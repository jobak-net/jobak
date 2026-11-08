import { ArrowUpRight } from "lucide-react";

import { GitHubIcon } from "@/frontend/components/shared/brand-icons";
import { Button } from "@/frontend/components/ui";
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "@/frontend/lib/configs/site";

/**
 * An invitation to developers to contribute to the open-source repo.
 *
 * Flat, not a card: it is a side note on whatever page it sits on, not the
 * page's purpose. Links go to the repository and its issues rather than to a
 * "good first issue" label, which may not exist.
 */
export function Contribute({ title = "Built in the open" }: { title?: string }) {
    return (
        <section>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">
                <GitHubIcon className="size-4 text-fg-secondary" />
                {title}
            </h2>
            <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-fg-tertiary">
                Jobak is open source. If you&apos;re a developer, you can help build it: fix a bug, add a job source, or
                improve the matching.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
                <Button variant="secondary" size="sm" asChild>
                    <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                        <GitHubIcon className="size-4" />
                        View on GitHub
                    </a>
                </Button>
                <a
                    href={GITHUB_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary"
                >
                    Open issues
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
            </div>
        </section>
    );
}
