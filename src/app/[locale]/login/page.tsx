// src/app/[locale]/login/page.tsx
import CardAuth from "@/components/ui/auth/CardAuth";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030303] px-4">
      {/* Background photo */}
      <div className="absolute inset-0">
        <img
          src="/images/bryanminear.png"
          alt=""
          className="h-full w-full object-cover opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <CardAuth />
      </div>
    </div>
  );
}
