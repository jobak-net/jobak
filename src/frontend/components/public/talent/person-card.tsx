import { Globe, MapPin } from "lucide-react";

import { GitHubIcon, LinkedInIcon } from "@/frontend/components/shared/brand-icons";
import type { TalentCard } from "@/shared/contracts/talent";

const WORKPLACE_LABEL: Record<string, string> = {
  remote: "Remote",
  "on-site": "On-site",
  hybrid: "Hybrid",
};

/** One person's card in the talent directory: only what they chose to show. */
export function PersonCard({ person }: { person: TalentCard }) {
  const name = person.displayName || "Jobak member";

  return (
    <article className="flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/6 border border-border-standard flex items-center justify-center text-base font-bold text-muted-foreground shrink-0">
          {name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-snug truncate">{name}</h2>
          {person.headline && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{person.headline}</p>
          )}
        </div>
      </div>

      {person.bio && (
        <p className="text-sm text-muted-foreground mt-4 line-clamp-3 leading-relaxed">{person.bio}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
        {person.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            {person.location}
          </span>
        )}
        {person.experienceYears !== null && person.experienceYears > 0 && (
          <span>{person.experienceYears} yrs</span>
        )}
        {person.seniority && <span className="capitalize">{person.seniority}</span>}
      </div>

      {person.openTo && person.openTo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {person.openTo.map((mode) => (
            <span
              key={mode}
              className="px-2 py-0.5 rounded-md text-[11px] border border-accent/20 bg-accent/8 text-accent-text"
            >
              {WORKPLACE_LABEL[mode] ?? mode}
            </span>
          ))}
        </div>
      )}

      {person.skills && person.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {person.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md text-[11px] border border-border-standard text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-5">
        {person.linkedinUrl && (
          <SocialLink href={person.linkedinUrl} label={`${name} on LinkedIn`} icon={LinkedInIcon} primary />
        )}
        {person.githubUrl && (
          <SocialLink href={person.githubUrl} label={`${name} on GitHub`} icon={GitHubIcon} />
        )}
        {person.websiteUrl && (
          <SocialLink href={person.websiteUrl} label={`${name}'s website`} icon={Globe} />
        )}
      </div>
    </article>
  );
}

function SocialLink({
  href,
  label,
  icon: Icon,
  primary,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      /*
       * `nofollow ugc` because these are user-supplied links on a public page.
       * Without it the directory becomes a place worth spamming for the SEO
       * value of the outbound link.
       */
      rel="noopener noreferrer nofollow ugc"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
        primary
          ? "border-accent/30 bg-accent/8 text-accent-text hover:bg-accent/15"
          : "border-border-standard text-muted-foreground hover:text-foreground hover:border-foreground/30"
      }`}
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
