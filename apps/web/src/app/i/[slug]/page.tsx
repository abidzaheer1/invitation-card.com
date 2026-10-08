import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InvitationView from "@/components/InvitationView";
import { fetchPublicInvitation } from "@/lib/api";
import { sampleInvitation } from "@/lib/sample";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (slug === "demo") return { invitation: sampleInvitation, demo: true };
  return { invitation: await fetchPublicInvitation(slug), demo: false };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { invitation } = await load(slug);
  if (!invitation) return { title: "Invitation not found" };
  const { content } = invitation;
  const title = content.title || "You're invited";
  const description = content.hosts ? `${content.hosts}: ${title}` : `You're invited: ${title}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    robots: slug === "demo" ? undefined : { index: false },
  };
}

export default async function InvitationPage({ params }: Params) {
  const { slug } = await params;
  const { invitation, demo } = await load(slug);
  if (!invitation) notFound();
  return <InvitationView invitation={invitation} demo={demo} />;
}
