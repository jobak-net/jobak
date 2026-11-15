"use client";

import { useCallback, useState } from "react";
import { Globe2, Search } from "lucide-react";

import { Input } from "@/frontend/components/ui";
import { countries } from "@/frontend/lib/configs/countries";

import type { StepScreenProps } from "../../orchestrator/step-strategy";
import { CountryOption } from "./country-option";
import { OptionCard } from "../../ui/option-card";
import { riseStyle } from "../../ui/rise-style";
import { toggle } from "../../ui/toggle";

const GLOBE_ICON = <Globe2 className="size-5" />;

/** The location step's screen. Draws and reports changes; the rules are in `location-step.ts`. */
export function LocationScreen({ draft, update }: StepScreenProps) {
    const [search, setSearch] = useState("");
    const { worldwide, countries: selected } = draft.location;
    const shown = countries.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

    const toggleWorldwide = useCallback(
        () => update((d) => ({ location: { worldwide: !d.location.worldwide, countries: [] } })),
        [update],
    );
    // Picking a country means not worldwide; the rules clear the remote lock that came with it.
    const toggleCountry = useCallback(
        (code: string) =>
            update((d) => ({
                location: { worldwide: false, countries: toggle(d.location.worldwide ? [] : d.location.countries, code) },
            })),
        [update],
    );

    return (
        <div className="space-y-6">
            <OptionCard
                className="ob-rise"
                style={riseStyle(0)}
                value="worldwide"
                selected={worldwide}
                onSelect={toggleWorldwide}
                icon={GLOBE_ICON}
                title="Anywhere in the world"
                description="Remote jobs only, from employers anywhere. Choose this if you are not tied to a MENA country."
            />

            <div className="ob-rise flex items-center gap-3 text-xs text-fg-tertiary" style={riseStyle(1)}>
                <span className="h-px flex-1 bg-border-subtle" />
                or pick MENA countries
                <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <div>
                <div className="ob-rise relative mb-3" style={riseStyle(2)}>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search countries"
                        aria-label="Search countries"
                        className="pl-9"
                    />
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="MENA countries">
                    {shown.map((country, i) => (
                        <CountryOption
                            key={country.code}
                            code={country.code}
                            name={country.name}
                            selected={!worldwide && selected.includes(country.code)}
                            onToggle={toggleCountry}
                            style={riseStyle(i + 3)}
                        />
                    ))}
                </ul>
                {shown.length === 0 && <p className="text-sm text-fg-tertiary">No MENA country matches “{search}”.</p>}
            </div>
        </div>
    );
}
