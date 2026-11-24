/**
 * A person as the identity provider describes them.
 *
 * Deliberately not a `User`: this is the provider's view, with no id of ours,
 * and it is what gets written *into* a `User` the first time someone is seen
 * and whenever the provider reports a change.
 */
export interface ExternalIdentity {
  externalId: string;
  email: string | null;
  fullName: string | null;
}
