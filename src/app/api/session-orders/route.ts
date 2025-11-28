export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { randomUUID } from "crypto";

type Body = {
  sessionId?: string;
  photoIds?: string[];
};

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
    const value = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
    if (!value) continue;
    if (!cleaned.includes(value)) cleaned.push(value);
    if (cleaned.length >= MAX_SELECTION) break;
  }
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => ({}))) as Body;
    const sessionId = sanitizeSessionId(payload.sessionId || "");
    const photoIds = sanitizePhotoIds(payload.photoIds);

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });
    }
    if (!photoIds.length) {
      return NextResponse.json({ error: "Seleciona pelo menos uma foto" }, { status: 400 });
    }

    const db = getAdminDb();
    const sessionRef = db.collection("client_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
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
      })
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
        const fallbackTitle = rawId.slice(fallbackPrefix.length) || rawId.split("/").pop() || rawId;
        selectedPhotos.push({
          id: rawId,
          title: fallbackTitle,
          masterPath: rawId,
          createdAt: null,
        });
      }
    });

    if (!selectedPhotos.length) {
      return NextResponse.json({ error: "Não encontrámos essas fotos" }, { status: 400 });
    }

    const publicToken = randomUUID().replace(/-/g, "");
    const now = Date.now();
    const orderPayload = {
      sessionId,
      sessionName: (sessionSnap.data()?.name as string | undefined) || sessionId,
      selectedCount: selectedPhotos.length,
      selectedPhotos,
      status: "pending" as const,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp(),
      createdAtServer: FieldValue.serverTimestamp(),
      paymentConfirmedAt: null,
      fulfilledAt: null,
      publicToken,
    };

    const ordersCol = db.collection("session_orders");
    const docRef = await ordersCol.add(orderPayload);

    return NextResponse.json({ orderId: docRef.id, token: publicToken }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = sanitizeSessionId(searchParams.get("sessionId") || "");
    const status = (searchParams.get("status") || "").toLowerCase();

    const db = getAdminDb();

    if (status === "paid") {
      // evita índice composto: busca últimos pedidos e filtra pagos/fulfilled em memória
      const snapshot = await db.collection("session_orders").orderBy("createdAt", "desc").limit(200).get();

      const items = snapshot.docs
        .map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            status: data.status || "pending",
            token: data.publicToken,
            createdAt: data.createdAt || null,
            sessionId: data.sessionId,
            sessionName: data.sessionName || data.sessionId,
            selectedCount: data.selectedCount || (Array.isArray(data.selectedPhotos) ? data.selectedPhotos.length : 0),
          };
        })
        .filter((it) => it.status === "paid" || it.status === "fulfilled");

      return NextResponse.json({ items });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });
    }

    const snapshot = await db
      .collection("session_orders")
      .where("sessionId", "==", sessionId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ order: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data() || {};

    return NextResponse.json({
      order: {
        id: doc.id,
        status: data.status || "pending",
        token: data.publicToken,
        createdAt: data.createdAt || null,
        sessionId: data.sessionId,
        sessionName: data.sessionName || data.sessionId,
        selectedCount: data.selectedCount || (Array.isArray(data.selectedPhotos) ? data.selectedPhotos.length : 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
