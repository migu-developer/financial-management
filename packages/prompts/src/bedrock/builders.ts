/**
 * Request-body builders for Bedrock InvokeModel.
 *
 * Nova and Claude have different request schemas — kept separate to avoid
 * "polymorphic body" hacks. Two builders, clear typing.
 *
 * Note: the Step Functions stack builds its own ASL task bodies (it needs
 * JSONPath keys like `text.$`), but uses the SAME system prompts and routing
 * config from this package.
 */

export interface NovaInvocationBody {
  messages: Array<{
    role: 'user' | 'assistant';
    content: Array<{ text: string }>;
  }>;
  inferenceConfig: {
    max_new_tokens: number;
    temperature: number;
  };
  system?: Array<{ text: string }>;
}

export function buildNovaBody(args: {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): NovaInvocationBody {
  const body: NovaInvocationBody = {
    messages: [
      {
        role: 'user',
        content: [{ text: args.userPrompt }],
      },
    ],
    inferenceConfig: {
      max_new_tokens: args.maxTokens ?? 512,
      temperature: args.temperature ?? 0.0,
    },
  };
  if (args.systemPrompt) {
    body.system = [{ text: args.systemPrompt }];
  }
  return body;
}

export interface ClaudeInvocationBody {
  anthropic_version: 'bedrock-2023-05-31';
  max_tokens: number;
  temperature: number;
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export function buildClaudeBody(args: {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): ClaudeInvocationBody {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: args.maxTokens ?? 512,
    temperature: args.temperature ?? 0.7,
    ...(args.systemPrompt !== undefined && { system: args.systemPrompt }),
    messages: [{ role: 'user', content: args.userPrompt }],
  };
}
