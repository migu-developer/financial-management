/**
 * Bedrock model identifiers used by the AI orchestration.
 *
 * Every model is invoked through a `us.` cross-region INFERENCE PROFILE, not
 * the bare on-demand model id. On-demand invocation of these models is NOT
 * available in every region (e.g. Amazon Nova requires an inference profile in
 * us-east-2), so using the profile keeps the workflow portable across regions
 * (dev us-east-1, prod us-east-2). IAM grants need the underlying
 * foundation-model ids too (the profile fans out per region).
 */
export const BEDROCK_MODELS = {
  /**
   * Cheap classification model (cross-region inference profile).
   * Used for: intent detection (QUERY vs CREATE).
   */
  NOVA_MICRO: 'us.amazon.nova-micro-v1:0',

  /**
   * Mid-tier extraction model with tool-use support (cross-region profile).
   * Used for: SQL parameter extraction and expense field extraction.
   */
  NOVA_LITE: 'us.amazon.nova-lite-v1:0',

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

/**
 * Foundation-model ids behind the Nova cross-region inference profiles (the
 * profile ids minus the `us.` prefix). IAM grants need them because the
 * profile fans out to the underlying foundation models per region.
 */
export const NOVA_MICRO_FOUNDATION_MODEL_ID = 'amazon.nova-micro-v1:0';
export const NOVA_LITE_FOUNDATION_MODEL_ID = 'amazon.nova-lite-v1:0';
