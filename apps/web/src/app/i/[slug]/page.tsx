import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isUploadUrl } from "@invitation/shared";
import InvitationView from "@/components/InvitationView";
import { fetchPublicInvitation } from "@/lib/api";
import { apexOrigin, invitationUrl } from "@/lib/host";
import { getSampleInvitation } from "@/lib/sample";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 15;

async function load(slug: string) {
  if (slug === "demo") return { invitation: getSampleInvitation(), demo: true };
  return { invitation: await fetchPublicInvitation(slug), demo: false };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { invitation } = await load(slug);
  if (!invitation) return { title: "Invitation not found" };
  const { content } = invitation;
  const title = content.title || "You're invited";
  const description = content.hosts ? `${content.hosts}: ${title}` : `You're invited: ${title}`;
  const cover = isUploadUrl(content.coverImageUrl) ? content.coverImageUrl : undefined;
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  const canonical = invitationUrl(slug, host);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical, images: cover ? [{ url: cover }] : undefined },
    twitter: { card: cover ? "summary_large_image" : "summary", title, description },
    robots: slug === "demo" ? undefined : { index: false },
  };
}

export default async function InvitationPage({ params }: Params) {
  const { slug } = await params;
  const { invitation, demo } = await load(slug);
  if (!invitation) notFound();
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  return <InvitationView invitation={invitation} demo={demo} homeHref={apexOrigin(host)} />;
}
