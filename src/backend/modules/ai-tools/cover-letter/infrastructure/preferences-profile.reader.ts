import "server-only";

import { getPreferencesModule } from "@/backend/modules/preferences";
import { countryName } from "@/shared/countries";

import type { ApplicantProfile, ApplicantProfileReader } from "../domain/applicant-profile";

/**
 * The applicant's profile from what Jobak already holds: the account's name
 * and the saved search preferences (`GET /api/v1/preferences`' data, read
 * through the preferences module). Someone without saved preferences gets an
 * empty profile rather than an error: the letter then leans on the posting,
 * the name in the form and the job's title.
 */
export class PreferencesProfileReader implements ApplicantProfileReader {
  async forUser(user: { id: string; fullName: string | null }): Promise<ApplicantProfile> {
    const stored = await getPreferencesModule().get.execute(user.id);

    return {
      fullName: user.fullName,
      skills: stored?.keywords ?? [],
      targetTitles: stored?.jobTitles ?? [],
      seniority: stored?.seniority ?? null,
      field: stored?.field ?? null,
      locations: !stored
        ? []
        : stored.location.worldwide
          ? ["anywhere (remote)"]
          : stored.location.countries.map(countryName),
      workModes: stored?.workModes ?? [],
    };
  }
}
