"use client";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Uploader from "@/components/storage/Uploader";
import EmailPasswordForm from "@/components/ui/auth/EmailPasswordForm";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <span className="loading loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Área Reservada</h1>
        <p className="mb-4 text-sm opacity-80">
          Precisa de iniciar sessão para aceder ao admin.
        </p>
        <EmailPasswordForm />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button className="btn btn-sm" onClick={() => auth.signOut()}>
          Terminar sessão
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Uploads</h2>
        <Uploader folder={`uploads/${user.uid}`} />
      </section>
    </div>
  );
}

