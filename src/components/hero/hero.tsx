import React from "react";
import ImageTrail from "@/components/reactBits/ImageTrail/ImageTrail";
import TextType from "@/components/reactBits/TextType/TextType";
import '../../styles/shared/hero/hero.css';

const Hero = () => {
  const key = React.useMemo(() => Date.now(), []);

  return (
    <section className="relative hero text-white ">
      {/* Altura do herói (ajuste como quiser) */}
      <div className="relative w-full h-[850px]">
        {/* ImageTrail atrás, ocupando tudo */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <ImageTrail
            key={key}
            items={[
              "https://picsum.photos/id/287/300/300",
              "https://picsum.photos/id/1001/300/300",
              "https://picsum.photos/id/1025/300/300",
              "https://picsum.photos/id/1026/300/300",
              "https://picsum.photos/id/1027/300/300",
              "https://picsum.photos/id/1028/300/300",
              "https://picsum.photos/id/1029/300/300",
              "https://picsum.photos/id/1030/300/300",
            ]}
            variant={2}
          />
        </div>

        {/* Texto centrado por cima */}
        <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-none">
          <p className="text-center text-6xl md:text-8xl lg:text-8xl font-bold ">
            <TextType
              text={[
                "Momentos,guardados para sempre.",               
              ]}
              typingSpeed={150}
              pauseDuration={1500}
              showCursor={true}             
              loop={false}
            />
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
