import "server-only";

import { bucketAdmin, getAdminDb } from "@/lib/firebase/admin";
import { DownloadAllButton } from "@/components/sessions/DownloadAllButton";
import { clampHours } from "@/lib/sessions/share";

export const dynamic = "force-dynamic";

export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; sessionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SessionPhoto = {
  id: string;

  title?: string | null;

  url: string;

  createdAt?: number;

  downloadName?: string;

  downloadUrl: string;
};

function sanitizeSessionId(raw: string) {
  return raw

    .trim()

    .replace(/%20/g, "-")

    .replace(/[^A-Za-z0-9_-]/g, "-")

    .replace(/-+/g, "-")

    .replace(/^-|-$/g, "");
}

function sanitizeFilename(input: string) {
  return (
    input

      .trim()

      .replace(/\s+/g, "_")

      .replace(/[^A-Za-z0-9._-]/g, "_")

      .replace(/_+/g, "_")

      .replace(/^_+|_+$/g, "") || "foto"
  );
}

function buildDownloadName(
  masterPath: string,
  title?: string | null,
  fallback?: string
) {
  const ext = masterPath.includes(".")
    ? masterPath.split(".").pop() || "jpg"
    : "jpg";

  const base = sanitizeFilename(title || fallback || "foto");

  const normalizedExt = ext.toLowerCase();

  const baseWithoutExt = base.toLowerCase().endsWith(`.${normalizedExt}`)
    ? base.slice(0, base.length - (normalizedExt.length + 1))
    : base;

  return `${baseWithoutExt}.${ext}`
    .replace(/\.+/g, ".")
    .replace(/\.{2,}/g, ".");
}

async function listSessionFiles(
  sessionId: string,

  hours: number
): Promise<{
  files: SessionPhoto[];
  expiresAt: Date;
  sessionName?: string | null;
}> {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const db = getAdminDb();

  const sessionRef = db.collection("client_sessions").doc(sessionId);

  const sessionSnap = await sessionRef.get();

  const sessionName = sessionSnap.exists
    ? (sessionSnap.data()?.name as string | undefined | null)
    : null;

  const photosSnap = await sessionRef
    .collection("photos")
    .orderBy("createdAt", "asc")
    .get();

  const photos = photosSnap.docs;

  const files: SessionPhoto[] = (
    await Promise.all(
      photos.map(async (doc) => {
        const data = doc.data() || {};

        const masterPath = data.masterPath as string | undefined;

        if (!masterPath) return null;

        try {
          const file = bucketAdmin.file(masterPath);

          const downloadName = buildDownloadName(
            masterPath,
            data.title,
            doc.id
          );

          const [url] = await file.getSignedUrl({
            action: "read",

            expires: expiresAt,
          });

          const downloadUrl = `/api/session-photos/download?path=${encodeURIComponent(
            masterPath
          )}&name=${encodeURIComponent(downloadName)}`;

          return {
            id: doc.id,

            title: data.title || data.alt || masterPath.split("/").pop(),

            url,

            createdAt:
              typeof data.createdAt === "number" ? data.createdAt : undefined,

            downloadName,

            downloadUrl,
          } as SessionPhoto;
        } catch {
          return null;
        }
      })
    )
  ).filter((f): f is SessionPhoto => f !== null);

  if (files.length === 0) {
    const prefix = `masters/sessions/${sessionId}/`;

    try {
      const [objects] = await bucketAdmin.getFiles({ prefix });

      const fallback = await Promise.all(
        (objects || [])

          .filter((f) => f.name !== prefix && !f.name.endsWith("/"))

          .map(async (file) => {
            try {
              const downloadName = buildDownloadName(
                file.name,
                file.name.slice(prefix.length),
                file.name
              );

              const [url] = await file.getSignedUrl({
                action: "read",

                expires: expiresAt,
              });

              return {
                id: file.name,

                title: file.name.slice(prefix.length),

                url,

                downloadName,

                downloadUrl: `/api/session-photos/download?path=${encodeURIComponent(
                  file.name
                )}&name=${encodeURIComponent(downloadName)}`,
              } as SessionPhoto;
            } catch {
              return null;
            }
          })
      );

      const filtered = fallback.filter((f): f is SessionPhoto => Boolean(f));

      if (filtered.length) {
        return { files: filtered, expiresAt, sessionName };
      }
    } catch {
      // ignore fallback error; keeps files empty so UI pode avisar
    }
  }

  return { files, expiresAt, sessionName };
}

export const runtime = "nodejs";

export default async function SessionSharePage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const requestedId = decodeURIComponent(resolvedParams.sessionId || "");
  const sessionId = sanitizeSessionId(requestedId);
  const hoursParam = Array.isArray(resolvedSearch?.hours) ? resolvedSearch?.hours[0] : resolvedSearch?.hours;
  const hours = clampHours(hoursParam ? Number(hoursParam) : 48);

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
          <h1 className="text-2xl font-semibold">SessÃ£o invÃ¡lida</h1>
          <p className="text-gray-600">Confirma se o link estÃ¡ correto ou pede um novo link ao fotÃ³grafo.</p>
        </div>
      </main>
    );
  }

  let filesData: { files: SessionPhoto[]; expiresAt: Date; sessionName?: string | null };
  try {
    filesData = await listSessionFiles(sessionId, hours);
  } catch (err: any) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
          <h1 className="text-2xl font-semibold">NÃ£o conseguimos listar esta sessÃ£o</h1>
          <p className="text-gray-600">Erro: {err?.message || String(err)}. Por favor pede um novo link ao fotÃ³grafo.</p>
        </div>
      </main>
    );
  }

  const { files, expiresAt, sessionName } = filesData;
  const friendlyName =
    sessionName && sessionName.trim().length
      ? sessionName
      : requestedId && requestedId.trim().length > 0
        ? requestedId.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
        : sessionId;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030303] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_55%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#7c3aed2a] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b62b] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10 py-12 px-4 sm:px-6 lg:px-8">
        <header className="space-y-4 text-center sm:text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">Galeria privada</p>
              <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
                {friendlyName || sessionId}
              </h1>
            </div>
            {files.length > 0 ? <DownloadAllButton sessionId={sessionId} /> : null}
          </div>
          <p className="text-sm text-white/70">
            Link ativo por {hours}h Â· expira em {expiresAt.toLocaleString("pt-PT")}. Recarrega para atualizar os ficheiros.
          </p>
        </header>

        {files.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/70 backdrop-blur-sm">
            Ainda nÃ£o existem fotos nesta sessÃ£o. Volta a abrir o link em alguns minutos.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/30"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-70" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.title || "Foto"}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <div className="text-base font-medium text-white truncate">{file.title || "(sem tÃ­tulo)"}</div>
                  {file.createdAt ? (
                    <div className="text-xs text-white/60 uppercase tracking-wide">
                      {new Date(file.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  ) : null}
                  <a
                    href={file.downloadUrl}
                    download={file.downloadName || undefined}
                    className="inline-flex w-full items-center justify-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                  >
                    Transferir
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
