import CardAuth from "@/components/ui/auth/CardAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ params, searchParams }: PageProps) {
  const [{ locale }, rawSearch] = await Promise.all([params, searchParams ?? Promise.resolve({ callbackUrl: undefined })]);
  const search = rawSearch ?? { callbackUrl: undefined };
  const session = await getServerSession(authOptions);
  const fallback = `/${locale}/admin/public/list`;
  const callback = normalizeCallbackUrl(search?.callbackUrl, fallback);

  if (session) {
    redirect(callback);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <CardAuth defaultCallbackUrl={callback} />
        <p className="text-center text-sm text-gray-600">
          Após iniciares sessão, serás redirecionado automaticamente para a lista de fotos.
        </p>
      </div>
    </div>
  );
}

function normalizeCallbackUrl(candidate: string | undefined, fallback: string) {
  if (!candidate) return fallback;

  try {
    const decoded = decodeURIComponent(candidate);
    return decoded.startsWith("/") ? decoded : fallback;
  } catch {
    return fallback;
  }
}
