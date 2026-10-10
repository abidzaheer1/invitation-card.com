import type { Metadata } from "next";
import { EVENT_TYPES, type EventType } from "@invitation/shared";
import TemplateGallery from "@/components/TemplateGallery";

export const metadata: Metadata = { title: "Choose a design" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const initialEvent = (EVENT_TYPES as readonly string[]).includes(event ?? "") ? (event as EventType) : undefined;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-semibold text-forest sm:text-5xl">Choose a design</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-soft">
        Pick the one closest to your event. You can change every word, color and font afterwards.
      </p>
      <div className="mt-10">
        <TemplateGallery initialEvent={initialEvent} />
      </div>
    </main>
  );
}
