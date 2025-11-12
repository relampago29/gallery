import { describe, it, expect, vi, beforeEach } from 'vitest';

const authMock = { currentUser: null as any };

vi.mock('@/lib/firebase/client', () => ({ auth: authMock }));

const authFns = {
  onAuthStateChanged: vi.fn(),
  signInAnonymously: vi.fn(),
};

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: authFns.onAuthStateChanged,
  signInAnonymously: authFns.signInAnonymously,
}));

describe('ensureFirebaseUser', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authMock.currentUser = null;
    authFns.onAuthStateChanged.mockReset();
    authFns.signInAnonymously.mockReset();
  });

  it('returns immediately when user exists', async () => {
    authMock.currentUser = { uid: 'u1' };
    const { ensureFirebaseUser } = await import('./ensureAuth');
    await expect(ensureFirebaseUser()).resolves.toBeUndefined();
    expect(authFns.onAuthStateChanged).not.toHaveBeenCalled();
  });

  it('signs in anonymously when no user, resolves', async () => {
    const { ensureFirebaseUser } = await import('./ensureAuth');
    authFns.onAuthStateChanged.mockImplementation((_auth, cb) => { const unsub = () => {}; setTimeout(() => cb(null), 0); return unsub; });
    authFns.signInAnonymously.mockResolvedValue({});

    await expect(ensureFirebaseUser()).resolves.toBeUndefined();
    expect(authFns.signInAnonymously).toHaveBeenCalled();
  });

  it('propagates error from signInAnonymously', async () => {
    const { ensureFirebaseUser } = await import('./ensureAuth');
    authFns.onAuthStateChanged.mockImplementation((_auth, cb) => { const unsub = () => {}; setTimeout(() => cb(null), 0); return unsub; });
    authFns.signInAnonymously.mockRejectedValue(new Error('auth error'));
    await expect(ensureFirebaseUser()).rejects.toThrow('auth error');
  });
});
