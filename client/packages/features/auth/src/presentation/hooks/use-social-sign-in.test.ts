import { openAuthSessionAsync } from 'expo-web-browser';
import { createURL } from 'expo-linking';

import { OAUTH_STORAGE_KEY } from './use-social-sign-in';

// ── React hooks mock ─────────────────────────────────────────────────────────
// Allow calling the hook outside a component by shimming useState / useCallback.
// We use a shared state store so that setState calls are visible to the test
// after `initiate` resolves.

const stateStore = new Map<number, unknown>();
let stateCounter = 0;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: <T>(initial: T): [T, (v: T) => void] => {
    const id = stateCounter++;
    stateStore.set(id, initial);
    const getter = () => stateStore.get(id) as T;
    const setter = (v: T) => {
      stateStore.set(id, v);
    };
    // Return a proxy array so reads always resolve latest value
    return new Proxy([initial, setter] as [T, (v: T) => void], {
      get(target, prop, receiver) {
        if (prop === '0') return getter();
        if (prop === '1') return setter;
        return Reflect.get(target, prop, receiver);
      },
    });
  },
  useCallback: <T>(fn: T): T => fn,
}));

// ── Auth mock ────────────────────────────────────────────────────────────────

const mockGetOAuthSignInUrl = jest.fn();
const mockHandleOAuthCallback = jest.fn();

jest.mock('@features/auth/presentation/providers/auth-provider', () => ({
  useAuth: () => ({
    getOAuthSignInUrl: mockGetOAuthSignInUrl,
    handleOAuthCallback: mockHandleOAuthCallback,
  }),
}));

// Platform.OS is 'web' in the react-native mock, so isWeb() returns true.

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PKCE = {
  codeVerifier: 'verifier-abc',
  codeChallenge: 'challenge-abc',
  state: 'state-xyz',
};

function makeSuccessUrl(code: string, state: string) {
  return `https://localhost/auth/callback?code=${code}&state=${state}`;
}

function setupMocks(
  overrides: {
    authSessionResult?: { type: string; url?: string };
    pkce?: typeof DEFAULT_PKCE;
  } = {},
) {
  const pkce = overrides.pkce ?? DEFAULT_PKCE;

  (createURL as jest.Mock).mockReturnValue('https://localhost/auth/callback');
  mockGetOAuthSignInUrl.mockResolvedValue({
    url: 'https://cognito.example.com/oauth2/authorize?...',
    pkce,
  });
  mockHandleOAuthCallback.mockResolvedValue(undefined);
  (openAuthSessionAsync as jest.Mock).mockResolvedValue(
    overrides.authSessionResult ?? {
      type: 'success',
      url: makeSuccessUrl('auth-code-123', pkce.state),
    },
  );
}

/**
 * The hook destructures `const [error, setError] = useState(null)`.
 * Because we mocked useState with a Proxy, the destructured `error` variable
 * captures the initial value. To read the *latest* state after `initiate`
 * runs, we read directly from the stateStore.
 *
 * State layout per hook call: index 0 = loading, index 1 = error.
 */
