# @packages/prompts

Single source of truth for every AI prompt, Bedrock model id and inference setting in the platform. Consumed by **`services/chat`** (runtime) and by the **CDK StepFunctionsChat stack** at synth time — the same prompt text the service documents is the one embedded in the deployed ASL, so they can never diverge.

## Structure

```
src/
  bedrock/
    models.ts      # BEDROCK_MODELS ids + CLAUDE_HAIKU_FOUNDATION_MODEL_ID (for IAM grants)
    builders.ts    # buildNovaBody / buildClaudeBody — request shapes per model family
  chat/
    contracts.ts   # Output contracts: ChatIntent, ExtractedQueryFilters, ExtractedExpenseFields
    intent.ts      # Intent classifier system prompt (QUERY / CREATE / UNKNOWN)
    extraction.ts  # SQL-params + expense-fields extraction prompts
    responses.ts   # User-facing prompts (NL answer, preview, confirmation, cancellation, clarification, unknown)
    catalog.ts     # CHAT_BEDROCK_PROMPTS: { modelId, system, maxTokens, temperature } per workflow step
```

## Model Routing (2-tier)

| Step                                                                      | Model                                | Settings        |
| ------------------------------------------------------------------------- | ------------------------------------ | --------------- |
| `intent`                                                                  | Nova Micro                           | 8 tokens, t=0   |
| `extractSqlParams`                                                        | Nova Lite                            | 256 tokens, t=0 |
| `extractExpenseFields`                                                    | Nova Lite                            | 256 tokens, t=0 |
| `nlResponse`                                                              | Claude Haiku 4.5 (inference profile) | 300 tokens      |
| `preview` / `confirmation` / `cancellation` / `clarification` / `unknown` | Claude Haiku 4.5                     | 60–140 tokens   |

## Conventions

- Prompts speak Spanish and instruct STRICT output shapes; extraction prompts expect the **current date injected** by the caller (`$$.Execution.StartTime` in ASL) — never hardcode dates.
- Nova may wrap JSON in markdown fences even when told not to — consumers parse with `parseBedrockJson()` (lives in `services/chat`).
- Anthropic model ids use the `us.` cross-region inference profile; `CLAUDE_HAIKU_FOUNDATION_MODEL_ID` exists for wildcard-region IAM grants.
- **Changing any prompt text requires redeploying the StepFunctionsChat stack** (the ASL embeds it at synth time) and re-validating with a real execution.

## Testing

```bash
pnpm --filter @packages/prompts test
```

Tests cover the request-body builders, the routing catalog (model/temperature invariants) and content assertions on the prompts (few-shot examples, output-shape instructions).
