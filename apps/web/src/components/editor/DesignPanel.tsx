"use client";

import { FONTS, readableTextOn, type InvitationTheme } from "@invitation/shared";
import { contrastRatio } from "@/lib/color";
import { cx, field, hint, label } from "../ui";

function ColorField({ id, text, value, onChange }: { id: string; text: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="font-mono text-sm uppercase text-ink-soft">{value}</span>
      </div>
    </div>
  );
}

export default function DesignPanel({ theme, onTheme }: { theme: InvitationTheme; onTheme: (patch: Partial<InvitationTheme>) => void }) {
  const textContrast = contrastRatio(theme.textColor, theme.backgroundColor);
  const accentContrast = contrastRatio(theme.primaryColor, theme.backgroundColor);
  const headings = FONTS.filter((f) => f.role !== "body");
  const bodies = FONTS.filter((f) => f.role !== "heading");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ColorField id="c-bg" text="Background" value={theme.backgroundColor} onChange={(v) => onTheme({ backgroundColor: v })} />
        <ColorField id="c-text" text="Text" value={theme.textColor} onChange={(v) => onTheme({ textColor: v })} />
        <ColorField id="c-accent" text="Accent" value={theme.primaryColor} onChange={(v) => onTheme({ primaryColor: v })} />
      </div>
      {textContrast < 4.5 && (
        <p role="status" className="rounded-lg bg-marigold/15 px-3 py-2 text-sm font-medium">
          Text on this background may be hard to read. Try a darker or lighter text color.
        </p>
      )}
      {accentContrast < 3 && (
        <p role="status" className="rounded-lg bg-marigold/15 px-3 py-2 text-sm font-medium">
          The accent color is close to the background, so headings may fade out.
        </p>
      )}
      <div>
        <label className={label} htmlFor="f-heading">
          Heading font
        </label>
        <select id="f-heading" className={field} value={theme.fontHeading} onChange={(e) => onTheme({ fontHeading: e.target.value })}>
          {headings.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="f-body">
          Body font
        </label>
        <select id="f-body" className={field} value={theme.fontBody} onChange={(e) => onTheme({ fontBody: e.target.value })}>
          {bodies.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <p className={hint}>Fonts are served from our own server, so nothing is sent to third parties.</p>
      </div>
      <div
        className={cx("rounded-xl border border-line px-4 py-5 text-center")}
        style={{ background: theme.backgroundColor, color: theme.textColor, fontFamily: `"${theme.fontBody}", sans-serif` }}
      >
        <p className="text-3xl" style={{ color: theme.primaryColor, fontFamily: `"${theme.fontHeading}", serif` }}>
          Save the date
        </p>
        <p className="mt-1 text-sm">Sample text in your colors</p>
        <span
          className="mt-3 inline-block rounded-md px-4 py-1.5 text-sm font-semibold"
          style={{ background: theme.primaryColor, color: readableTextOn(theme.primaryColor) }}
        >
          Reply
        </span>
      </div>
    </div>
  );
}
