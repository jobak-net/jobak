import { ACTORS } from "../config/actors";
import { CATEGORIES } from "../config/categories";

/** Every site by category, as plain text: what the locked page shows behind its card. */
export function CatalogueOverview() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CATEGORIES.map((category) => (
                <section key={category.id} className="rounded-card border border-border-subtle bg-white/2 p-5">
                    <h2 className="text-sm font-medium text-fg-primary">{category.label}</h2>
                    <ul className="mt-3 space-y-2">
                        {ACTORS.filter((entry) => entry.category === category.id).map((entry) => (
                            <li key={entry.id} className="text-[13px] text-fg-tertiary">
                                <span className="text-fg-secondary">{entry.site}</span>: {entry.description}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
