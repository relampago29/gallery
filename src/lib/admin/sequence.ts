import type { Firestore } from "firebase-admin/firestore";

export function parseNumberFromTitle(title?: string | null) {
  if (!title) return null;
  const match = title.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

async function queryMaxBySequence(baseQuery: FirebaseFirestore.Query) {
  try {
    const snap = await baseQuery.orderBy("sequenceNumber", "desc").limit(1).get();
    if (!snap.empty) {
      const value = snap.docs[0].get("sequenceNumber");
      if (typeof value === "number") return value;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function findPublicMaxSequence(db: Firestore) {
  const seq = await queryMaxBySequence(db.collection("public_photos"));
  if (typeof seq === "number") return seq;

  const snap = await db.collection("public_photos").orderBy("createdAt", "desc").limit(50).get();
  let max = 0;
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const candidate = parseNumberFromTitle(data.title);
    if (typeof candidate === "number" && candidate > max) {
      max = candidate;
    }
  });
  return max;
}

export async function findPrivateMaxSequence(db: Firestore, sessionId: string) {
  const collectionRef = db.collection("client_sessions").doc(sessionId).collection("photos");
  const seq = await queryMaxBySequence(collectionRef);
  if (typeof seq === "number") return seq;

  const snap = await collectionRef.orderBy("createdAt", "desc").limit(50).get();
  let max = 0;
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const candidate = parseNumberFromTitle(data.title);
    if (typeof candidate === "number" && candidate > max) {
      max = candidate;
    }
  });
  return max;
}
