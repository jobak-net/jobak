import type { Job } from "@/frontend/types/dashboard";

/**
 * Sample data for the dashboard while its features are being built.
 *
 * Everything here is invented. It exists so each page can show what it will
 * look like before the backend behind it exists, and every page that renders
 * from it says so on screen. When a feature goes live, delete its export here
 * and the compiler will point at every place that still reads it.
 */

/** Shown on Overview and Matches until a user's own preferences produce jobs. */
export const SAMPLE_JOBS: Job[] = [
    {
        id: "sample-1",
        title: "Senior Frontend Engineer",
        company: "Talabat",
        location: "Dubai, UAE",
        type: "full-time",
        workplace: "hybrid",
        salary: "AED 28k–35k / mo",
        score: 94,
        source: "LinkedIn",
        link: "#",
        postedAt: "2h ago",
        bookmarked: true,
        tags: ["React", "TypeScript", "Next.js"],
        matchReasons: ["5 of 6 required skills match your profile", "Seniority matches your experience"],
    },
    {
        id: "sample-2",
        title: "React Developer",
        company: "Instabug",
        location: "Cairo, Egypt",
        type: "full-time",
        workplace: "onsite",
        salary: "EGP 60k–85k / mo",
        score: 91,
        source: "Wuzzuf",
        link: "#",
        postedAt: "5h ago",
        bookmarked: false,
        tags: ["React", "Redux", "Jest"],
        matchReasons: ["Strong overlap with your React experience"],
    },
    {
        id: "sample-3",
        title: "Full-Stack Engineer",
        company: "Tabby",
        location: "Remote · MENA",
        type: "full-time",
        workplace: "remote",
        salary: "$4k–6k / mo",
        score: 87,
        source: "Bayt",
        link: "#",
        postedAt: "1d ago",
        bookmarked: true,
        tags: ["Node.js", "React", "PostgreSQL"],
        matchReasons: ["Remote, as you prefer", "Backend skills are a partial match"],
    },
    {
        id: "sample-4",
        title: "UI Engineer",
        company: "Careem",
        location: "Riyadh, KSA",
        type: "contract",
        workplace: "hybrid",
        salary: "SAR 22k–28k / mo",
        score: 78,
        source: "Talent.com",
        link: "#",
        postedAt: "1d ago",
        bookmarked: false,
        tags: ["Design systems", "CSS", "Accessibility"],
        matchReasons: ["Design-system work fits your portfolio"],
    },
    {
        id: "sample-5",
        title: "Frontend Developer",
        company: "Vezeeta",
        location: "Cairo, Egypt",
        type: "full-time",
        workplace: "hybrid",
        salary: "EGP 45k–60k / mo",
        score: 72,
        source: "Wuzzuf",
        link: "#",
        postedAt: "2d ago",
        bookmarked: false,
        tags: ["Vue", "JavaScript"],
        matchReasons: ["Framework differs from your main stack"],
    },
    {
        id: "sample-6",
        title: "Web Engineer",
        company: "Anghami",
        location: "Abu Dhabi, UAE",
        type: "full-time",
        workplace: "onsite",
        salary: "Not listed",
        score: 64,
        source: "Company site",
        link: "#",
        postedAt: "3d ago",
        bookmarked: false,
        tags: ["JavaScript", "Performance"],
    },
    {
        id: "sample-7",
        title: "Junior Frontend Developer",
        company: "Swvl",
        location: "Remote",
        type: "part-time",
        workplace: "remote",
        salary: "$1.5k–2k / mo",
        score: null,
        source: "Remote OK",
        link: "#",
        postedAt: "4d ago",
        bookmarked: false,
        tags: ["HTML", "CSS", "React"],
    },
];

/** New matches per day, last 14 days. */
export const MATCH_ACTIVITY: { day: string; matches: number; strong: number }[] = [
    { day: "Mon", matches: 12, strong: 3 },
    { day: "Tue", matches: 18, strong: 5 },
    { day: "Wed", matches: 9, strong: 2 },
    { day: "Thu", matches: 22, strong: 7 },
    { day: "Fri", matches: 15, strong: 4 },
    { day: "Sat", matches: 6, strong: 1 },
    { day: "Sun", matches: 8, strong: 2 },
    { day: "Mon", matches: 24, strong: 8 },
    { day: "Tue", matches: 19, strong: 6 },
    { day: "Wed", matches: 27, strong: 9 },
    { day: "Thu", matches: 21, strong: 5 },
    { day: "Fri", matches: 30, strong: 11 },
    { day: "Sat", matches: 11, strong: 3 },
    { day: "Sun", matches: 14, strong: 4 },
];

export type ApplicationStage = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export const APPLICATION_STAGES: { id: ApplicationStage; label: string; color: string }[] = [
    { id: "saved", label: "Saved", color: "var(--fg-tertiary)" },
    { id: "applied", label: "Applied", color: "var(--hue-1)" },
    { id: "interviewing", label: "Interviewing", color: "var(--status-amber)" },
    { id: "offer", label: "Offer", color: "var(--score-high)" },
    { id: "rejected", label: "Closed", color: "var(--status-rose)" },
];

