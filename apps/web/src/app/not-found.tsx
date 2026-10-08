import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold">Nothing here</h1>
      <p className="mt-3 max-w-md opacity-75">
        This invitation doesn&apos;t exist or hasn&apos;t been published yet.
      </p>
      <Link href="/" className="mt-6 rounded-lg bg-amber-600 px-5 py-2 font-medium text-white">
        Back to home
      </Link>
    </main>
  );
}
