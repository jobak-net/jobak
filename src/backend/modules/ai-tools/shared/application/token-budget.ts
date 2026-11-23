/**
 * A request's reply ceiling, sized so input and ceiling together stay under a
 * free tier's per-minute token limit. Groq allows 8,000 tokens a minute on
 * GPT-OSS and appears to count the ceiling up front, so a long input with a
 * fixed ceiling is refused before the model even starts.
 *
 * Tokens are estimated from characters (about 3.5 per token for English; more
 * tokens per character for other scripts, hence the margin in `MINUTE_BUDGET`).
 */
const MINUTE_BUDGET = 7_400;
const CHARS_PER_TOKEN = 3.5;

export function replyCeiling(prompt: { system: string; user: string }, limits: { max: number; min: number }): number {
  const input = Math.ceil((prompt.system.length + prompt.user.length) / CHARS_PER_TOKEN);
  return Math.max(limits.min, Math.min(limits.max, MINUTE_BUDGET - input));
}
