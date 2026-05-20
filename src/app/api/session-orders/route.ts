export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { randomUUID } from "crypto";

type Body = {
  sessionId?: string;
  photoIds?: string[];
};

/** Verifica token e devolve { uid, isAdmin } ou null */
async function verifyToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const isAdmin =
      (decoded as any)?.isAdmin === true ||
      (decoded as any)?.claims?.isAdmin === true;
    return { uid: decoded.uid, email: decoded.email, isAdmin };
  } catch {
    return null;
  }
}

function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const MAX_SELECTION = 800;

function sanitizePhotoIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const raw of input) {
    const value =
      typeof raw === "string" ? raw.trim() : String(raw || "").trim();
    if (!value) continue;
    if (!cleaned.includes(value)) cleaned.push(value);
    if (cleaned.length >= MAX_SELECTION) break;
  }
  return cleaned;
}

export async function POST(req: Request) {
  try {
    // Auth obrigatório
    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Autenticação obrigatória" },
        { status: 401 },
      );
    }

    const payload = (await req.json().catch(() => ({}))) as Body;
    const sessionId = sanitizeSessionId(payload.sessionId || "");
    const photoIds = sanitizePhotoIds(payload.photoIds);

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatório" },
        { status: 400 },
      );
    }
    if (!photoIds.length) {
      return NextResponse.json(
        { error: "Seleciona pelo menos uma foto" },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 },
      );
    }

    const sessionData = sessionSnap.data() || {};

    // Verificar acesso
    if (!auth.isAdmin) {
      const isOwner = sessionData.ownerUid === auth.uid;
      const allowedUids: string[] = Array.isArray(sessionData.allowedUids)
        ? sessionData.allowedUids
        : [];
      const isGuest = allowedUids.includes(auth.uid);
      if (!isOwner && !isGuest) {
        return NextResponse.json(
          { error: "Sem acesso a esta sessão" },
          { status: 403 },
        );
      }
    }

    // Verificar se o utilizador tem acesso gratuito
    let hasFreeAccess = false;
    if (sessionData.ownerUid === auth.uid) {
      hasFreeAccess = sessionData.ownerFreeAccess === true;
    } else {
      const guests = sessionData.allowedUsers || {};
      hasFreeAccess = guests[auth.uid]?.freeAccess === true;
    }

    const photoCollection = sessionRef.collection("photos");
    const selectedPhotos: {
      id: string;
      title: string | null;
      masterPath: string;
      createdAt: number | null;
    }[] = [];

    const snapshots = await Promise.all(
      photoIds.map(async (photoId) => {
        try {
          return await photoCollection.doc(photoId).get();
        } catch {
          return null;
        }
      }),
    );

    const fallbackPrefix = `masters/sessions/${sessionId}/`;

    snapshots.forEach((snap, index) => {
      const rawId = photoIds[index];
      if (snap && snap.exists) {
        const data = snap.data() || {};
        const masterPath = data.masterPath as string | undefined;
        if (!masterPath) return;
        selectedPhotos.push({
          id: snap.id,
          title: (data.title || data.alt || snap.id || null) as string | null,
          masterPath,
          createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        });
        return;
      }

      if (typeof rawId === "string" && rawId.startsWith(fallbackPrefix)) {
        const fallbackTitle =
          rawId.slice(fallbackPrefix.length) || rawId.split("/").pop() || rawId;
        selectedPhotos.push({
          id: rawId,
          title: fallbackTitle,
          masterPath: rawId,
          createdAt: null,
        });
      }
    });

    if (!selectedPhotos.length) {
      return NextResponse.json(
        { error: "Não encontrámos essas fotos" },
        { status: 400 },
      );
    }

    const publicToken = randomUUID().replace(/-/g, "");
    const now = Date.now();

    // Se tem acesso gratuito, o pedido já nasce como "paid"
    const initialStatus = hasFreeAccess ? "paid" : "pending";

    const orderPayload: Record<string, unknown> = {
      sessionId,
      sessionName: (sessionData.name as string | undefined) || sessionId,
      selectedCount: selectedPhotos.length,
      selectedPhotos,
      status: initialStatus,
      userId: auth.uid,
      userEmail: auth.email || null,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp(),
      createdAtServer: FieldValue.serverTimestamp(),
      paymentConfirmedAt: hasFreeAccess ? FieldValue.serverTimestamp() : null,
      fulfilledAt: null,
      publicToken,
    };

    const ordersCol = db.collection("session_orders");
    const docRef = await ordersCol.add(orderPayload);

    return NextResponse.json(
      {
        orderId: docRef.id,
        token: publicToken,
        status: initialStatus,
        freeAccess: hasFreeAccess,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    // Auth obrigatório para consultar pedidos
    const auth = await verifyToken(req);
    if (!auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // ── Admin list by status (/api/session-orders?status=paid) ─────────────
    if (statusFilter && auth.isAdmin) {
      const db = getAdminDb();
      const snapshot = await db
        .collection("session_orders")
        .where("status", "==", statusFilter)
        .limit(200)
        .get();

      const items = snapshot.docs
        .map((doc) => {
          const d = doc.data() || {};
          return {
            id: doc.id,
            sessionId: d.sessionId,
            sessionName: d.sessionName || d.sessionId,
            selectedCount:
              d.selectedCount ||
              (Array.isArray(d.selectedPhotos) ? d.selectedPhotos.length : 0),
            createdAt: d.createdAt || null,
            status: d.status || statusFilter,
          };
        })
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta; // desc: mais recentes primeiro
        });

      return NextResponse.json({ items });
    }

    // ── Single order lookup by sessionId ───────────────────────────────────
    const sessionId = sanitizeSessionId(searchParams.get("sessionId") || "");
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId obrigatório" },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    // Filtrar pedidos pelo userId do utilizador autenticado (a menos que seja admin)
    // Note: no orderBy to avoid composite index requirement — sort in JS
    let query = db
      .collection("session_orders")
      .where("sessionId", "==", sessionId);

    if (!auth.isAdmin) {
      query = query.where("userId", "==", auth.uid);
    }

    const snapshot = await query.limit(20).get();

    if (snapshot.empty) {
      return NextResponse.json({ order: null });
    }

    // Sort by createdAt descending in JS, take the most recent
    const sorted = snapshot.docs.sort((a, b) => {
      const ta = (a.data()?.createdAt as number) || 0;
      const tb = (b.data()?.createdAt as number) || 0;
      return tb - ta;
    });
    const doc = sorted[0];
    const data = doc.data() || {};

    return NextResponse.json({
      order: {
        id: doc.id,
        status: data.status || "pending",
        token: data.publicToken,
        createdAt: data.createdAt || null,
        sessionId: data.sessionId,
        sessionName: data.sessionName || data.sessionId,
        selectedCount:
          data.selectedCount ||
          (Array.isArray(data.selectedPhotos) ? data.selectedPhotos.length : 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
