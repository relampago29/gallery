import Masonry from "@/components/reactBits/Masonry/Masonry";
import React, { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Highlight } from "@/lib/highlights";

const fallbackItems = [
  { id: "placeholder-1", imageUrl: "https://picsum.photos/id/1015/600/900?grayscale", height: 420 },
  { id: "placeholder-2", imageUrl: "https://picsum.photos/id/1011/600/750?grayscale", height: 260 },
  { id: "placeholder-3", imageUrl: "https://picsum.photos/id/1020/600/800?grayscale", height: 600 },
];

const PortofolioHomePage = () => {
  const translate = useTranslations("protofolioHomePage");
  const [items, setItems] = useState<{ id: string; img: string; height: number }[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/highlights/list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return Array.isArray(data.items) ? (data.items as Highlight[]) : [];
      })
      .then((highlights) => {
        if (!mounted) return;
        if (!highlights.length) {
          setItems(fallbackItems.map((it) => ({ id: it.id, img: it.imageUrl, height: it.height })));
          return;
        }
        setItems(
          highlights.map((h) => ({
            id: h.id,
            img: h.imageUrl,
            height: h.height || 420,
          }))
        );
      })
      .catch(() => {
        if (mounted) {
          setItems(fallbackItems.map((it) => ({ id: it.id, img: it.imageUrl, height: it.height })));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!items.length) {
    return (
      <div className="relative bg-black portofolioHomePage w-full h-[650px] p-10">
        <h1 className="text-3xl font-bold text-white">{translate("highlights")}</h1>
        <p className="mt-6 text-white/70">Sem destaques de momento.</p>
      </div>
    );
  }

  return (
    <div className="relative bg-black portofolioHomePage w-full h-[850px] p-6 sm:p-10">
      <h1 className="absolute top-6 left-6 z-10 pointer-events-none text-4xl font-bold text-white">
        {translate("highlights")}
      </h1>
      <Masonry
        items={items}
        ease="power3.out"
        duration={0.6}
        stagger={0.1}
        animateFrom="top"
        scaleOnHover={true}
        hoverScale={0.95}
        blurToFocus={true}
        colorShiftOnHover={false}
      />
    </div>
  );
};

export default PortofolioHomePage;
