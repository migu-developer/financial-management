import { BEDROCK_MODELS } from '../bedrock/models';
import { CHAT_BEDROCK_PROMPTS, type ChatPromptKey } from './catalog';

describe('CHAT_BEDROCK_PROMPTS routing', () => {
  it('uses Nova Micro for intent classification', () => {
    expect(CHAT_BEDROCK_PROMPTS.intent.modelId).toBe(BEDROCK_MODELS.NOVA_MICRO);
    expect(CHAT_BEDROCK_PROMPTS.intent.temperature).toBe(0);
    expect(CHAT_BEDROCK_PROMPTS.intent.maxTokens).toBeLessThanOrEqual(16);
  });

  it('uses Nova Lite for parameter / field extraction', () => {
    expect(CHAT_BEDROCK_PROMPTS.extractSqlParams.modelId).toBe(
      BEDROCK_MODELS.NOVA_LITE,
    );
    expect(CHAT_BEDROCK_PROMPTS.extractExpenseFields.modelId).toBe(
      BEDROCK_MODELS.NOVA_LITE,
    );
  });

  it('uses Claude Haiku for every user-facing response', () => {
    const userFacing: ChatPromptKey[] = [
      'nlResponse',
      'preview',
      'confirmation',
      'cancellation',
      'clarification',
      'unknown',
    ];
    for (const key of userFacing) {
      expect(CHAT_BEDROCK_PROMPTS[key].modelId).toBe(
        BEDROCK_MODELS.CLAUDE_HAIKU,
      );
    }
  });

  it('keeps deterministic settings on extraction steps', () => {
    expect(CHAT_BEDROCK_PROMPTS.extractSqlParams.temperature).toBe(0);
    expect(CHAT_BEDROCK_PROMPTS.extractExpenseFields.temperature).toBe(0);
  });

  it('every prompt has a non-empty system message', () => {
    for (const config of Object.values(CHAT_BEDROCK_PROMPTS)) {
      expect(config.system.length).toBeGreaterThan(0);
      expect(config.maxTokens).toBeGreaterThan(0);
    }
  });

  it('gives multi-sentence prose responses enough headroom to not truncate', () => {
    // These recap context and/or ask a question with examples — too low a
    // ceiling cuts the message off mid-word (regression guard).
    const proseResponses: ChatPromptKey[] = [
      'nlResponse',
      'preview',
      'clarification',
      'unknown',
    ];
    for (const key of proseResponses) {
      expect(CHAT_BEDROCK_PROMPTS[key].maxTokens).toBeGreaterThanOrEqual(200);
    }
  });
});
