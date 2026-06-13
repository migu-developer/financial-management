/**
 * Structured-extraction prompts — run on Nova Lite, temperature 0.
 *
 * Both prompts expect the caller to inject the CURRENT DATE in the user
 * message (the Step Function uses `$$.Execution.StartTime`), so relative
 * dates ("ayer", "este mes") resolve correctly.
 *
 * Output is JSON but Nova may wrap it in a ```json fence even when told
 * not to — consumers must parse with `parseBedrockJson()`.
 */

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
  "name": string opcional (descripción corta del gasto; derivá el objeto aunque esté implícito: "pagué el internet" → "Internet", "compré mercado en el Éxito" → "Mercado en el Éxito", "gasté en la cena en La Trattoria" → "Cena en La Trattoria"),
  "value": number opcional (monto numérico, sin símbolos ni separadores de miles),
  "currencyCode": string opcional (código ISO sólo si la moneda se menciona explícitamente: dólares → "USD", pesos colombianos → "COP", euros → "EUR"; el símbolo "$" solo NO indica la moneda),
  "expenseTypeName": string opcional (EXACTAMENTE "ingreso" o "egreso"; gasté/pagué/compré → "egreso", recibí/cobré → "ingreso"),
  "categoryName": string opcional (categoría libre),
  "date": string opcional ISO (YYYY-MM-DD sólo si el mensaje menciona una fecha; resolvé fechas relativas con la fecha actual provista)
}
- Omití campos que no aparezcan en el mensaje.
- Devolvé ÚNICAMENTE el JSON, sin markdown ni explicación.`;
