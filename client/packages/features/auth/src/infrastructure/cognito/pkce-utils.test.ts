import { generatePkce } from './pkce-utils';

describe('generatePkce', () => {
  it('returns all required PKCE fields', async () => {
    const pkce = await generatePkce();
    expect(pkce).toHaveProperty('codeVerifier');
    expect(pkce).toHaveProperty('codeChallenge');
    expect(pkce).toHaveProperty('state');
  });

  it('codeVerifier is a non-empty base64url string (no +, /, =)', async () => {
    const { codeVerifier } = await generatePkce();
    expect(typeof codeVerifier).toBe('string');
    expect(codeVerifier.length).toBeGreaterThan(42); // RFC 7636 min
    expect(codeVerifier.length).toBeLessThanOrEqual(128); // RFC 7636 max
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('codeChallenge is a non-empty base64url string (S256)', async () => {
    const { codeChallenge } = await generatePkce();
    expect(typeof codeChallenge).toBe('string');
    expect(codeChallenge.length).toBeGreaterThan(0);
    // SHA-256 → 32 bytes → 43 base64url chars (no padding)
    expect(codeChallenge.length).toBe(43);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('state is a non-empty base64url string', async () => {
    const { state } = await generatePkce();
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
    expect(state).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('generates unique values on each call', async () => {
    const [pkce1, pkce2] = await Promise.all([generatePkce(), generatePkce()]);
    expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
    expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    expect(pkce1.state).not.toBe(pkce2.state);
  });

  it('codeChallenge is deterministic for the same codeVerifier', async () => {
    // Verify the S256 relationship: same input → same output
    const pkce = await generatePkce();
    // Recompute challenge from the same verifier using the same algorithm
    const data = new TextEncoder().encode(pkce.codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const expectedChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    expect(pkce.codeChallenge).toBe(expectedChallenge);
  });
});
