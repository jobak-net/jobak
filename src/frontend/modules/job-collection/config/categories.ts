import type { CategoryId } from "../types/catalogue";

/** The catalogue's groups, in the order the page shows them (the spec's catalogue headings). */
export const CATEGORIES: readonly { id: CategoryId; label: string }[] = [
    { id: "mena", label: "Egypt & the Middle East" },
    { id: "worldwide", label: "Worldwide job boards" },
    { id: "remote", label: "Remote work and startups" },
    { id: "freelance", label: "Freelance projects" },
    { id: "career-sites", label: "Company career sites" },
    { id: "south-asia", label: "South Asia" },
    { id: "southeast-asia", label: "Southeast Asia and the Pacific" },
    { id: "europe", label: "Europe" },
    { id: "latin-america", label: "Latin America" },
];
