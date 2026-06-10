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
