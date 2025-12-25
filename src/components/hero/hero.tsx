import TextType from "@/components/reactBits/TextType/TextType";
import "../../styles/shared/hero/hero.css";

const Hero = () => {
  return (
    <section className="relative text-white overflow-hidden">
      <div className="hero relative w-full h-[820px] bg-center bg-cover">
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center">
          <TextType
            className="text-center text-5xl md:text-7xl lg:text-8xl font-bold"
            text={["Momentos, guardados para sempre."]}
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
