// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { motion } from "framer-motion";
import { storage } from "@/lib/firebase/client";
import Uploader from "@/components/storage/Uploader";

export default function AdminGallery() {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState<string>("default");

  useEffect(() => {
    const loadImages = async () => {
      try {
        if (process.env.NEXT_PUBLIC_UPLOAD_VIA_API === "true") {
          const res = await fetch(`/api/gallery?folder=${encodeURIComponent(folder)}`);
          if (!res.ok) throw new Error("Falha a carregar galeria");
          const data = await res.json();
          const items: { name: string; path: string }[] = data.items || [];
          const urls = await Promise.all(
            items.map(async (it) => ({
              name: it.name,
              url: await getDownloadURL(ref(storage, it.path)),
            }))
          );
          setImages(urls);
        } else {
          const listRef = ref(storage, `uploads/${folder}/`);
          const res = await listAll(listRef);
          const urls = await Promise.all(
            res.items.map(async (itemRef) => ({
              name: itemRef.name,
              url: await getDownloadURL(itemRef),
            }))
          );
          setImages(urls);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadImages();
  }, [folder]);

  const handleDelete = async (name: string) => {
    if (!confirm("Tens a certeza que queres apagar esta imagem?")) return;
    try {
      if (process.env.NEXT_PUBLIC_UPLOAD_VIA_API === "true") {
        const res = await fetch("/api/gallery/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, folder }),
        });
        if (!res.ok) throw new Error("Falha a apagar");
      } else {
        await deleteObject(ref(storage, `uploads/${folder}/` + name));
      }
      setImages((prev) => prev.filter((img) => img.name !== name));
    } catch (e) {
      console.error(e);
      alert("Erro ao apagar");
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 gap-6 w-full">
      <motion.h1
        className="text-4xl font-bold text-pink-600"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
         Galeria Administrativa
      </motion.h1>

      <div className="w-full flex items-center gap-3">
        <input className="input input-bordered" placeholder="Pasta (uploads/…)" value={folder} onChange={(e) => setFolder(e.target.value)} />
        <Uploader folder={folder} onUploadComplete={() => location.reload()} />
      </div>

      {loading ? (
        <p className="text-gray-600 mt-8">A carregar imagens...</p>
      ) : (
        <motion.div
          className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
        >
          {images.map((img) => (
            <motion.div
              key={img.name}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition p-3"
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            >
              <img src={img.url} alt={img.name} className="w-full h-48 object-cover rounded-xl" />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-700 truncate">{img.name}</p>
                <button
                  className="text-red-500 hover:text-red-700 font-semibold"
                  onClick={() => handleDelete(img.name)}
                >
                  Apagar
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
