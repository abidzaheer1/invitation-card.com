import Link from "next/link";
import { headers } from "next/headers";
import Header from "@/components/Header";
import { invitationUrl } from "@/lib/host";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  const sample = invitationUrl("demo", host);

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
            <a href={sample} className="hover:text-ink">
              Sample invitation
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
