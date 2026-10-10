import { invitationSlugFromHostname } from "@invitation/shared";

export interface HostInfo {
  hostname: string;
  port: string;
  local: boolean;
  /** Domain the invitation address hangs from, without a slug. */
  apexHost: string;
  slug: string | null;
}

/** Reads the browser Host header and decides whether this request is an invitation site. */
export function inspectHost(hostHeader: string | null | undefined): HostInfo {
  const raw = (hostHeader || "localhost:3000").trim().toLowerCase();
  const colon = raw.lastIndexOf(":");
  const hostname = colon > -1 && /^\d+$/.test(raw.slice(colon + 1)) ? raw.slice(0, colon) : raw;
  const port = colon > -1 && /^\d+$/.test(raw.slice(colon + 1)) ? raw.slice(colon + 1) : "";
  const local = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1";

  if (local) {
    return {
      hostname,
      port,
      local: true,
      apexHost: "localhost",
      slug: invitationSlugFromHostname(hostname),
    };
  }

  const slug = invitationSlugFromHostname(hostname);
  let apexHost = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  if (slug) apexHost = hostname.slice(slug.length + 1);
  return { hostname, port, local: false, apexHost, slug };
}

/** Public address of a hosted invitation, with a trailing slash. */
export function invitationUrl(slug: string, hostHeader?: string | null): string {
  const info = inspectHost(hostHeader);
  if (info.local) return `http://${slug}.localhost:${info.port || "3000"}/`;
  return `https://${slug}.${info.apexHost}/`;
}

/** The product site, where people design and manage invitations. */
export function apexOrigin(hostHeader?: string | null): string {
  const info = inspectHost(hostHeader);
  if (info.local) return `http://localhost:${info.port || "3000"}`;
  return `https://${info.apexHost}`;
}

/** The part after the chosen name: `localhost:3000` or `invitation-card.com`. */
export function addressSuffix(hostHeader?: string | null): string {
  const info = inspectHost(hostHeader);
  if (info.local) return `localhost:${info.port || "3000"}`;
  return info.apexHost;
}
