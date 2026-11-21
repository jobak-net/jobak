/**
 * The backend's exceptions. Throw one to fail on purpose; the API's error
 * handler turns it into `{ error, code, detail? }` with its status.
 *
 *   base/    BaseError — status, shared error code, developer detail
 *   types/   one file per kind of error
 *
 * The codes and the messages users read are shared with the frontend:
 * `@/shared/errors/error-codes`.
 *
 *   import { NotFoundError } from "@/backend/shared/exceptions";
 *   throw new NotFoundError("Not a setup step");
 */
export { BaseError } from "./base";
export {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./types";
