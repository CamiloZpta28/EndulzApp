import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { getUser } from "@/lib/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const user = await getUser();

  if (user) redirect(next?.startsWith("/") ? next : "/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link href="/" className="text-primary inline-flex" aria-label="EndulzApp">
          <Logo markClassName="size-9" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "signup" ? "Crea tu cuenta" : "Entra a tu grupo"}
        </h1>
      </div>

      <AuthForm defaultMode={mode === "signup" ? "signup" : "signin"} next={next} />
    </main>
  );
}
