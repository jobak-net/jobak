/**
 * The markets this product is for, by ISO country code.
 *
 * Jobak exists for candidates in MENA, and the public board was showing the
 * pool in pure recency order — which on a busy collection day is a wall of
 * remote-worldwide listings with Cairo and Riyadh buried underneath. These
 * codes drive the default `region: "mena"` view.
 */
export const MENA_COUNTRIES = [
    "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ",
    "MA", "TN", "DZ", "LY", "SD", "PS", "SY", "YE", "MR", "SO", "DJ", "KM",
] as const;
