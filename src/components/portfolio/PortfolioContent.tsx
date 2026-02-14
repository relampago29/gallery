"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listPortfolioCategories, type Category } from "@/lib/categories";
import { PublicGallery } from "@/components/portfolio/PublicGallery";
import { ArrowLeft, Camera } from "lucide-react";

export default function PortfolioContent() {
  const t = useTranslations("portofolioPage");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  useEffect(() => {
    (async () => {
      try {
        const cats = await listPortfolioCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load portfolio categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // If a category is selected, show the photo gallery filtered by it
  if (selectedCategoryId) {
    return (
      <div className="space-y-8">
        {/* Back button + category title */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            <ArrowLeft size={16} />
            {t("backToCategories")}
          </button>
        </div>

        {selectedCategory && (
          <header className="space-y-2 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {selectedCategory.name}
            </h2>
            {selectedCategory.description && (
              <p className="mx-auto max-w-2xl text-sm text-white/60">
                {selectedCategory.description}
              </p>
            )}
          </header>
        )}

        <PublicGallery categoryId={selectedCategoryId} />
      </div>
    );
  }

  // Category cards grid
  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-white/70">
        {t("loadingCategories")}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-white/70">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => setSelectedCategoryId(cat.id)}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-left shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/25 hover:shadow-[0_25px_120px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {/* Cover image */}
          <div className="aspect-4/3 w-full overflow-hidden bg-white/5">
            {cat.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cat.coverUrl}
                alt={cat.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Camera
                  size={40}
                  className="text-white/20 transition group-hover:text-white/30"
                />
              </div>
            )}
          </div>

          {/* Gradient overlay with name */}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/60 to-transparent px-6 pb-6 pt-16">
            <h3 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              {cat.name}
            </h3>
            {cat.description && (
              <p className="mt-1 text-sm text-white/60 line-clamp-2">
                {cat.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
