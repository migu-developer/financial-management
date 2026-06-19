/**
 * Bedrock models sometimes wrap structured output in a markdown code fence
 * even when explicitly instructed not to (especially Nova Lite). Strip the
 * fence, the leading ```json, and any leading/trailing whitespace before
 * parsing.
 *
 * Throws if the string cannot be parsed after cleanup.
 */
export function parseBedrockJson<T = unknown>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped) as T;
}

/**
 * Non-throwing variant. Returns `null` when the model emitted output that
 * can't be parsed as JSON, so the caller can degrade gracefully (e.g. route
 * the workflow to a clarification) instead of letting `States.TaskFailed`
 * bubble up and page an alarm on what is really a malformed-input case.
 */
export function tryParseBedrockJson<T = unknown>(raw: string): T | null {
  try {
    return parseBedrockJson<T>(raw);
  } catch {
    return null;
  }
}
