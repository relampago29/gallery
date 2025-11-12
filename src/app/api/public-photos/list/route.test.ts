import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/admin', () => {
  const chain = () => ({
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn(),
  });
  const instance = chain();
  return {
    firestoreAdmin: {
      collection: vi.fn(() => instance),
    },
    __mockInstance: instance,
  } as any;
});

describe('GET /api/public-photos/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns items with nextCursor', async () => {
    const mod = await import('./route');
    const admin: any = await import('@/lib/firebase/admin');
    admin.__mockInstance.get.mockResolvedValueOnce({
      docs: [
        { id: '1', data: () => ({ createdAt: 20 }) },
        { id: '2', data: () => ({ createdAt: 10 }) },
      ],
    });

    const res = await mod.GET(new Request('http://test/api/public-photos/list?limit=2'));
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.items.length).toBe(2);
    expect(body.nextCursor).toBe(10);
  });

  it('handles server error', async () => {
    const mod = await import('./route');
    const admin: any = await import('@/lib/firebase/admin');
    admin.__mockInstance.get.mockRejectedValueOnce(new Error('db error'));

    const res = await mod.GET(new Request('http://test/api/public-photos/list'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/db error|server/);
  });
});
