// Sets required application env vars for testing when not already present.
// This file runs via setupFiles — before any test module is imported —
// so config/index.ts captures these values when it spreads process.env.
process.env.ASSETS_URL = 'https://test-assets.example.com';
process.env.APPLICATION_URL = 'https://test-app.example.com';