export interface Application {
    id: string;
    title: string;
    company: string;
    stage: ApplicationStage;
    updated: string;
    note?: string;
}

export const SAMPLE_APPLICATIONS: Application[] = [
    { id: "a1", title: "Senior Frontend Engineer", company: "Talabat", stage: "interviewing", updated: "Today", note: "Technical round Thursday" },
    { id: "a2", title: "Full-Stack Engineer", company: "Tabby", stage: "applied", updated: "Yesterday" },
    { id: "a3", title: "React Developer", company: "Instabug", stage: "applied", updated: "2d ago" },
    { id: "a4", title: "UI Engineer", company: "Careem", stage: "saved", updated: "2d ago" },
    { id: "a5", title: "Frontend Developer", company: "Vezeeta", stage: "saved", updated: "3d ago" },
    { id: "a6", title: "Product Engineer", company: "Paymob", stage: "offer", updated: "4d ago", note: "Reply by Sunday" },
    { id: "a7", title: "Web Engineer", company: "Anghami", stage: "rejected", updated: "1w ago" },
    { id: "a8", title: "Frontend Lead", company: "Noon", stage: "interviewing", updated: "3d ago", note: "Culture interview booked" },
];

/** The CV review report the AI will produce. */
export const SAMPLE_CV_REPORT = {
    overall: 76,
    ats: 82,
    sections: [
        { name: "Summary", score: 68, note: "Too generic. Name the role and the impact you bring." },
        { name: "Experience", score: 81, note: "Good structure. Add numbers to three of the bullets." },
        { name: "Skills", score: 88, note: "Clear and scannable. Group by category." },
        { name: "Education", score: 90, note: "Complete." },
        { name: "Formatting", score: 63, note: "Two-column layout may confuse some ATS parsers." },
    ],
    strengths: [
        "Recent, relevant React and TypeScript experience",
        "Clear progression from junior to senior roles",
        "Skills section matches 80% of common frontend postings",
    ],
    improvements: [
        "Quantify results: \"cut load time by 40%\" beats \"improved performance\"",
        "Replace the objective statement with a two-line professional summary",
        "Move to a single-column layout for ATS parsing",
        "Add links to two shipped projects",
    ],
    keywords: { found: ["React", "TypeScript", "REST", "Git", "Agile"], missing: ["Next.js", "Testing", "CI/CD", "Accessibility"] },
};

/** What "tailor my CV to this job" will return. */
export const SAMPLE_TAILORED_CV = {
    matchBefore: 64,
    matchAfter: 89,
    summary:
        "Senior frontend engineer with six years building fast, accessible React and Next.js products for high-traffic consumer apps in the MENA region. Led a design-system rollout used by four product teams and cut median page load by 40%.",
    bullets: [
        "Led migration of the customer web app to Next.js, improving Core Web Vitals scores by 35% across 2M monthly users",
        "Built and documented a component library adopted by four squads, reducing UI delivery time by roughly a quarter",
        "Introduced end-to-end testing with Playwright and raised release confidence, cutting production regressions by half",
        "Mentored three engineers and ran weekly frontend architecture reviews",
    ],
    addedKeywords: ["Next.js", "Core Web Vitals", "Playwright", "design system", "mentoring"],
};

export const SAMPLE_COVER_LETTER = `Dear Hiring Team,

I'm writing to apply for the Senior Frontend Engineer role at Talabat. For the past six years I've built consumer web products in React and TypeScript, most recently leading a Next.js migration that improved load times for two million monthly users.

What draws me to Talabat is the scale of the problem: fast, reliable ordering across very different networks and devices. That is exactly where I've spent my time: performance budgets, accessible components, and a design system that let four teams ship consistently.

I'd welcome the chance to talk about how I could help your web team move faster without trading off quality.

Kind regards,
[Your name]`;

export const SAMPLE_CV_SKILLS = ["React", "TypeScript", "Next.js", "Node.js", "REST APIs", "Tailwind CSS", "Jest", "Git", "Figma"];

export const SAMPLE_INTERVIEW_QUESTIONS: { category: string; question: string; tip: string }[] = [
    {
        category: "Behavioural",
        question: "Tell me about a time you disagreed with a technical decision.",
        tip: "Use STAR. Show that you raised it with evidence, listened, and committed once a decision was made.",
    },
    {
        category: "Technical",
        question: "How would you find and fix a slow-rendering React page?",
        tip: "Walk through measuring first (Profiler, Web Vitals), then the likely causes: re-renders, large bundles, unoptimised images.",
    },
    {
        category: "Technical",
        question: "Explain the difference between server and client components in Next.js.",
        tip: "Cover where each runs, what each can access, and how data and interactivity are split between them.",
    },
    {
        category: "Role fit",
        question: "Why do you want to work here, specifically?",
        tip: "Connect something concrete about the company's product to work you have already done.",
    },
    {
        category: "Behavioural",
        question: "Describe a project you're proud of and your exact part in it.",
        tip: "Be specific about your contribution and quantify the result.",
    },
];
