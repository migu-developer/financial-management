import {
  buildClaudeBody,
  buildNovaBody,
  CHAT_BEDROCK_PROMPTS,
} from './bedrock-prompts';
import { BEDROCK_MODELS } from './bedrock-models';

describe('Bedrock prompt builders', () => {
  describe('buildNovaBody', () => {
    it('packages a user prompt as a Nova messages array', () => {
      const body = buildNovaBody({ userPrompt: 'Hola' });
      expect(body.messages).toEqual([
        { role: 'user', content: [{ text: 'Hola' }] },
      ]);
    });

    it('defaults max_new_tokens=512 and temperature=0', () => {
      const body = buildNovaBody({ userPrompt: 'x' });
      expect(body.inferenceConfig.max_new_tokens).toBe(512);
      expect(body.inferenceConfig.temperature).toBe(0);
    });

    it('forwards the system prompt when provided', () => {
      const body = buildNovaBody({
        userPrompt: 'x',
        systemPrompt: 'You are X',
      });
      expect(body.system).toEqual([{ text: 'You are X' }]);
    });

    it('omits the system field when not provided', () => {
      const body = buildNovaBody({ userPrompt: 'x' });
      expect(body.system).toBeUndefined();
    });
  });

  describe('buildClaudeBody', () => {
    it('uses the bedrock-2023-05-31 anthropic_version', () => {
      const body = buildClaudeBody({ userPrompt: 'x' });
      expect(body.anthropic_version).toBe('bedrock-2023-05-31');
    });

    it('puts the user prompt in a single-message array', () => {
      const body = buildClaudeBody({ userPrompt: 'Hola' });
      expect(body.messages).toEqual([{ role: 'user', content: 'Hola' }]);
    });

    it('defaults max_tokens=512 and temperature=0.7', () => {
      const body = buildClaudeBody({ userPrompt: 'x' });
      expect(body.max_tokens).toBe(512);
      expect(body.temperature).toBe(0.7);
    });

    it('forwards system as a top-level string', () => {
      const body = buildClaudeBody({
        userPrompt: 'x',
        systemPrompt: 'You are X',
      });
      expect(body.system).toBe('You are X');
    });
  });
});

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
    const userFacing: Array<keyof typeof CHAT_BEDROCK_PROMPTS> = [
      'nlResponse',
      'preview',
      'confirmation',
      'cancellation',
      'clarification',
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
});
