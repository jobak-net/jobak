import type { TalentCard } from "@/shared/contracts/talent";

/**
 * The directory as schema.org structured data: an `ItemList` of `Person`
 * entries — but only the fields already on the public card. Structured data
 * must never widen what a page discloses; it is the same consent, in a
 * machine-readable shape.
 */
export function talentJsonLd(people: TalentCard[]) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Talent on Jobak",
        numberOfItems: people.length,
        itemListElement: people.slice(0, 50).map((person, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
                "@type": "Person",
                name: person.displayName ?? "Jobak member",
                ...(person.headline ? { jobTitle: person.headline } : {}),
                ...(person.linkedinUrl ? { sameAs: [person.linkedinUrl] } : {}),
                ...(person.location ? { address: person.location } : {}),
            },
        })),
    };
}
