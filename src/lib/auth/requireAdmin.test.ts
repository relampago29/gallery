import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyIdToken = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken }),
}));

import { requireAdminRequest } from "./requireAdmin";

const req = (token?: string) =>
  new Request("http://test", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

describe("requireAdminRequest", () => {
  beforeEach(() => verifyIdToken.mockReset());

  it("returns 401 without a token", async () => {
    const r = await requireAdminRequest(req());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("bad"));
    const r = await requireAdminRequest(req("x"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "u1" });
    const r = await requireAdminRequest(req("x"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("accepts an admin", async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: "a1", isAdmin: true });
    const r = await requireAdminRequest(req("x"));
    expect(r).toEqual({ ok: true, uid: "a1" });
  });
});
