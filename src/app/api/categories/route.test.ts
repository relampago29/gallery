import { describe, it, expect, vi, beforeEach } from 'vitest';

const orderBy = vi.fn().mockReturnThis();
const get = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  firestoreAdmin: {
    collection: vi.fn(() => ({ orderBy, get })),
  },
}));

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderBy.mockClear();
    get.mockReset();
  });

  it('returns sorted items', async () => {
    const mod = await import('./route');
    get.mockResolvedValueOnce({ docs: [ { id: '1', data: () => ({ name: 'A', active: true }) } ] });
    const res = await mod.GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].id).toBe('1');
  });

  it('handles error and returns 500', async () => {
    const mod = await import('./route');
    get.mockRejectedValueOnce(new Error('db err'));
    const res = await mod.GET();
    expect(res.status).toBe(500);
  });
});
