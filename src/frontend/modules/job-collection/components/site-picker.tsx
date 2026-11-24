"use client";

import { useId } from "react";
import { Check, ExternalLink, Search } from "lucide-react";

import { Input } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { countryLabel } from "../config/country-codes";
import { groupSites, type SiteGroup } from "../lib/site-selection";
import type { ActorEntry } from "../types/catalogue";

/** "$0.002 per job", plus the start fee when there is one. */
export function priceText(price: { perJobUsd: number; startUsd: number }): string {
    const perJob = price.perJobUsd < 0.001 ? `under $0.001` : `$${Number(price.perJobUsd.toFixed(4))}`;
    return price.startUsd >= 0.001 ? `${perJob} per job + $${Number(price.startUsd.toFixed(3))} start` : `${perJob} per job`;
}

function SiteCard({
    entry,
    price,
    checked,
    covered,
    country,
    disabled,
    onToggle,
}: {
    entry: ActorEntry;
    price: { perJobUsd: number; startUsd: number };
    checked: boolean;
    covered: boolean;
    country: string;
    disabled: boolean;
    onToggle: () => void;
}) {
    return (
        <li>
            <label
                className={cn(
                    "flex h-full items-start gap-3 rounded-card border p-3.5 transition-colors",
                    !covered && "opacity-55",
                    covered && checked ? "border-accent/45 bg-accent/6" : "border-border-standard bg-white/2",
                    covered && !disabled && "cursor-pointer hover:border-border-strong",
                )}
            >
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked && covered}
                    disabled={!covered || disabled}
                    onChange={onToggle}
                />
                <span
                    aria-hidden="true"
                    className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                        checked && covered ? "border-accent bg-accent text-(--bg-canvas)" : "border-border-strong",
                    )}
                >
                    {checked && covered && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-fg-primary">{entry.site}</span>
                        <a
                            href={entry.storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="text-fg-quaternary hover:text-fg-secondary"
                            aria-label={`${entry.site} actor on Apify`}
                        >
                            <ExternalLink className="size-3.5" />
                        </a>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-fg-tertiary">{entry.description}</span>
                    <span className="mt-1.5 block text-[12px] text-fg-secondary">
                        {covered ? priceText(price) : `Doesn't cover ${country ? countryLabel(country) : "this country"}`}
                    </span>
                </span>
            </label>
        </li>
    );
}

function Groups({
    groups,
    covered,
    ...card
}: {
    groups: SiteGroup[];
    covered: boolean;
    picked: string[];
    prices: Record<string, { perJobUsd: number; startUsd: number }>;
    country: string;
    disabled: boolean;
    onToggle: (site: string) => void;
}) {
    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <section key={group.category.id}>
                    <h3 className="mb-2.5 text-[13px] font-medium text-fg-secondary">
                        {group.category.label}
                        {covered && card.country && (
                            <span className="ml-2 font-normal text-accent-text">Covers {countryLabel(card.country)}</span>
                        )}
                    </h3>
                    <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {group.sites.map((entry) => (
                            <SiteCard
                                key={entry.id}
                                entry={entry}
                                price={card.prices[entry.id]}
                                checked={card.picked.includes(entry.id)}
                                covered={covered}
                                country={card.country}
                                disabled={card.disabled}
                                onToggle={() => card.onToggle(entry.id)}
                            />
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

/**
 * The 39 sites by category: the ones that can search the chosen country
 * first, the rest folded under "Other regions", with a filter by name.
 */
export function SitePicker({
    country,
    filter,
    onFilterChange,
    picked,
    onToggle,
    prices,
    disabled,
}: {
    country: string;
    filter: string;
    onFilterChange: (value: string) => void;
    picked: string[];
    onToggle: (site: string) => void;
    /** Live price per site, or the stored fallback. */
    prices: Record<string, { perJobUsd: number; startUsd: number }>;
    disabled: boolean;
}) {
    const id = useId();
    const { covered, other } = groupSites(country, filter);
    const card = { picked, prices, country, disabled, onToggle };

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-[15px] font-semibold text-fg-primary">Sites</h2>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">Pick one or more. Each runs as its own Apify actor.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                    <label htmlFor={`${id}-filter`} className="sr-only">
                        Filter sites
                    </label>
                    <Input
                        id={`${id}-filter`}
                        value={filter}
                        onChange={(event) => onFilterChange(event.target.value)}
                        placeholder="Filter sites"
                        className="pl-9"
                    />
                </div>
            </div>

            {covered.length === 0 && other.length === 0 && <p className="text-[13px] text-fg-tertiary">No site matches &ldquo;{filter}&rdquo;.</p>}
            <Groups groups={covered} covered {...card} />

            {other.length > 0 && (
                <details className="group mt-6 rounded-card border border-border-subtle" open={filter.trim() !== "" || !country}>
                    <summary className="cursor-pointer select-none px-4 py-3 text-[13px] font-medium text-fg-secondary">
                        Other regions ({other.reduce((sum, group) => sum + group.sites.length, 0)} sites)
                    </summary>
                    <div className="px-4 pb-4 pt-1">
                        <Groups groups={other} covered={false} {...card} />
                    </div>
                </details>
            )}
        </div>
    );
}
