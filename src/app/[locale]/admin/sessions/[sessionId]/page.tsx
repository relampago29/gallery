"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  ImageIcon,
  Lock,
  UserPlus,
  Users,
  Trash2,
  Shield,
  ShieldOff,
} from "lucide-react";

import { AdminNotification } from "@/components/admin/Notification";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  downloadUrl: string;
  createdAt?: number;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function SessionDetailPage() {
  const params = useParams<{ locale: string; sessionId: string }>();
  const locale = params?.locale || "pt";
  const sessionId = params?.sessionId || "";
  const router = useRouter();

  const [photos, setPhotos] = useState<SessionPhoto[]>([]);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<
    Record<string, { email: string; freeAccess?: boolean }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [userMsg, setUserMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info" | "confirm";
    message: string;
    actions?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "ghost";
    }[];
  } | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const [photosRes, metaRes] = await Promise.all([
        fetch(
          `/api/session-photos/list?sessionId=${encodeURIComponent(sessionId)}&hours=48`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        ),
        fetch("/api/admin/sessions", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);
      if (!photosRes.ok) {
        const data = await photosRes.json().catch(() => ({}));
        throw new Error(data?.error || `Falha (${photosRes.status})`);
      }
      const photosData = await photosRes.json();
      setPhotos(Array.isArray(photosData.files) ? photosData.files : []);
      setSessionName(photosData.sessionName || sessionId);

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        const session = metaData.sessions?.find((s: any) => s.id === sessionId);
        if (session) {
          setOwnerEmail(session.ownerEmail || null);
          setAllowedUsers(session.allowedUsers || {});
        }
      }
    } catch (err: any) {
      setError(err?.message || "Falhou ao carregar as fotos da sessão.");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  async function assignOwner() {
    if (!assignEmail.trim()) return;
    setUserLoading(true);
    setUserMsg(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/sessions/assign-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, email: assignEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || "Falha ao associar utilizador.");
      setOwnerEmail(assignEmail.trim());
      setAssignEmail("");
      setUserMsg({ type: "ok", text: "Proprietário associado com sucesso." });
    } catch (err: any) {
      setUserMsg({ type: "err", text: err?.message || "Erro ao associar." });
    } finally {
      setUserLoading(false);
    }
  }

  async function removeOwner() {
    setToast({
      type: "confirm",
      message: "Tens a certeza que queres remover o proprietário desta sessão?",
      actions: [
        { label: "Cancelar", onClick: () => setToast(null), variant: "ghost" },
        {
          label: "Remover",
          onClick: async () => {
            setToast(null);
            setUserLoading(true);
            setUserMsg(null);
            try {
              const token = await getIdToken();
              const res = await fetch("/api/sessions/assign-user", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ sessionId, revoke: true }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok)
                throw new Error(
                  data?.error || "Falha ao remover proprietário.",
                );
              setOwnerEmail(null);
              setUserMsg({
                type: "ok",
                text: "Proprietário removido com sucesso.",
              });
            } catch (err: any) {
              setUserMsg({
                type: "err",
                text: err?.message || "Erro ao remover.",
              });
            } finally {
              setUserLoading(false);
            }
          },
          variant: "primary",
        },
      ],
    });
  }

  async function grantAccess(email: string, freeAccess: boolean) {
    if (!email.trim()) return;
    setUserLoading(true);
    setUserMsg(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/sessions/grant-access", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, email: email.trim(), freeAccess }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Falha ao conceder acesso.");
      setAllowedUsers(data.allowedUsers || {});
      setGuestEmail("");
      setUserMsg({ type: "ok", text: `Acesso concedido a ${email.trim()}.` });
    } catch (err: any) {
      setUserMsg({
        type: "err",
        text: err?.message || "Erro ao conceder acesso.",
      });
    } finally {
      setUserLoading(false);
    }
  }

  async function revokeAccess(email: string) {
    setUserLoading(true);
    setUserMsg(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/sessions/grant-access", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, email, revoke: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Falha ao revogar acesso.");
      setAllowedUsers(data.allowedUsers || {});
      setUserMsg({ type: "ok", text: `Acesso revogado de ${email}.` });
    } catch (err: any) {
      setUserMsg({
        type: "err",
        text: err?.message || "Erro ao revogar acesso.",
      });
    } finally {
      setUserLoading(false);
    }
  }

  async function toggleFreeAccess(email: string, currentFree: boolean) {
    await grantAccess(email, !currentFree);
  }

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="space-y-8">
      {toast && (
        <AdminNotification
          type={toast.type}
          message={toast.message}
          actions={toast.actions}
          onClose={() => setToast(null)}
        />
      )}

      {/* Back + header */}
      <header className="space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/sessions`)}
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar às sessões
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Sessão privada
            </p>
            <h1 className="text-4xl font-semibold text-white tracking-tight">
              {sessionName || sessionId}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPhotos}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Recarregar
            </button>
          </div>
        </div>
      </header>

      {/* Session info */}
      <div className={`${cardClass} divide-y divide-white/10`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-white/60">
            <ImageIcon size={14} />
            <span>
              <span className="font-semibold text-white">{photos.length}</span>{" "}
              {photos.length === 1 ? "foto" : "fotos"}
            </span>
          </div>
          {photos.length > 0 && (
            <a
              href={`/api/session-photos/download-all?sessionId=${encodeURIComponent(
                sessionId,
              )}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
            >
              <Download size={14} />
              Transferir tudo
            </a>
          )}
        </div>
      </div>

      {/* User Management */}
      <div className={`${cardClass} p-6 space-y-5`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
          <Users size={14} /> Gestão de utilizadores
        </h2>

        {userMsg && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              userMsg.type === "ok"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/40 bg-red-500/10 text-red-200"
            }`}
          >
            {userMsg.text}
          </div>
        )}

        {/* Owner */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Proprietário</p>
          {ownerEmail ? (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-white">
                <Shield size={14} className="text-emerald-400" />
                {ownerEmail}
              </div>
              <button
                type="button"
                onClick={removeOwner}
                disabled={userLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                title="Remover proprietário"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">
              Nenhum proprietário associado
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
              placeholder="email@exemplo.com"
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={assignOwner}
              disabled={userLoading || !assignEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-white/90 disabled:opacity-50"
            >
              <UserPlus size={12} />
              Associar
            </button>
          </div>
        </div>

        {/* Guests */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/50">Convidados</p>
          {Object.keys(allowedUsers).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(allowedUsers).map(([uid, info]) => (
                <div
                  key={uid}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-white">
                    <span>{info.email}</span>
                    {info.freeAccess && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Grátis
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        toggleFreeAccess(info.email, !!info.freeAccess)
                      }
                      disabled={userLoading}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 disabled:opacity-50"
                      title={
                        info.freeAccess
                          ? "Remover acesso grátis"
                          : "Dar acesso grátis"
                      }
                    >
                      {info.freeAccess ? (
                        <ShieldOff size={12} />
                      ) : (
                        <Shield size={12} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeAccess(info.email)}
                      disabled={userLoading}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      title="Revogar acesso"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">
              Nenhum convidado adicionado
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
              placeholder="email@exemplo.com"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={() => grantAccess(guestEmail, false)}
              disabled={userLoading || !guestEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-50"
            >
              <UserPlus size={12} />
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => grantAccess(guestEmail, true)}
              disabled={userLoading || !guestEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 px-4 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              <Shield size={12} />
              Grátis
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={`${cardClass} p-10 text-center text-sm text-white/50`}>
          A carregar fotos…
        </div>
      ) : photos.length === 0 && !error ? (
        <div className={`${cardClass} p-10 text-center`}>
          <Lock size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/50">
            Esta sessão ainda não tem fotos.
          </p>
        </div>
      ) : (
        /* Photo grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20"
            >
              <div className="aspect-4/3 bg-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.title || "Foto da sessão"}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {photo.title || "(sem título)"}
                  </p>
                  {photo.createdAt && (
                    <p className="text-[10px] uppercase tracking-wider text-white/40">
                      {new Date(photo.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <a
                  href={photo.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white transition hover:bg-white/10"
                >
                  <Download size={12} />
                  Transferir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
