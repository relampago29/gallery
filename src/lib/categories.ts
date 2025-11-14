import { db } from "@/lib/firebase/client";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

export type Category = { id: string; name: string; active: boolean; description?: string|null };

/**
 * Lista categorias ativas. Tenta primeiro via API (Admin SDK),
 * e faz fallback para o Firestore client se necessário.
 */
export async function listActiveCategories(): Promise<Category[]> {
  // 1) API server (ignora rules do client, ideal para o admin)
  try {
    const res = await fetch("/api/categories", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      // filtra só as ativas para manter contrato do helper
      return (data.items || []).filter((x: any) => x.active);
    }
  } catch {
    // ignora e cai no client SDK
  }

  // 2) Fallback: Firestore client (precisa das rules deployadas)
  const qs = query(
    collection(db, "categories"),
    where("active", "==", true),
    orderBy("name", "asc")
  );
  const snap = await getDocs(qs);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
