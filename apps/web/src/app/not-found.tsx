import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sage px-6 text-center">
      <h1 className="font-display text-5xl font-semibold text-forest">Nothing here</h1>
      <p className="mt-3 max-w-md text-ink-soft">This page doesn&apos;t exist, or the invitation hasn&apos;t been published yet.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-forest px-5 py-2.5 font-semibold text-white hover:bg-forest-soft"
      >
        Back to home
      </Link>
    </main>
  );
}
