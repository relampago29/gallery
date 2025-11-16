import { db } from "@/lib/firebase/client";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

export type Category = { id: string; name: string; active: boolean; description?: string | null };

type ListOptions = { activeOnly?: boolean };

async function listCategoriesInternal({ activeOnly = true }: ListOptions = {}): Promise<Category[]> {
  try {
    const res = await fetch("/api/categories", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const items = (data.items || []) as Category[];
      return activeOnly ? items.filter((x) => x.active) : items;
    }
  } catch {
    // ignora erro e tenta fallback
  }

  const constraints: any[] = [orderBy("name", "asc")];
  if (activeOnly) {
    constraints.unshift(where("active", "==", true));
  }

  const snap = await getDocs(query(collection(db, "categories"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Lista apenas categorias ativas (fallback automático).
 */
export async function listActiveCategories(): Promise<Category[]> {
  return listCategoriesInternal({ activeOnly: true });
}

/**
 * Lista todas as categorias (ativas e inativas) com fallback.
 */
export async function listAllCategories(): Promise<Category[]> {
  return listCategoriesInternal({ activeOnly: false });
}
