import Link from "next/link";
import ModelViewer from "@/components/ModelViewer";

const EVENTS = [
  { name: "Weddings", note: "Nikah, valima, receptions" },
  { name: "Engagements", note: "Share the news in style" },
  { name: "Birthdays", note: "Kids to milestone years" },
  { name: "Baby showers", note: "Gender reveals and more" },
  { name: "Anniversaries", note: "Celebrate the years" },
  { name: "Gatherings", note: "Graduations, parties, corporate events" },
];

const FEATURES = [
  {
    title: "Templates for every event",
    body: "Start from a design made for your occasion, then fill in your details and make it yours.",
  },
  {
    title: "3D that wows guests",
    body: "Add rings, hearts, balloons or your own 3D models. Guests can turn them with a finger.",
  },
  {
    title: "RSVPs built in",
    body: "Collect responses with a ready-made form, or add your own questions like meal choice or number of guests.",
  },
  {
    title: "One link to share",
    body: "Send your invitation on WhatsApp or anywhere else. It opens fast on any phone, with no app to install.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-wide text-amber-400">Invitation-card.com</span>
        <Link
          href="/i/demo"
          className="rounded-lg border border-amber-400/60 px-4 py-2 text-sm text-amber-300 transition hover:bg-amber-400 hover:text-neutral-900"
        >
          See a demo
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-6 pb-20 pt-8 md:grid-cols-2">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400/80">Invitation websites</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
            Invitations your guests will remember
          </h1>
          <p className="mt-5 max-w-lg text-lg text-stone-300">
            Build a beautiful invitation website for your wedding, birthday or any celebration, with 3D
            elements and RSVPs built in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/i/demo"
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-neutral-900 transition hover:bg-amber-400"
            >
              View sample invitation
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-400">Creating your own is coming soon.</p>
        </div>
        <div className="h-72 sm:h-96" aria-hidden>
          <ModelViewer model={{ kind: "rings", autoRotate: true, color: "#d4a017" }} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">For every kind of celebration</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((e) => (
            <div key={e.name} className="rounded-2xl border border-stone-700/60 bg-stone-900/40 p-6">
              <h3 className="text-lg font-medium text-amber-300">{e.name}</h3>
              <p className="mt-1 text-stone-400">{e.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h3 className="text-xl font-medium">{f.title}</h3>
              <p className="mt-2 text-stone-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-800 px-6 py-10 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} Invitation-card.com
      </footer>
    </main>
  );
}
