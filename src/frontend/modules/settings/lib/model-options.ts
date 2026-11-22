import { AI_MODELS, type AiModelOption, type AiProviderId } from "@/shared/ai";

export interface ModelChoice extends AiModelOption {
  /** What runs when the user hasn't picked: shown as "Default", and saved as `null`. */
  isDefault: boolean;
}

/**
 * The models to offer for `provider`, the default first.
 *
 * `defaultModel` is the server's (it can be set per environment), so it may
 * not be on the shared list; it is then offered as its own entry, since it is
 * what really runs.
 */
export function modelChoices(provider: AiProviderId, defaultModel: string): ModelChoice[] {
  const listed: readonly AiModelOption[] = AI_MODELS[provider];
  const fallback = listed.find((option) => option.id === defaultModel) ?? {
    id: defaultModel,
    label: defaultModel,
    note: "Set by this Jobak server.",
  };
  return [
    { ...fallback, isDefault: true },
    ...listed.filter((option) => option.id !== defaultModel).map((option) => ({ ...option, isDefault: false })),
  ];
}
