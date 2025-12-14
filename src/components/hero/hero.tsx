import React, { useEffect, useMemo, useState } from "react";
import ImageTrail from "@/components/reactBits/ImageTrail/ImageTrail";
import TextType from "@/components/reactBits/TextType/TextType";
import '../../styles/shared/hero/hero.css';

const Hero = () => {
  const [trailItems, setTrailItems] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/trail-images/public", { cache: "no-store" });
        if (!res.ok) throw new Error("Erro ao carregar Image Trail");
        const data = await res.json();
        const items = Array.isArray(data?.items)
          ? (data.items as { imageUrl?: string | null }[])
              .map((it) => (typeof it.imageUrl === "string" ? it.imageUrl : ""))
              .filter(Boolean)
          : [];
        if (isMounted && items.length) {
          setTrailItems(items);
        }
      } catch (err) {
        console.error("[Hero] falha ao obter Image Trail", err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackItems = useMemo(
    () => [
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
      "/images/bryanminear.png",
    ],
    []
  );

  const itemsForTrail = trailItems.length ? trailItems : fallbackItems;
  const key = useMemo(() => `${itemsForTrail.join("|")}-${itemsForTrail.length}`, [itemsForTrail]);

  return (
    <section className="relative hero text-white ">
      {/* Altura do herói (ajuste como quiser) */}
      <div className="relative w-full h-[850px]">
        {/* ImageTrail atrás, ocupando tudo */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <ImageTrail
            key={key}
            items={itemsForTrail}
            variant={2}
          />
        </div>
        <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-none">
            
            <TextType className="text-center text-6xl md:text-8xl lg:text-8xl font-bold "
              text={[
                "Momentos,guardados para sempre.",               
              ]}
              typingSpeed={150}
              pauseDuration={1500}
              showCursor={true}             
              loop={false}
            />          
        </div>
      </div>
    </section>
  );
};

export default Hero;
