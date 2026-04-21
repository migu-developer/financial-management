---
name: jest-30
description: |
  Jest 30 testing patterns with ts-jest and modern async support.
  TRIGGER when: writing or editing test files (*.test.ts, *.test.tsx),
  configuring jest.config.ts, or setting up mocks.
metadata:
  version: '30.3.0'
  catalog_ref: 'jest: ^30.3.0'
  scope: [root]
  auto_invoke: 'When writing tests or configuring Jest'
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash]
---

# Jest 30

## Version

jest@30.3.0 (from pnpm catalog), ts-jest@29.4.9

Note: `client/main` uses jest@~29.7.0 directly (not the catalog version) for Expo compatibility.

## Critical Patterns

- Use `describe` / `it` / `expect` structure for all tests
- Use `jest.mock()` at the top of the file for module mocking (London School TDD)
- Use `beforeEach` to reset mocks: `jest.clearAllMocks()` or `jest.resetAllMocks()`
- Use `async`/`await` for async tests -- never use `done` callbacks
- Default `moduleFileExtensions` now includes `.mts` and `.cts`
- Jest 30 uses `unrs-resolver` for faster module resolution (37% faster, 77% less memory)
- Jest 30 warns about uncleaned globals -- clean up in `afterEach`
- Use `jest.fn<ReturnType, Args>()` for typed mock functions
- Use `jest.spyOn()` for spying on methods without replacing them
- Test files go in `tests/` or colocated as `*.test.ts` next to source

## Must NOT Do

- NEVER use snapshot tests excessively -- prefer explicit assertions
- NEVER use `done` callback for async tests -- use `async`/`await`
- NEVER mock what you do not own without a wrapper (wrap third-party APIs)
- NEVER write tests that depend on execution order
- NEVER use `jest.setTimeout()` globally -- set per test if needed
- NEVER import from `jest` directly (globals are available)
- NEVER use `SpyInstance` type -- use `jest.SpiedFunction` (SpyInstance removed in Jest 30)
- NEVER leave unresolved promises or timers -- Jest 30 detects and warns

## Migration from Jest 29 (client/main)

- `jest.SpyInstance` renamed to `jest.SpiedFunction` in Jest 30
- `expect.addSnapshotSerializer` moved to project config
- `fakeTimers.legacyFakeTimers` removed -- use modern fake timers only
- `jest-environment-jsdom` upgraded to jsdom 26

## Examples

### Basic test with mocks (London School)

```typescript
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';

jest.mock('../user.repository');

describe('UserService', () => {
  let service: UserService;
  const mockRepo = jest.mocked(new UserRepository());

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(mockRepo);
  });

  it('should return user by id', async () => {
    const expected = { id: '1', name: 'Test' };
    mockRepo.findById.mockResolvedValue(expected);

    const result = await service.getUser('1');

    expect(result).toEqual(expected);
    expect(mockRepo.findById).toHaveBeenCalledWith('1');
  });

  it('should throw when user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.getUser('999')).rejects.toThrow('User not found');
  });
});
```

### Typed mock functions

```typescript
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
```

### jest.config.ts pattern (services)

```typescript
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  moduleNameMapper: {
    '^@services/users/(.*)$': '<rootDir>/src/$1',
    '^@packages/models/(.*)$': '<rootDir>/node_modules/@packages/models/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};

export default config;
```

### Testing async error handling

```typescript
it('should handle network errors gracefully', async () => {
  mockClient.send.mockRejectedValue(new Error('Network timeout'));

  const result = await service.fetchData();

  expect(result).toEqual({ success: false, error: 'Network timeout' });
});
```
