import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export async function ensureFirebaseUser(): Promise<void> {
  if (auth.currentUser) return;
  await new Promise<void>((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) { resolve(); return; }
      try {
        await signInAnonymously(auth);
        resolve();
      } catch (e) { reject(e); }
    });
  });
}
