import Link from "next/link";
import Header from "@/components/Header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="min-h-[70vh]">{children}</div>
      <footer className="border-t border-line px-5 py-8 text-sm text-ink-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Invitation-card.com</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/create" className="hover:text-ink">
              Designs
            </Link>
            <Link href="/i/demo" className="hover:text-ink">
              Sample invitation
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
