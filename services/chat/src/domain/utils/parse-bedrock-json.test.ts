import { parseBedrockJson, tryParseBedrockJson } from './parse-bedrock-json';

describe('parseBedrockJson', () => {
  it('parses raw JSON without fences', () => {
    expect(parseBedrockJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a markdown json fence', () => {
    expect(parseBedrockJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('strips a plain markdown fence without language tag', () => {
    expect(parseBedrockJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('tolerates surrounding whitespace and newlines', () => {
    expect(parseBedrockJson('\n  ```json\n{"a":1}\n```\n')).toEqual({ a: 1 });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBedrockJson('not json')).toThrow();
  });
});

describe('tryParseBedrockJson', () => {
  it('returns the parsed value for valid JSON (with or without a fence)', () => {
    expect(tryParseBedrockJson('{"a":1}')).toEqual({ a: 1 });
    expect(tryParseBedrockJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('returns null on malformed JSON instead of throwing', () => {
    expect(tryParseBedrockJson('not json')).toBeNull();
    expect(tryParseBedrockJson('')).toBeNull();
    expect(tryParseBedrockJson('{ broken')).toBeNull();
  });
});
