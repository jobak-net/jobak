import { countryLabel } from "../country-codes";
import { defineActor, isoCodes, placeText } from "./define";

const INDEED_COUNTRIES = isoCodes([
    "ar", "au", "at", "bh", "be", "br", "ca", "cl", "cn", "co", "cr", "cz", "dk", "ec", "eg", "fi", "fr", "de", "gr", "hk",
    "hu", "in", "id", "ie", "il", "it", "jp", "kw", "lu", "my", "mx", "ma", "nl", "nz", "ng", "no", "om", "pk", "pa", "pe",
    "ph", "pl", "pt", "qa", "ro", "sa", "sg", "za", "kr", "es", "se", "ch", "tw", "th", "tr", "ua", "ae", "uk", "us", "uy",
    "ve", "vn",
]);

/** The Google Jobs actor takes lowercase country names, with its own short forms for these. */
const GOOGLE_COUNTRY_NAMES: Record<string, string> = { US: "usa", GB: "uk", AE: "uae" };

const ZIPRECRUITER: Record<string, string> = {
    US: "",
    CA: "canada",
    GB: "uk",
    AU: "australia",
    IN: "india",
    FR: "france",
    DE: "germany",
    ES: "spain",
    IT: "italy",
    NZ: "new zealand",
    SG: "singapore",
    IL: "israel",
    PH: "philippines",
};

/** Worldwide job boards. */
export const WORLDWIDE_ACTORS = [
    defineActor({
        id: "linkedin",
        site: "LinkedIn",
        actorId: "curious_coder/linkedin-jobs-scraper",
        category: "worldwide",
        description: "LinkedIn's public job search, in any country.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.002, startUsd: 0.00005 },
        buildInput: (search) => ({
            keywords: search.title,
            location: placeText(search),
            limitPerSource: search.jobsPerSite,
            scrapeCompany: false,
        }),
    }),
    defineActor({
        id: "indeed",
        site: "Indeed",
        actorId: "valig/indeed-jobs-scraper",
        category: "worldwide",
        description: "Indeed's local sites in 62 countries.",
        covers: INDEED_COUNTRIES,
        fallbackPrice: { perJobUsd: 0.0001, startUsd: 0.001 },
        buildInput: (search) => ({
            country: search.country === "GB" ? "uk" : search.country.toLowerCase(),
            title: search.title,
            ...(search.city.trim() ? { location: search.city.trim() } : {}),
            limit: search.jobsPerSite,
        }),
    }),
    defineActor({
        id: "glassdoor",
        site: "Glassdoor",
        actorId: "valig/glassdoor-jobs-scraper",
        category: "worldwide",
        description: "Glassdoor jobs, with the company's rating alongside.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.0004, startUsd: 0.001 },
        buildInput: (search) => ({
            keywords: search.title,
            location: placeText(search),
            limit: search.jobsPerSite,
        }),
    }),
    defineActor({
        id: "google-jobs",
        site: "Google Jobs",
        actorId: "orgupdate/google-jobs-scraper",
        category: "worldwide",
        description: "Google's job search, which gathers listings from many boards and company sites.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.005, startUsd: 0.02 },
        pageSize: 10,
        buildInput: (search) => ({
            includeKeyword: search.title,
            countryName: GOOGLE_COUNTRY_NAMES[search.country] ?? countryLabel(search.country).toLowerCase(),
            locationName: (search.city.trim() || countryLabel(search.country)).toLowerCase(),
            pagesToFetch: Math.ceil(search.jobsPerSite / 10),
            datePosted: "all",
        }),
        paths: { title: ["job_title"], company: ["company_name"], url: ["URL"] },
    }),
    defineActor({
        id: "ziprecruiter",
        site: "ZipRecruiter",
        actorId: "silentflow/ziprecruiter-scraper-ppe",
        category: "worldwide",
        description: "ZipRecruiter, mainly the US and Canada, plus its sites in 11 more countries.",
        covers: Object.keys(ZIPRECRUITER),
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.00005 },
        buildInput: (search) => ({
            searches: [search.title],
            // Without a location it finds nothing, so the country stands in for a missing city.
            location: search.city.trim() || countryLabel(search.country),
            countryName: ZIPRECRUITER[search.country] ?? "",
            maxItems: search.jobsPerSite,
            includeDetails: false,
        }),
    }),
];
