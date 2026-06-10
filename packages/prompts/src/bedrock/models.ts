/**
 * Bedrock model identifiers used by the AI orchestration.
 *
 * Two families coexist in Bedrock:
 *  - Amazon Nova (Micro, Lite, Pro) — Amazon's native models, on-demand supported.
 *  - Anthropic Claude — newer Claude versions require an "inference profile"
 *    instead of on-demand invocation. We use the `us.` cross-region profile.
 */
export const BEDROCK_MODELS = {
  /**
   * Cheap classification model.
   * Used for: intent detection (QUERY vs CREATE).
   */
  NOVA_MICRO: 'amazon.nova-micro-v1:0',

  /**
   * Mid-tier extraction model with tool-use support.
   * Used for: SQL parameter extraction and expense field extraction.
   */
  NOVA_LITE: 'amazon.nova-lite-v1:0',

  /**
   * Anthropic's Haiku 4.5 via the cross-region inference profile.
   * Used for: every user-facing natural-language response (NL answer,
   * preview, confirmation, cancellation, clarification).
   * Quality matters here — Haiku produces noticeably better Spanish than Nova.
   */
  CLAUDE_HAIKU: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
} as const;

export type BedrockModelId =
  (typeof BEDROCK_MODELS)[keyof typeof BEDROCK_MODELS];

/**
 * Foundation-model id behind the Claude cross-region inference profile
 * (the profile id minus the `us.` region prefix). IAM grants need it because
 * the profile fans out to the underlying foundation models per region.
 */
export const CLAUDE_HAIKU_FOUNDATION_MODEL_ID =
  'anthropic.claude-haiku-4-5-20251001-v1:0';
