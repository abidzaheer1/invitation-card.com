"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import SignInForm from "@/components/SignInForm";
import { useAuth } from "@/lib/auth-context";

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = use(searchParams);
  const router = useRouter();
  const { user, ready } = useAuth();
  const target = safeNext(next);

  useEffect(() => {
    if (ready && user && !user.isGuest) router.replace(target);
  }, [ready, user, router, target]);

  return (
    <main className="mx-auto max-w-md px-5 py-14">
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <SignInForm initialMode={mode === "signup" ? "signup" : "signin"} onDone={() => router.replace(target)} />
      </div>
    </main>
  );
}
