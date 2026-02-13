export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { randomUUID } from "crypto";

const MAX_ITEMS = 200;

type ItemInput = {
  photoId: string;
  eventId: string;
  masterPath: string;
  title: string | null;
  pricePerPhoto: number;
  createdAt: number | null;
};

async function requireUser(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return decoded.uid || null;
  } catch {
    return null;
  }
}

/** POST /api/event-orders — cria um pedido de fotos de eventos */
export async function POST(req: Request) {
  try {
    const uid = await requireUser(req);
    if (!uid) {
      return NextResponse.json(
        { error: "Tens de iniciar sessão para comprar fotos." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawItems: ItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!rawItems.length) {
      return NextResponse.json(
        { error: "Seleciona pelo menos uma foto." },
        { status: 400 }
      );
    }

    // Sanitize & deduplicate
    const seen = new Set<string>();
    const items: ItemInput[] = [];
    for (const raw of rawItems) {
      if (!raw.photoId || !raw.eventId || !raw.masterPath) continue;
      if (seen.has(raw.photoId)) continue;
      seen.add(raw.photoId);
      items.push({
        photoId: String(raw.photoId).trim(),
        eventId: String(raw.eventId).trim(),
        masterPath: String(raw.masterPath).trim(),
        title: raw.title ? String(raw.title).trim() : null,
        pricePerPhoto:
          typeof raw.pricePerPhoto === "number" ? raw.pricePerPhoto : 0,
        createdAt: typeof raw.createdAt === "number" ? raw.createdAt : null,
      });
      if (items.length >= MAX_ITEMS) break;
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Nenhuma foto válida." },
        { status: 400 }
      );
    }

    const totalPrice = items.reduce(
      (sum, i) => sum + (i.pricePerPhoto || 0),
      0
    );

    // Group by event for the summary
    const eventIds = [...new Set(items.map((i) => i.eventId))];

    const db = getAdminDb();

    // Fetch event names
    const eventNames: Record<string, string> = {};
    await Promise.all(
      eventIds.map(async (id) => {
        try {
          const snap = await db.collection("events").doc(id).get();
          if (snap.exists) {
            eventNames[id] = (snap.data()?.title as string) || id;
          } else {
            eventNames[id] = id;
          }
        } catch {
          eventNames[id] = id;
        }
      })
    );

    const publicToken = randomUUID().replace(/-/g, "");
    const now = Date.now();

    const orderPayload = {
      userId: uid,
      items,
      itemCount: items.length,
      totalPrice,
      eventIds,
      eventNames,
      status: "pending" as const,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp(),
      createdAtServer: FieldValue.serverTimestamp(),
      paymentConfirmedAt: null,
      fulfilledAt: null,
      publicToken,
    };

    const docRef = await db.collection("event_orders").add(orderPayload);

    return NextResponse.json(
      { orderId: docRef.id, token: publicToken },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}

/** GET /api/event-orders — lista pedidos do utilizador autenticado */
export async function GET(req: Request) {
  try {
    const uid = await requireUser(req);
    if (!uid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();

    let snapshot;
    try {
      // Requires composite index (userId ASC, createdAt DESC)
      snapshot = await db
        .collection("event_orders")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (indexErr: any) {
      // Fallback if composite index not yet deployed
      console.warn(
        "[event-orders] index error, using fallback:",
        indexErr?.message
      );
      snapshot = await db
        .collection("event_orders")
        .where("userId", "==", uid)
        .limit(50)
        .get();
    }

    const orders = snapshot.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        status: d.status,
        itemCount: d.itemCount || (Array.isArray(d.items) ? d.items.length : 0),
        totalPrice: d.totalPrice || 0,
        eventNames: d.eventNames || {},
        createdAt: d.createdAt || null,
        paymentConfirmedAt:
          d.paymentConfirmedAtMs || d.paymentConfirmedAt || null,
        fulfilledAt: d.fulfilledAtMs || d.fulfilledAt || null,
        publicToken: d.publicToken,
      };
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
