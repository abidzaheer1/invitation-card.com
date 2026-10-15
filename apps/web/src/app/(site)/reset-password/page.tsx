import type { Metadata } from "next";
import ResetPasswordView from "@/components/ResetPasswordView";

// The link holds a secret, so keep it out of search results and out of Referer headers.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordView token={token ?? ""} />;
}
