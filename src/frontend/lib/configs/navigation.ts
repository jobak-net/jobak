/**
 * Root-relative hashes (`/#id`) rather than bare `#id` so the links still resolve
 * from sub-pages like /about, where those sections are not on the current page.
 */
export const landingNavLinks = [
    // Real route first: this is the page we point external traffic at
    // (LinkedIn posts link straight to /jobs), so it should be reachable in
    // one click from anywhere rather than living only in the footer.
    //
    // Talent is deliberately absent while the product is pre-launch: the
    // directory is opt-in and nobody has opted in yet, so linking it would
    // advertise an empty page. The route still works for anyone testing it.
    { name: "Jobs", href: "/jobs" },
    { name: "How it works", href: "/#how-it-works" },
    { name: "Features", href: "/#features" },
    { name: "Cost", href: "/#cost" },
];
