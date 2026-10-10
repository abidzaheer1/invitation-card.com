import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apexOrigin, inspectHost, invitationUrl } from "@/lib/host";

const APP_PATH = /^\/(create|dashboard|editor|signin|sign-in|login)(\/|$)/;

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const info = inspectHost(host);
  const { pathname, search } = request.nextUrl;

  if (info.slug) {
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/fonts")
    ) {
      return NextResponse.next();
    }
    // Designing and managing invitations stays on the main site.
    if (APP_PATH.test(pathname) || pathname.startsWith("/i/")) {
      return NextResponse.redirect(new URL(pathname + search, apexOrigin(host)));
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/i/${info.slug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // One public address per invitation: /i/sara-omar sends guests to sara-omar.our-domain.
  const match = pathname.match(/^\/i\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (match) {
    return NextResponse.redirect(new URL(invitationUrl(match[1], host)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
