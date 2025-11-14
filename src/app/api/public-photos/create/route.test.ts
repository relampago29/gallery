import { describe, it, expect, vi, beforeEach } from 'vitest';

const addFn = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  firestoreAdmin: {
    collection: vi.fn(() => ({ add: addFn })),
  },
}));

describe('POST /api/public-photos/create', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    addFn.mockReset();
  });

  it('validates required fields', async () => {
    const mod = await import('./route');
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing fields');
  });

  it('rejects invalid masterPath', async () => {
    const mod = await import('./route');
    const payload = { categoryId: 'c', createdAt: 1, masterPath: 'masters/private/x.jpg' };
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(payload) }));
    expect(res.status).toBe(400);
  });

  it('creates document and returns 201', async () => {
    const mod = await import('./route');
    addFn.mockResolvedValueOnce({ id: 'new' });
    const payload = { categoryId: 'c', createdAt: 1, masterPath: 'masters/public/x.jpg' };
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(payload) }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('handles server error', async () => {
    const mod = await import('./route');
    addFn.mockRejectedValueOnce(new Error('firestore down'));
    const payload = { categoryId: 'c', createdAt: 1, masterPath: 'masters/public/x.jpg' };
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(payload) }));
    expect(res.status).toBe(500);
  });
});

