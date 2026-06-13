import { INTENT_CLASSIFIER_SYSTEM_PROMPT } from './intent';
import {
  EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT,
  EXTRACT_SQL_PARAMS_SYSTEM_PROMPT,
} from './extraction';
import {
  CANCELLATION_SYSTEM_PROMPT,
  CONFIRMATION_SYSTEM_PROMPT,
  PREVIEW_SYSTEM_PROMPT,
} from './responses';

describe('intent classifier prompt', () => {
  it('lists the three valid labels', () => {
    for (const label of ['QUERY', 'CREATE', 'UNKNOWN']) {
      expect(INTENT_CLASSIFIER_SYSTEM_PROMPT).toContain(label);
    }
  });

  it('contains the affirmation-vs-question disambiguation rule', () => {
    expect(INTENT_CLASSIFIER_SYSTEM_PROMPT).toContain('AFIRMA un gasto');
  });

  it('includes Spanish few-shot examples for CREATE phrasings', () => {
    expect(INTENT_CLASSIFIER_SYSTEM_PROMPT).toContain(
      '"Gasté $45 en la cena en La Trattoria" → CREATE',
    );
    expect(INTENT_CLASSIFIER_SYSTEM_PROMPT).toContain(
      '"¿Cuánto gasté en comida este mes?" → QUERY',
    );
  });
});

describe('extraction prompts', () => {
  it('SQL params prompt declares the expected JSON shape', () => {
    expect(EXTRACT_SQL_PARAMS_SYSTEM_PROMPT).toContain('"queryType"');
    expect(EXTRACT_SQL_PARAMS_SYSTEM_PROMPT).toContain('"filters"');
    expect(EXTRACT_SQL_PARAMS_SYSTEM_PROMPT).toContain('ÚNICAMENTE el JSON');
  });

  it('SQL params prompt instructs relative-date resolution', () => {
    expect(EXTRACT_SQL_PARAMS_SYSTEM_PROMPT).toContain('fecha actual');
  });

  it('expense fields prompt restricts expenseTypeName to ingreso/egreso', () => {
    expect(EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT).toContain(
      'EXACTAMENTE "ingreso" o "egreso"',
    );
  });

  it('expense fields prompt forbids guessing the currency from "$"', () => {
    expect(EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT).toContain(
      'el símbolo "$" solo NO indica la moneda',
    );
  });

  it('expense fields prompt only extracts dates when mentioned', () => {
    expect(EXTRACT_EXPENSE_FIELDS_SYSTEM_PROMPT).toContain(
      'sólo si el mensaje menciona una fecha',
    );
  });
});

describe('user-facing response prompts', () => {
  it('preview asks for explicit confirmation (HITL)', () => {
    expect(PREVIEW_SYSTEM_PROMPT).toContain('¿Confirmás?');
  });

  it('confirmation includes amount and currency', () => {
    expect(CONFIRMATION_SYSTEM_PROMPT).toContain('monto');
    expect(CONFIRMATION_SYSTEM_PROMPT).toContain('moneda');
  });

  it('cancellation states the expense was NOT saved', () => {
    expect(CANCELLATION_SYSTEM_PROMPT).toContain('NO fue guardado');
  });
});
