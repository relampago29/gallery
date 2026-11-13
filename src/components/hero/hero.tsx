import React from "react";
import TextType from "@/components/reactBits/TextType/TextType";
import "../../styles/shared/hero/hero.css";

const Hero = () => {
  const backgroundImage = "/images/bryanminear.png";

  return (
    <section className="relative text-white">
      <div
        className="relative h-[80vh] w-full overflow-hidden bg-black"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35" />
        <div className="relative z-10 flex h-full w-full items-center justify-center px-4">
          <TextType
            className="text-center text-5xl font-bold leading-tight sm:text-6xl md:text-7xl lg:text-8xl"
            text={["Momentos, guardados para sempre."]}
            typingSpeed={150}
            pauseDuration={1500}
            showCursor={false}
            loop={false}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
