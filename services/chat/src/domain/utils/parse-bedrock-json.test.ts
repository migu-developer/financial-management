import { parseBedrockJson } from './parse-bedrock-json';

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
