export { getReferralsModule, type ReferralsModule } from "./composition";
export type { Referral } from "./domain/referral.entity";
export {
    referralCodeFor,
    isReferralCode,
    REFERRAL_COOKIE,
    REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "./domain/referral-code";
