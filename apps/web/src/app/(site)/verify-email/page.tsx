import type { Metadata } from "next";
import VerifyEmailView from "@/components/VerifyEmailView";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyEmailView token={token ?? ""} />;
}
