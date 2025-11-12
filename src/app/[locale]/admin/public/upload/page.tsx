"use client";

import { useEffect, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import { uploadMasterAndCreateProcessingDoc, uploadPrivateMaster } from "@/lib/publicPhotos";

export default function UploadPublicPhotoPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public'|'private'>('public');
  const [privateLinks, setPrivateLinks] = useState<{name: string; url: string}[]>([]);
  const [expiryHours, setExpiryHours] = useState<number>(48);
  const [privatePaths, setPrivatePaths] = useState<{name: string; path: string}[]>([]);

  async function signPrivatePaths(paths: {name: string; path: string}[]) {
    const out: {name: string; url: string}[] = [];
    for (const p of paths) {
      try {
        const res = await fetch(`/api/storage/sign?path=${encodeURIComponent(p.path)}&hours=${expiryHours}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.url) out.push({ name: p.name, url: data.url });
        }
      } catch {}
    }
    return out;
  }

  useEffect(() => {
    (async () => {
      const c = await listActiveCategories();
      setCats(c.map((x) => ({ id: x.id, name: x.name })));
      if (c.length) setCategoryId(c[0].id);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (visibility === 'public' && (!categoryId || files.length === 0)) return;
    if (visibility === 'private' && files.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      if (visibility === 'public') {
        for (const f of files) {
          // sequencial para evitar sobrecarga
          // aplicar mesmo título/alt opcionalmente
          await uploadMasterAndCreateProcessingDoc({ file: f, categoryId, title, alt });
        }
        setMsg(`${files.length} ficheiro(s) enviados para a pasta pública. As variantes serão geradas.`);
        setPrivateLinks([]);
      } else {
        const paths: {name: string; path: string}[] = [];
        for (const f of files) {
          const { masterPath } = await uploadPrivateMaster(f);
          paths.push({ name: f.name, path: masterPath });
        }
        setPrivatePaths(paths);
        const links = await signPrivatePaths(paths);
        setPrivateLinks(links);
        setMsg(`${files.length} ficheiro(s) enviados para a pasta privada. Links ${links.length ? 'gerados' : 'serão gerados em instantes'} por ${expiryHours}h.`);
      }
      setFiles([]);
      setTitle("");
      setAlt("");
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Upload (Portfólio)</h1>
        <p className="text-sm text-gray-500">Seleciona uma categoria, escolhe uma imagem e envia.</p>
      </header>

      <section className="bg-white rounded-xl shadow-sm border max-w-2xl">
        <form className="p-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Destino</span></div>
              <select className="select select-bordered w-full" value={visibility} onChange={(e) => setVisibility((e.target.value as 'public'|'private'))}>
                <option value="public">Pasta pública</option>
                <option value="private">Pasta privada</option>
              </select>
            </label>
            <label className="form-control w-full">
              <div className="label"><span className="label-text">Categoria</span></div>
              <select className="select select-bordered w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={visibility === 'private'}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            {visibility === 'private' && (
              <label className="form-control w-full">
                <div className="label"><span className="label-text">Validade do link</span></div>
                <select className="select select-bordered w-full" value={expiryHours} onChange={(e) => setExpiryHours(Number(e.target.value))}>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={168}>7 dias</option>
                </select>
              </label>
            )}

            <label className="form-control w-full">
              <div className="label"><span className="label-text">Ficheiro</span></div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="file-input file-input-bordered w-full"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className="input input-bordered w-full"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={visibility === 'private'}
            />
            <input
              className="input input-bordered w-full"
              placeholder="Alt (opcional)"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              disabled={visibility === 'private'}
            />
          </div>

          {files.length > 0 && (
            <div className="rounded-lg border p-3 bg-gray-50 text-sm text-gray-600">
              Selecionados: <span className="font-medium">{files.length}</span> ficheiro(s)
            </div>
          )}

          <div className="pt-2">
            <button
              className="btn btn-primary"
              disabled={busy || files.length === 0 || (visibility === 'public' && !categoryId)}
            >
              {busy ? "A enviar…" : visibility === 'public' ? "Guardar (público)" : "Guardar (privado)"}
            </button>
          </div>
        </form>

        {msg && (
          <div className="p-4 border-t bg-indigo-50 text-indigo-700 text-sm rounded-b-xl">
            {msg}
          </div>
        )}
      </section>
      {visibility === 'private' && (
        <section className="bg-white rounded-xl shadow-sm border max-w-2xl">
          <div className="p-4 border-b font-medium flex items-center justify-between">
            <span>Links de download (válidos por {expiryHours}h)</span>
            {privatePaths.length > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const links = await signPrivatePaths(privatePaths);
                    setPrivateLinks(links);
                    if (!links.length) setMsg('Ainda a preparar os ficheiros. Tenta novamente em alguns segundos.');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                Gerar links
              </button>
            )}
          </div>
          {privateLinks.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Sem links ainda. Assim que os ficheiros ficarem visíveis, clica em "Gerar links".</div>
          ) : (
            <ul className="p-4 space-y-2">
              {privateLinks.map((l, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3">
                  <div className="truncate">
                    <div className="font-medium truncate max-w-[420px]">{l.name}</div>
                    <a className="text-xs text-blue-600 hover:underline break-all" href={l.url} target="_blank" rel="noreferrer">
                      {l.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => navigator.clipboard.writeText(l.url)}
                  >
                    Copiar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
