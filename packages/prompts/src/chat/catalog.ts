import { BEDROCK_MODELS, type BedrockModelId } from '../bedrock/models';
import { INTENT_CLASSIFIER_SYSTEM_PROMPT } from './intent';
import {
  EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT,
  EXTRACT_SQL_PARAMS_SYSTEM_PROMPT,
} from './extraction';
import {
  CANCELLATION_SYSTEM_PROMPT,
  CLARIFICATION_SYSTEM_PROMPT,
  CONFIRMATION_SYSTEM_PROMPT,
  NL_RESPONSE_SYSTEM_PROMPT,
  PREVIEW_SYSTEM_PROMPT,
  UNKNOWN_SYSTEM_PROMPT,
} from './responses';

export interface ChatPromptConfig {
  readonly modelId: BedrockModelId;
  readonly system: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

/**
 * Model routing + inference settings for every Bedrock invocation in the
 * ChatProcess Step Function. This is THE source of truth: the CDK stack
 * inlines these values into the ASL and the chat service uses them for
 * local invocations.
 *
 * 2-tier routing: Nova for classification/extraction (cheap, deterministic),
 * Claude Haiku only where the user reads the output.
 */
export const CHAT_BEDROCK_PROMPTS = {
  /** Classify intent (QUERY / CREATE / UNKNOWN). Tiny output, deterministic. */
  intent: {
    modelId: BEDROCK_MODELS.NOVA_MICRO,
    system: INTENT_CLASSIFIER_SYSTEM_PROMPT,
    maxTokens: 8,
    temperature: 0,
  },
  /** Extract SQL filters from a QUERY message. JSON parsed in the Lambda. */
  extractSqlParams: {
    modelId: BEDROCK_MODELS.NOVA_LITE,
    system: EXTRACT_SQL_PARAMS_SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0,
  },
  /** Extract expense fields from a CREATE message. JSON parsed in the Lambda. */
  extractExpenseFields: {
    modelId: BEDROCK_MODELS.NOVA_LITE,
    system: EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0,
  },
  /** Natural-language answer to a QUERY (user reads this). */
  nlResponse: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: NL_RESPONSE_SYSTEM_PROMPT,
    maxTokens: 300,
    temperature: 0.5,
  },
  /** Preview shown before saving a new expense (HITL pause). */
  preview: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: PREVIEW_SYSTEM_PROMPT,
    maxTokens: 140,
    temperature: 0.3,
  },
  /** Confirmation after the expense was created. */
  confirmation: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CONFIRMATION_SYSTEM_PROMPT,
    maxTokens: 80,
    temperature: 0.4,
  },
  /** Message after the user cancelled the preview. */
  cancellation: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CANCELLATION_SYSTEM_PROMPT,
    maxTokens: 60,
    temperature: 0.3,
  },
  /** Question asking for the missing expense fields. */
  clarification: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CLARIFICATION_SYSTEM_PROMPT,
    maxTokens: 120,
    temperature: 0.5,
  },
  /** Fallback when the intent is UNKNOWN. */
  unknown: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: UNKNOWN_SYSTEM_PROMPT,
    maxTokens: 80,
    temperature: 0.5,
  },
} as const satisfies Record<string, ChatPromptConfig>;

export type ChatPromptKey = keyof typeof CHAT_BEDROCK_PROMPTS;
