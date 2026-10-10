import Link from "next/link";
import { headers } from "next/headers";
import { EVENT_LABELS, EVENT_TYPES, TEMPLATES, templatesForEvent } from "@invitation/shared";
import HeroPhone from "@/components/HeroPhone";
import { button, cx } from "@/components/ui";
import { invitationUrl } from "@/lib/host";

const STEPS = [
  {
    title: "Choose a design",
    body: `Start from a layout made for your kind of event. There are ${TEMPLATES.length} to pick from, each with starting text you can replace.`,
  },
  {
    title: "Customize the page",
    body: "Change the words, colors and fonts, add photos, and pick a 3D object or upload your own. The page preview updates as you type.",
  },
  {
    title: "We host it",
    body: "Publish and the page goes live at an address you choose on our domain. Send that address anywhere, and replies collect on the page.",
  },
];

const INCLUDED = [
  {
    title: "3D guests can turn",
    body: "Rings, a heart, balloons, a cake, a gift or stars. Or upload your own .glb model.",
  },
  {
    title: "A reply form you control",
    body: "Guests accept, decline or say maybe. Add your own questions, like how many are coming or what they would like to eat.",
  },
  {
    title: "Countdown and calendar",
    body: "A live countdown to the day, and a button that puts the event in a guest's calendar.",
  },
  {
    title: "Quick on any phone",
    body: "Pages load fast, and the 3D scene only loads when it is on screen.",
  },
  {
    title: "An address of its own",
    body: "Every published invitation is a webpage at a name you pick, such as sara-and-omar.invitation-card.com. Guests open it in the browser.",
  },
];

export default async function Home() {
  const host = (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
  const sample = invitationUrl("demo", host);

  return (
    <main>
      <section className="on-dark bg-forest text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              An invitation webpage, hosted for you
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">
              Design a page for a wedding, birthday or any gathering. Customize the words, photos, colors and reply
              form, then publish it at its own address on our domain.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/create" className={cx(button.primary, "px-7 py-3.5 text-lg")}>
                Create your invitation
              </Link>
              <a href={sample} className="font-semibold text-white underline underline-offset-4 hover:text-marigold">
                See a full sample
              </a>
            </div>
            <p className="mt-5 text-white/70">You don&apos;t need an account until you publish.</p>
          </div>
          <HeroPhone />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl font-semibold text-forest sm:text-4xl">
          From a design to a live webpage
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t-2 border-forest pt-5">
              <span className="font-display text-4xl text-marigold-deep" aria-hidden>
                {i + 1}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 max-w-sm text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white" aria-labelledby="events">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 id="events" className="font-display text-3xl font-semibold text-forest sm:text-4xl">
            Designs for every occasion
          </h2>
          <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
            {EVENT_TYPES.map((type) => {
              const count = templatesForEvent(type).length;
              return (
                <li key={type} className="border-b border-line">
                  <Link
                    href={`/create?event=${type}`}
                    className="group flex items-baseline justify-between py-4 text-xl font-semibold hover:text-forest-soft"
                  >
                    <span className="underline-offset-4 group-hover:underline">{EVENT_LABELS[type]}</span>
                    <span className="text-base font-normal text-ink-soft">
                      {count} {count === 1 ? "design" : "designs"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20" aria-labelledby="included">
        <h2 id="included" className="font-display text-3xl font-semibold text-forest sm:text-4xl">
          What every invitation includes
        </h2>
        <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {INCLUDED.map((f) => (
            <div key={f.title} className="border-t border-line pt-4">
              <dt className="text-lg font-semibold">{f.title}</dt>
              <dd className="mt-1.5 max-w-md text-ink-soft">{f.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="on-dark bg-forest text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
          <h2 className="max-w-xl font-display text-3xl font-semibold sm:text-4xl">Your webpage is a few minutes away</h2>
          <Link href="/create" className={cx(button.primary, "px-7 py-3.5 text-lg")}>
            Create your invitation
          </Link>
        </div>
      </section>
    </main>
  );
}
