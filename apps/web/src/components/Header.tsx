"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { button, cx } from "./ui";

const NAV = [
  { href: "/create", label: "Designs" },
  { href: "/dashboard", label: "My invitations" },
];

export default function Header() {
  const { user, ready, requestSignIn, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const signedIn = user && !user.isGuest;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-sage/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="font-display text-xl font-semibold text-forest">
          Invitation-card.com
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {[...NAV, ...(signedIn ? [{ href: "/account", label: "Account" }] : [])]
            .filter((n) => n.href !== "/dashboard" || user)
            .map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-semibold",
                pathname.startsWith(n.href) ? "bg-sage-deep text-forest" : "text-ink-soft hover:bg-sage-deep hover:text-ink",
              )}
            >
              {n.label}
            </Link>
          ))}

          {ready &&
            (signedIn ? (
              <div className="ml-1 flex items-center gap-2 sm:ml-2">
                <button
                  type="button"
                  className={cx(button.outline, button.small)}
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={cx(button.dark, button.small, "ml-1 sm:ml-2")}
                onClick={() => requestSignIn("general")}
              >
                Sign in
              </button>
            ))}
        </nav>
      </div>
    </header>
  );
}
