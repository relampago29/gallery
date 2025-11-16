// src/components/storage/Uploader.tsx
"use client";
import { useState } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { UploadCloud } from "lucide-react";

export default function Uploader({ folder = "default", onUploadComplete }: { folder?: string; onUploadComplete?: () => void }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const safeFolder = (folder || "default").replace(/[^A-Za-z0-9_-]/g, "-");
      const viaApi = process.env.NEXT_PUBLIC_UPLOAD_VIA_API === "true";
      if (viaApi) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", file.name);
        form.append("folder", safeFolder);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Upload API falhou (${res.status})`);
        }
      } else {
        await uploadBytes(ref(storage, `uploads/${safeFolder}/` + file.name), file);
      }
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
      <UploadCloud size={18} />
      {uploading ? "A carregar..." : "Carregar imagem"}
      <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
    </label>
  );
}
