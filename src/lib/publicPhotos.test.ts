import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/client', () => ({ db: {}, storage: {}, auth: { currentUser: null } }));

const fsMock = {
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  startAfter: vi.fn(),
  limit: vi.fn(),
};

vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => ({ args }),
  getDocs: fsMock.getDocs,
  addDoc: fsMock.addDoc,
  orderBy: (...args: any[]) => ({ type: 'orderBy', args }),
  where: (...args: any[]) => ({ type: 'where', args }),
  startAfter: (...args: any[]) => ({ type: 'startAfter', args }),
  limit: (...args: any[]) => ({ type: 'limit', args }),
  query: (..._args: any[]) => ({ _args }),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(() => ({
    on: (_evt: any, _prog: any, _err: any, complete: any) => complete && complete(),
  })),
}));

function snap(items: any[]) {
  return { docs: items.map((it) => ({ id: it.id, data: () => { const { id, ...rest } = it; return rest; } })) } as any;
}

describe('publicPhotos helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('pickThumb selects preferred size', async () => {
    const { pickThumb } = await import('./publicPhotos');
    const res1 = pickThumb({ id: 'x', categoryId: 'c', createdAt: 1, sizes: { '960': { jpg: 'a.jpg', width: 960, height: 600 } } } as any);
    expect(res1.src).toBe('a.jpg');
    const res2 = pickThumb({ id: 'x', categoryId: 'c', createdAt: 1, sizes: { '640': { jpg: 'b.jpg', width: 640, height: 400 } } } as any);
    expect(res2.src).toBe('b.jpg');
  });

  it('listPublicPhotos uses API first and returns nextCursor', async () => {
    const { listPublicPhotos } = await import('./publicPhotos');
    const items = [ { id: '1', createdAt: 10 }, { id: '2', createdAt: 5 } ];
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ items, nextCursor: 5 }) } as any);
    const res = await listPublicPhotos({ limitN: 2 });
    expect(res.items.length).toBe(2);
    expect(res.nextCursor).toBe(5);
  });

  it('listPublicPhotos falls back to Firestore when API fails', async () => {
    const { listPublicPhotos } = await import('./publicPhotos');
    vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('net'));
    fsMock.getDocs.mockResolvedValueOnce(snap([{ id: '1', createdAt: 3 }, { id: '2', createdAt: 2 }]));
    const res = await listPublicPhotos({ limitN: 2 });
    expect(res.items.map((x: any) => x.id)).toEqual(['1', '2']);
    expect(res.nextCursor).toBe(2);
  });

  it('uploadMasterAndCreateProcessingDoc: success path uses API POST', async () => {
    const { uploadMasterAndCreateProcessingDoc } = await import('./publicPhotos');
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ ok: true, id: 'new' }) } as any);
    const file = new File([new Uint8Array([1,2])], 'photo.jpg', { type: 'image/jpeg' });
    const res = await uploadMasterAndCreateProcessingDoc({ file, categoryId: 'cat' });
    expect(fetchSpy).toHaveBeenCalled();
    expect(res.photoId).toBeTruthy();
  });

  it('uploadMasterAndCreateProcessingDoc: fallback uses addDoc when API fails', async () => {
    const { uploadMasterAndCreateProcessingDoc } = await import('./publicPhotos');
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: false, text: async () => 'bad' } as any);
    fsMock.addDoc.mockResolvedValueOnce({ id: 'created' });
    const file = new File([new Uint8Array([1,2])], 'photo.png', { type: 'image/png' });
    await uploadMasterAndCreateProcessingDoc({ file, categoryId: 'cat' });
    expect(fsMock.addDoc).toHaveBeenCalled();
  });

  it('deletePublicPhoto: propagates server error', async () => {
    const { deletePublicPhoto } = await import('./publicPhotos');
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: false, text: async () => 'boom' } as any);
    await expect(deletePublicPhoto('id1')).rejects.toThrow('boom');
  });
});
