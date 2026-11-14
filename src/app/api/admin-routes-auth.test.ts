import { describe, it, expect, vi } from "vitest";

// Sem token, nenhuma destas rotas deve chegar ao Firestore/Storage.
const touched = vi.fn();
const handler: ProxyHandler<any> = {
  get: (_t, prop) => {
    if (prop === "then") return undefined;
    touched(prop);
    return new Proxy(() => {}, handler);
  },
  apply: () => {
    touched("call");
    return new Proxy(() => {}, handler);
  },
};
const proxy = new Proxy(() => {}, handler);

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken: vi.fn() }),
  getAdminDb: () => proxy,
  getAdminStorage: () => proxy,
  getAdminBucket: () => proxy,
  authAdmin: proxy,
  firestoreAdmin: proxy,
  storageAdmin: proxy,
  bucketAdmin: proxy,
}));

const routes: [string, () => Promise<any>, string[]][] = [
  ["session-photos/download", () => import("./session-photos/download/route"), ["GET"]],
  ["session-photos/download-all", () => import("./session-photos/download-all/route"), ["GET"]],
  ["session-photos/register", () => import("./session-photos/register/route"), ["POST"]],
  ["session-photos/upsert", () => import("./session-photos/upsert/route"), ["POST"]],
  ["storage/sign", () => import("./storage/sign/route"), ["GET"]],
  ["storage/list", () => import("./storage/list/route"), ["GET"]],
  ["public-photos/create", () => import("./public-photos/create/route"), ["POST"]],
  ["public-photos/delete", () => import("./public-photos/delete/route"), ["POST", "DELETE"]],
  ["public-photos/delete-all", () => import("./public-photos/delete-all/route"), ["POST"]],
  ["upload/sequence", () => import("./upload/sequence/route"), ["POST"]],
];

describe("admin-only API routes reject anonymous requests", () => {
  for (const [name, load, methods] of routes) {
    for (const method of methods) {
      it(`${method} /api/${name} → 401`, async () => {
        touched.mockClear();
        const mod = await load();
        const url =
          "http://test/x?sessionId=s1&path=masters/sessions/s1/a.jpg&id=p1";
        const init: RequestInit = { method };
        if (method !== "GET") init.body = JSON.stringify({ sessionId: "s1", photoId: "p1" });
        const res = await mod[method](new Request(url, init));
        expect(res.status).toBe(401);
        expect(touched).not.toHaveBeenCalled();
      });
    }
  }
});
