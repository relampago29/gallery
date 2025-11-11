"use client";

import { useEffect, useState } from "react";
import { listActiveCategories } from "@/lib/categories";
import { uploadMasterAndCreateProcessingDoc } from "@/lib/publicPhotos";

export default function UploadPublicPhotoPage() {
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const c = await listActiveCategories();
      setCats(c.map((x) => ({ id: x.id, name: x.name })));
      if (c.length) setCategoryId(c[0].id);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !categoryId) return;
    setBusy(true);
    setMsg(null);
    try {
      await uploadMasterAndCreateProcessingDoc({ file, categoryId, title, alt });
      setMsg("Upload concluído. As variantes serão geradas em instantes.");
      setFile(null);
      setTitle("");
      setAlt("");
    } catch (e: any) {
      setMsg("Erro: " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upload (Portfólio)</h1>

      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="form-control w-full">
          <div className="label"><span className="label-text">Categoria</span></div>
          <select className="select select-bordered w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="form-control w-full">
          <div className="label"><span className="label-text">Ficheiro</span></div>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </label>

        <input
          className="input input-bordered w-full"
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="input input-bordered w-full"
          placeholder="Alt (opcional)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />

        <button className="btn btn-primary" disabled={busy || !file || !categoryId}>
          {busy ? "A enviar…" : "Guardar"}
        </button>
      </form>

      {msg && (
        <div className="alert alert-info">
          <span>{msg}</span>
        </div>
      )}
    </main>
  );
}
