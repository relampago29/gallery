import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WEEKS = 8;
const MONTHS = 6;

function startOfWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1 - day); // start on Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ts: number) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupByWeek<T extends { createdAt?: number | null }>(items: T[]) {
  const map = new Map<number, T[]>();
  for (const item of items) {
    if (!item.createdAt || typeof item.createdAt !== "number") continue;
    const wk = startOfWeek(item.createdAt);
    map.set(wk, [...(map.get(wk) || []), item]);
  }
  return map;
}

function groupByMonth<T extends { createdAt?: number | null }>(items: T[]) {
  const map = new Map<number, T[]>();
  for (const item of items) {
    if (!item.createdAt || typeof item.createdAt !== "number") continue;
    const m = startOfMonth(item.createdAt);
    map.set(m, [...(map.get(m) || []), item]);
  }
  return map;
}

export async function GET() {
  try {
    const db = getAdminDb();
    const now = Date.now();
    const oldest = now - WEEKS * 7 * 24 * 60 * 60 * 1000;
    const oldestMonth = now - MONTHS * 30 * 24 * 60 * 60 * 1000;

    const [publicSnap, ordersSnap] = await Promise.all([
      db.collection("public_photos").where("createdAt", ">=", oldest).orderBy("createdAt", "desc").get(),
      db.collection("session_orders").where("createdAt", ">=", oldestMonth).orderBy("createdAt", "desc").get(),
    ]);

    const publicItems = publicSnap.docs.map((doc) => {
      const data = doc.data() || {};
      return { id: doc.id, createdAt: typeof data.createdAt === "number" ? data.createdAt : null };
    });
    const orderItems = ordersSnap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        status: typeof data.status === "string" ? data.status : "pending",
      };
    });

    const uploadsByWeek = groupByWeek(publicItems);
    const ordersByWeek = groupByWeek(orderItems);
    const uploadsByMonth = groupByMonth(publicItems);
    const ordersByMonth = groupByMonth(orderItems);

    const weeks: { week: number; uploads: number; orders: number; paid: number }[] = [];
    for (let i = WEEKS - 1; i >= 0; i -= 1) {
      const wk = startOfWeek(now - i * 7 * 24 * 60 * 60 * 1000);
      const uploads = uploadsByWeek.get(wk)?.length || 0;
      const ordersArr = ordersByWeek.get(wk) || [];
      const orders = ordersArr.length;
      const paid = ordersArr.filter((o) => o.status === "paid" || o.status === "fulfilled").length;
      weeks.push({ week: wk, uploads, orders, paid });
    }

    const months: { month: number; uploads: number; orders: number; paid: number }[] = [];
    for (let i = MONTHS - 1; i >= 0; i -= 1) {
      const m = startOfMonth(now - i * 30 * 24 * 60 * 60 * 1000);
      const uploads = uploadsByMonth.get(m)?.length || 0;
      const ordersArr = ordersByMonth.get(m) || [];
      const orders = ordersArr.length;
      const paid = ordersArr.filter((o) => o.status === "paid" || o.status === "fulfilled").length;
      months.push({ month: m, uploads, orders, paid });
    }

    return NextResponse.json({ weeks, months });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "server error" }, { status: 500 });
  }
}
