/**
 * Prompt templates and body builders for every Bedrock invocation in the
 * ChatProcess Step Function.
 *
 * Pure functions: they produce the JSON body to pass to InvokeModel.
 * Step Functions calls Bedrock directly (no Lambda glue), so these helpers
 * are used both at design-time (to embed strings in the ASL) and inside the
 * (few) Lambdas that still need to talk to Bedrock locally.
 *
 * Nova and Claude have different request schemas — kept separate to avoid
 * "polymorphic body" hacks. Two builders, clear typing.
 */

import { BEDROCK_MODELS } from './bedrock-models';

// ════════════════════════════════════════════════════════════════════
//  Domain types — what the workflow reads from each Bedrock response
// ════════════════════════════════════════════════════════════════════

export type ChatIntent = 'QUERY' | 'CREATE' | 'UNKNOWN';

export interface ExtractedQueryParams {
  queryType: 'list' | 'metrics';
  filters: {
    expenseTypeId?: string;
    expenseCategoryId?: string;
    currencyId?: string;
    from?: string;
    to?: string;
    name?: string;
  };
}

export interface ExtractedExpenseFields {
  name?: string;
  value?: number;
  currencyCode?: string;
  expenseTypeName?: string;
  categoryName?: string;
  date?: string;
}

// ════════════════════════════════════════════════════════════════════
//  Nova body builder (Nova Micro + Nova Lite)
// ════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════
//  Claude (Anthropic) body builder
// ════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════
//  Prompt templates — system messages
// ════════════════════════════════════════════════════════════════════

export const INTENT_CLASSIFIER_SYSTEM_PROMPT = `Eres un clasificador de intenciones para una app de gestión de gastos personales.
Dada la frase del usuario, devolvé EXACTAMENTE una palabra en mayúsculas:
- QUERY: el usuario PREGUNTA o consulta sobre gastos ya registrados (¿cuánto gasté...?, listame, mostrame, total de, en qué gasté...). Casi siempre es una pregunta.
- CREATE: el usuario INFORMA un gasto o ingreso nuevo para registrarlo. Verbos en pasado en primera persona: gasté, pagué, compré, me costó, recibí, cobré, invertí.
- UNKNOWN: no es ninguna de las anteriores (saludo, ayuda, otra cosa).
Regla clave: si la frase AFIRMA un gasto (no pregunta), es CREATE aunque contenga la palabra "gasté".
Ejemplos:
"¿Cuánto gasté en comida este mes?" → QUERY
"Gasté $45 en la cena en La Trattoria" → CREATE
"Pagué 50000 pesos de arriendo ayer" → CREATE
"Mostrame mis gastos de mayo" → QUERY
"Compré un teclado por 80 USD" → CREATE
"Hola, ¿qué podés hacer?" → UNKNOWN
Respondé sólo con la palabra, sin explicación, sin puntuación, sin comillas.`;

export const EXTRACT_SQL_PARAMS_SYSTEM_PROMPT = `Eres un extractor de parámetros SQL para consultar gastos personales.
Dada la frase del usuario y la fecha actual, devolvé un OBJETO JSON con esta forma:
{
  "queryType": "metrics" | "list",
  "filters": {
    "expenseTypeName": string opcional ("ingreso" | "egreso"),
    "expenseCategoryName": string opcional,
    "currencyCode": string opcional (ej: "USD", "ARS"),
    "from": string opcional ISO date (YYYY-MM-DD),
    "to": string opcional ISO date (YYYY-MM-DD),
    "name": string opcional (sub-string del nombre del gasto)
  }
}
- "metrics" si pregunta por totales, sumas, promedios, "cuánto"; "list" si pide un listado o detalle.
- Resolvé fechas relativas usando la fecha actual provista (mes pasado, esta semana, hoy, ayer).
- Omití campos que no aparezcan. Devolvé ÚNICAMENTE el JSON, sin markdown ni comentarios.`;

