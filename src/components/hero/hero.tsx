"use client";

import { useEffect, useState } from "react";
import TextType from "@/components/reactBits/TextType/TextType";
import ImageTrail from "@/components/reactBits/ImageTrail/ImageTrail";
import { useTranslations } from "next-intl";
import "../../styles/shared/hero/hero.css";

const Hero = () => {
  const t = useTranslations("hero");
  const [trailImages, setTrailImages] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/trail-images/public")
      .then((r) => r.json())
      .then((data) => {
        const urls = (data.items ?? [])
          .map((item: { imageUrl?: string }) => item.imageUrl)
          .filter(Boolean) as string[];
        setTrailImages(urls);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative text-white overflow-hidden">
      <div className="hero relative w-full h-[820px] bg-center bg-cover">
        {/* Image trail effect on mouse move */}
        {trailImages.length > 0 && (
          <div className="absolute inset-0 z-[1]">
            <ImageTrail items={trailImages} variant={1} />
          </div>
        )}

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center pointer-events-none">
          <TextType
            className="text-center text-5xl md:text-7xl lg:text-8xl font-bold"
            text={[t("headline")]}
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
