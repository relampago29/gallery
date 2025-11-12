import { describe, it, expect, vi, beforeEach } from 'vitest';

const refApi = {
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/firebase/admin', () => ({
  firestoreAdmin: {
    collection: vi.fn(() => ({ doc: vi.fn(() => refApi) })),
  },
}));

describe('DELETE/POST /api/public-photos/delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refApi.get.mockReset();
    refApi.delete.mockReset();
  });

  it('POST requires photoId', async () => {
    const mod = await import('./route');
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });

  it('POST deletes when exists', async () => {
    const mod = await import('./route');
    refApi.get.mockResolvedValueOnce({ exists: true });
    refApi.delete.mockResolvedValueOnce(undefined);
    const res = await mod.POST(new Request('http://test', { method: 'POST', body: JSON.stringify({ photoId: 'p1' }) }));
    expect(res.status).toBe(204);
  });

  it('DELETE uses id param and handles missing', async () => {
    const mod = await import('./route');
    const resMissing = await mod.DELETE(new Request('http://test?foo=bar', { method: 'DELETE' }));
    expect(resMissing.status).toBe(400);
    refApi.get.mockResolvedValueOnce({ exists: false });
    const res = await mod.DELETE(new Request('http://test?id=p1', { method: 'DELETE' }));
    expect(res.status).toBe(204);
  });
});

