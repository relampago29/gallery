// src/app/[locale]/login/page.tsx
import CardAuth from "@/components/ui/auth/CardAuth";

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <CardAuth />
        <div className="text-center text-sm text-gray-600 mt-4">
          Após iniciar sessão, podes abrir a Dashboard.
        </div>
      </div>
    </div>
  );
}

