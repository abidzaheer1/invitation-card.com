import { validateSlug } from "./types";

/**
 * The label in front of our domain for a hosted invitation.
 * `sara-omar.invitation-card.com` and `sara-omar.localhost` both yield `sara-omar`.
 * `demo` is allowed so the sample page can live on its own address.
 * Returns null for the main site (apex, www, localhost).
 */
export function invitationSlugFromHostname(hostname: string, rootDomain?: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "").split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return null;

  let slug: string | null = null;
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length);
    if (label && !label.includes(".")) slug = label;
  } else if (rootDomain) {
    const root = rootDomain.trim().toLowerCase().replace(/\.$/, "");
    if (!root || host === root || host === `www.${root}`) return null;
    const suffix = `.${root}`;
    if (host.endsWith(suffix)) {
      const label = host.slice(0, -suffix.length);
      if (label && !label.includes(".")) slug = label;
    }
  } else {
    const parts = host.split(".");
    if (parts.length >= 3 && parts[0] !== "www") slug = parts[0];
  }

  if (!slug) return null;
  if (slug === "demo") return "demo";
  if (validateSlug(slug)) return null;
  return slug;
}
