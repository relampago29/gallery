import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/client', () => ({ db: {} }));

const firestoreMock = {
  collection: vi.fn(),
  getDocs: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
};

vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => ({ args }),
  getDocs: firestoreMock.getDocs,
  orderBy: (...args: any[]) => ({ type: 'orderBy', args }),
  query: (..._args: any[]) => ({ _args }),
  where: (...args: any[]) => ({ type: 'where', args }),
}));

function buildSnap(items: any[]) {
  return {
    docs: items.map((it) => ({ id: it.id, data: () => { const { id, ...rest } = it; return rest; } })),
  } as any;
}

describe('listActiveCategories', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses API and filters active', async () => {
    const { listActiveCategories } = await import('./categories');
    const apiItems = [
      { id: '1', name: 'A', active: true },
      { id: '2', name: 'B', active: false },
    ];
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ items: apiItems }) } as any);

    const res = await listActiveCategories();
    expect(res).toEqual([{ id: '1', name: 'A', active: true }]);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('falls back to Firestore client when API fails', async () => {
    const { listActiveCategories } = await import('./categories');
    vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('net'));
    firestoreMock.getDocs.mockResolvedValueOnce(buildSnap([
      { id: '1', name: 'A', active: true },
      { id: '2', name: 'B', active: true },
    ]));

    const res = await listActiveCategories();
    expect(res.map((x) => x.id)).toEqual(['1', '2']);
  });
});