function getHookState(baseIndex: number) {
  return {
    get loading() {
      return stateStore.get(baseIndex) as boolean;
    },
    get error() {
      return stateStore.get(baseIndex + 1) as string | null;
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod =
  require('./use-social-sign-in') as typeof import('./use-social-sign-in');

// ── sessionStorage polyfill ──────────────────────────────────────────────────

const storage = new Map<string, string>();

beforeAll(() => {
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
    clear: () => storage.clear(),
  };
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).sessionStorage;
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSocialSignIn', () => {
  let baseIndex: number;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.clear();
    // Record the stateStore counter before each hook call
    // so we know which indices belong to this test's hook instance
    baseIndex = stateCounter;
  });

  it('exports useSocialSignIn as a function', () => {
    expect(typeof mod.useSocialSignIn).toBe('function');
    expect(mod.useSocialSignIn.name).toBe('useSocialSignIn');
  });

  it('returns initiate, loading, and error', () => {
    baseIndex = stateCounter;
    const result = mod.useSocialSignIn(jest.fn());
    expect(typeof result.initiate).toBe('function');
    const state = getHookState(baseIndex);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('successful popup flow', () => {
    it('calls getOAuthSignInUrl with provider and redirect URI', async () => {
      setupMocks();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(mockGetOAuthSignInUrl).toHaveBeenCalledWith(
        'google',
        'https://localhost/auth/callback',
      );
    });

    it('opens auth session with the OAuth URL', async () => {
      setupMocks();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(openAuthSessionAsync).toHaveBeenCalledWith(
        'https://cognito.example.com/oauth2/authorize?...',
        'https://localhost/auth/callback',
      );
    });

    it('calls handleOAuthCallback with code, verifier, redirect, provider, and locale', async () => {
      setupMocks();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn(), 'es');
      await initiate('facebook');

      expect(mockHandleOAuthCallback).toHaveBeenCalledWith(
        'auth-code-123',
        DEFAULT_PKCE.codeVerifier,
        'https://localhost/auth/callback',
        'facebook',
        'es',
      );
    });

    it('calls onSuccess after successful flow', async () => {
      setupMocks();
      const onSuccess = jest.fn();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(onSuccess);
      await initiate('google');

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('clears sessionStorage after successful popup flow', async () => {
      setupMocks();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(storage.has(OAUTH_STORAGE_KEY)).toBe(false);
    });
  });

  describe('sessionStorage persistence (web redirect flow)', () => {
    it('persists PKCE data before opening auth session', async () => {
      let storedValue: string | null = null;

      (createURL as jest.Mock).mockReturnValue(
        'https://localhost/auth/callback',
      );
      mockGetOAuthSignInUrl.mockResolvedValue({
        url: 'https://cognito.example.com/oauth2/authorize?...',
        pkce: DEFAULT_PKCE,
      });

      // Capture sessionStorage at the moment openAuthSessionAsync is called
      (openAuthSessionAsync as jest.Mock).mockImplementation(async () => {
        storedValue = storage.get(OAUTH_STORAGE_KEY) ?? null;
        return { type: 'cancel' };
      });

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(storedValue).not.toBeNull();
      const parsed = JSON.parse(storedValue!);
      expect(parsed).toEqual({
        codeVerifier: DEFAULT_PKCE.codeVerifier,
        state: DEFAULT_PKCE.state,
        provider: 'google',
        redirectUri: 'https://localhost/auth/callback',
      });
    });
  });

  describe('user cancellation', () => {
    it('does not call handleOAuthCallback when user cancels', async () => {
      setupMocks({ authSessionResult: { type: 'cancel' } });
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(mockHandleOAuthCallback).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when user dismisses', async () => {
      setupMocks({ authSessionResult: { type: 'dismiss' } });
      const onSuccess = jest.fn();
      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(onSuccess);
      await initiate('google');

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('state validation (CSRF protection)', () => {
    it('sets error on state mismatch', async () => {
      setupMocks({
        authSessionResult: {
          type: 'success',
          url: makeSuccessUrl('code-123', 'wrong-state'),
        },
      });

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(state.error).toBe('OAuth state mismatch — possible CSRF attempt');
      expect(mockHandleOAuthCallback).not.toHaveBeenCalled();
    });
  });

  describe('missing authorization code', () => {
    it('sets error when callback URL has no code parameter', async () => {
      const urlWithoutCode = 'https://localhost/auth/callback?state=state-xyz';
      setupMocks({
        authSessionResult: { type: 'success', url: urlWithoutCode },
      });

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(state.error).toBe('Missing authorization code in callback');
    });
  });

  describe('error handling', () => {
    it('captures getOAuthSignInUrl errors', async () => {
      (createURL as jest.Mock).mockReturnValue(
        'https://localhost/auth/callback',
      );
      mockGetOAuthSignInUrl.mockRejectedValue(new Error('Network failure'));

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(state.error).toBe('Network failure');
    });

    it('captures handleOAuthCallback errors', async () => {
      setupMocks();
      mockHandleOAuthCallback.mockRejectedValue(
        new Error('Token exchange failed'),
      );

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(state.error).toBe('Token exchange failed');
    });

    it('clears sessionStorage on error', async () => {
      setupMocks();
      mockHandleOAuthCallback.mockRejectedValue(new Error('fail'));

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');

      expect(storage.has(OAUTH_STORAGE_KEY)).toBe(false);
    });

    it('uses fallback message for non-Error throws', async () => {
      (createURL as jest.Mock).mockReturnValue(
        'https://localhost/auth/callback',
      );
      mockGetOAuthSignInUrl.mockRejectedValue('string error');

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(state.error).toBe('Social sign in failed');
    });
  });

  describe('loading state', () => {
    it('is true during initiate and false after', async () => {
      let loadingDuringCall = false;

      (createURL as jest.Mock).mockReturnValue(
        'https://localhost/auth/callback',
      );
      mockGetOAuthSignInUrl.mockImplementation(async () => {
        const s = getHookState(baseIndex);
        loadingDuringCall = s.loading;
        return {
          url: 'https://cognito.example.com/oauth2/authorize?...',
          pkce: DEFAULT_PKCE,
        };
      });
      (openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

      baseIndex = stateCounter;
      const { initiate } = mod.useSocialSignIn(jest.fn());
      await initiate('google');
      const state = getHookState(baseIndex);

      expect(loadingDuringCall).toBe(true);
      expect(state.loading).toBe(false);
    });
  });

  describe('OAUTH_STORAGE_KEY constant', () => {
    it('is exported and has expected value', () => {
      expect(OAUTH_STORAGE_KEY).toBe('_oauth_pending');
    });
  });
});
