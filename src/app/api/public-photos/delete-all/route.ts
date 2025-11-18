export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebase/admin";

export async function POST() {
  try {
    const collection = firestoreAdmin.collection("public_photos");
    const snap = await collection.get();

    if (snap.empty) {
      return NextResponse.json({ deleted: 0, message: "Nenhuma foto encontrada." }, { status: 200 });
    }

    // Firestore Admin não suporta batch > 500, por isso usamos bulkWriter (sem limite)
    const writer = firestoreAdmin.bulkWriter();
    let count = 0;

    snap.docs.forEach((doc) => {
      writer.delete(doc.ref);
      count += 1;
    });

    await writer.close();

    return NextResponse.json({ deleted: count }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/public-photos/delete-all] falhou:", err);
    return NextResponse.json({ error: err?.message || "Falha ao apagar todas as fotos." }, { status: 500 });
  }
}
