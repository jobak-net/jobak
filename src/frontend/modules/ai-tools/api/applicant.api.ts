import { clientFetch, unwrap } from "@/frontend/shared/api";
import {
  APPLICANT_CVS_API_PATH,
  APPLICANT_NAME_API_PATH,
  applicantCvApiPath,
  type SaveCvRequest,
  type SavedCv,
} from "@/shared/contracts/applicant";

/*************** Mutations ***************/

/** Keeps a CV the user just used, or moves the same one to the top: `POST /api/v1/applicant/cvs`. Throws an `ApiError`. */
export async function saveCv(request: SaveCvRequest): Promise<SavedCv> {
  return unwrap(await clientFetch<SavedCv>(APPLICANT_CVS_API_PATH, { method: "POST", body: request }));
}

/** Deletes one saved CV: `DELETE /api/v1/applicant/cvs/[id]`. Throws an `ApiError`. */
export async function deleteCv(id: string): Promise<{ deleted: true }> {
  return unwrap(await clientFetch<{ deleted: true }>(applicantCvApiPath(id), { method: "DELETE" }));
}

/** The name the user writes on applications: `PUT /api/v1/applicant/name`. Throws an `ApiError`. */
export async function saveApplicantName(name: string): Promise<{ name: string }> {
  return unwrap(await clientFetch<{ name: string }>(APPLICANT_NAME_API_PATH, { method: "PUT", body: { name } }));
}
