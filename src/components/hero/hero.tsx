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
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
              "/images/bryanminear.png",
            ]}
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
