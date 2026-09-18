/**
 * Which deployment this build belongs to.
 *
 * `NEXT_PUBLIC_APP_ENV` is the explicit switch, set per pipeline. It used to
 * fall back to a host-provided variable; that was removed so the app makes no
 * assumption about where it runs.
 *
 * `NODE_ENV` is deliberately not used — it is "production" for every built
 * deployment, including a staging one, so it cannot tell them apart.
 *
 * Unset therefore means "not the production site", which is the safe default:
 * the only thing this decides is whether search engines are allowed in, and
 * wrongly indexing a staging deployment is worse than wrongly excluding one.
 */
const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

/**
 * Only the production site is exposed to search engines. Anything else — the
 * development pipeline, previews, local builds — stays out of the index, and an
 * unset env var fails closed to "do not index".
 */
export const isProductionSite = appEnv === "production";
