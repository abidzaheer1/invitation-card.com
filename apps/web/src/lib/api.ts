import type { PublicInvitation } from "@invitation/shared";

/** Server-side calls go straight to the API; the browser uses the same-origin /api path. */
function serverBase() {
  return `${process.env.INTERNAL_API_URL ?? "http://localhost:4000"}/api`;
}

export async function fetchPublicInvitation(slug: string): Promise<PublicInvitation | null> {
  try {
    const res = await fetch(`${serverBase()}/public/invitations/${encodeURIComponent(slug)}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicInvitation;
  } catch {
    return null;
  }
}