export const EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT = `Eres un extractor de campos para crear un gasto.
Dada la frase del usuario, devolvé un OBJETO JSON con esta forma:
{
  "name": string opcional (descripción corta del gasto, ej: "Cena en La Trattoria"),
  "value": number opcional (monto numérico, sin símbolos ni separadores de miles),
  "currencyCode": string opcional (código ISO sólo si la moneda se menciona explícitamente: dólares → "USD", pesos colombianos → "COP", euros → "EUR"; el símbolo "$" solo NO indica la moneda),
  "expenseTypeName": string opcional (EXACTAMENTE "ingreso" o "egreso"; gasté/pagué/compré → "egreso", recibí/cobré → "ingreso"),
  "categoryName": string opcional (categoría libre),
  "date": string opcional ISO (YYYY-MM-DD sólo si el mensaje menciona una fecha; resolvé fechas relativas con la fecha actual provista)
}
- Omití campos que no aparezcan en el mensaje.
- Devolvé ÚNICAMENTE el JSON, sin markdown ni explicación.`;

export const NL_RESPONSE_SYSTEM_PROMPT = `Eres un asistente conversacional de finanzas personales que responde en español neutro.
Tus respuestas son cortas (máx 3 oraciones), claras y empáticas.
Si te muestran datos de gastos del usuario, usá montos con dos decimales y la moneda explícita.
No inventes información que no esté en los datos.`;

export const PREVIEW_SYSTEM_PROMPT = `Eres un asistente que genera vistas previas de gastos antes de guardarlos.
Dado un gasto que el usuario quiere registrar, devolvé un mensaje corto en español que:
1. Resume el gasto (nombre, monto + moneda, categoría, fecha) en una sola línea.
2. Pregunta explícitamente "¿Confirmás?" al final.
Sin markdown ni listas, sólo prosa.`;

export const CONFIRMATION_SYSTEM_PROMPT = `Eres un asistente que confirma que un gasto fue registrado.
Devolvé un mensaje muy corto en español (una oración) que confirme el registro.
Incluí el monto y la moneda. Empezá con un emoji positivo.`;

export const CANCELLATION_SYSTEM_PROMPT = `Eres un asistente que confirma que un gasto fue descartado por el usuario.
Devolvé un mensaje muy corto en español (una oración) que diga que el gasto NO fue guardado.
Tono neutro, sin emoji negativo.`;

export const CLARIFICATION_SYSTEM_PROMPT = `Eres un asistente que pide los datos faltantes para registrar un gasto.
Dado el listado de campos faltantes, devolvé una sola pregunta en español, natural y conversacional, pidiendo esos datos.
Si falta más de un campo, agrupalos en una única pregunta clara.`;

// ════════════════════════════════════════════════════════════════════
//  Prompt body factories — used by the CDK stack to inline into ASL
// ════════════════════════════════════════════════════════════════════

export const CHAT_BEDROCK_PROMPTS = {
  /**
   * Classify intent (QUERY / CREATE / UNKNOWN). Cheap Nova Micro,
   * tiny output, deterministic.
   */
  intent: {
    modelId: BEDROCK_MODELS.NOVA_MICRO,
    system: INTENT_CLASSIFIER_SYSTEM_PROMPT,
    maxTokens: 8,
    temperature: 0,
  },
  /**
   * Extract SQL filters from the user's QUERY message. Nova Lite.
   * Output is JSON; we parse it inside the query-executor Lambda.
   */
  extractSqlParams: {
    modelId: BEDROCK_MODELS.NOVA_LITE,
    system: EXTRACT_SQL_PARAMS_SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0,
  },
  /**
   * Extract structured expense fields from a CREATE message. Nova Lite.
   * Output is JSON; we parse it inside the validate-expense Lambda.
   */
  extractExpenseFields: {
    modelId: BEDROCK_MODELS.NOVA_LITE,
    system: EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0,
  },
  /**
   * Natural-language response to a QUERY. Claude Haiku 4.5.
   * Quality matters because this is what the user reads.
   */
  nlResponse: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: NL_RESPONSE_SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0.5,
  },
  /**
   * Generate the preview shown before saving a new expense (HITL).
   */
  preview: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: PREVIEW_SYSTEM_PROMPT,
    maxTokens: 120,
    temperature: 0.3,
  },
  confirmation: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CONFIRMATION_SYSTEM_PROMPT,
    maxTokens: 60,
    temperature: 0.4,
  },
  cancellation: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CANCELLATION_SYSTEM_PROMPT,
    maxTokens: 50,
    temperature: 0.3,
  },
  clarification: {
    modelId: BEDROCK_MODELS.CLAUDE_HAIKU,
    system: CLARIFICATION_SYSTEM_PROMPT,
    maxTokens: 100,
    temperature: 0.5,
  },
} as const;

export type ChatPromptKey = keyof typeof CHAT_BEDROCK_PROMPTS;
