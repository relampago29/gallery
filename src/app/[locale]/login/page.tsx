// src/app/[locale]/login/page.tsx
import CardAuth from "@/components/ui/auth/CardAuth";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#030303] py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <CardAuth />
        <p className="mt-6 text-center text-sm text-white/70">
          Após iniciar sessão, regressas automaticamente ao backoffice.
        </p>
      </div>
    </div>
  );
}
