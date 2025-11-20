export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { bucketAdmin, getAdminDb } from "@/lib/firebase/admin";
import { buildZipFromSources, sanitizeFilename } from "@/lib/storage/zip";
import { requireAdmin } from "../../helpers";

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    const searchParams = new URL(req.url).searchParams;
    const token = searchParams.get("token") || null;
    const uid = await requireAdmin(req);

    const db = getAdminDb();
    const docRef = db.collection("session_orders").doc(orderId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
    }

    const data = snap.data() || {};
    if (!uid) {
      if (!token || token !== data.publicToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    if (data.status !== "paid" && data.status !== "fulfilled") {
      return NextResponse.json({ error: "Pagamento ainda não confirmado" }, { status: 409 });
    }

    const selectedPhotos = Array.isArray(data.selectedPhotos) ? data.selectedPhotos : [];
    if (!selectedPhotos.length) {
      return NextResponse.json({ error: "Sem fotos seleccionadas" }, { status: 400 });
    }

    const sources: { filename: string; data: Buffer; createdAt?: number | null }[] = [];
    const usedNames = new Map<string, number>();
    for (const photo of selectedPhotos) {
      const masterPath = typeof photo.masterPath === "string" ? photo.masterPath : null;
      if (!masterPath) continue;
      try {
        const file = bucketAdmin.file(masterPath);
        const [buffer] = await file.download();
        const ext = masterPath.includes(".") ? masterPath.split(".").pop() || "jpg" : "jpg";
        const baseName = sanitizeFilename(String(photo.title || masterPath.split("/").pop() || "foto"));
        let finalName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
        if (usedNames.has(finalName)) {
          const count = usedNames.get(finalName)! + 1;
          usedNames.set(finalName, count);
          const base = finalName.replace(/\.[^.]+$/, "");
          finalName = `${base}-${count}.${ext}`;
        } else {
          usedNames.set(finalName, 0);
        }
        sources.push({ filename: finalName, data: buffer, createdAt: photo.createdAt || null });
      } catch (error) {
        console.error("Falha ao transferir", masterPath, error);
      }
    }

    if (!sources.length) {
      return NextResponse.json({ error: "Não foi possível gerar o ZIP" }, { status: 500 });
    }

    const zipBuffer = buildZipFromSources(sources);
    await docRef.update({
      status: "fulfilled",
      fulfilledAt: FieldValue.serverTimestamp(),
      fulfilledAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const zipName = sanitizeFilename(data.sessionName || data.sessionId || "sessao");
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName || "sessao"}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
