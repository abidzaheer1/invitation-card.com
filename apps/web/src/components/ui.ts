/** Shared class names so buttons and fields look the same everywhere. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const button = {
  primary: cx(base, "bg-marigold px-5 py-2.5 text-forest-deep hover:bg-marigold-deep"),
  dark: cx(base, "bg-forest px-5 py-2.5 text-white hover:bg-forest-soft"),
  outline: cx(base, "border border-line bg-white px-4 py-2 text-ink hover:border-forest-soft"),
  ghost: cx(base, "px-3 py-2 text-ink-soft hover:bg-sage-deep hover:text-ink"),
  danger: cx(base, "border border-danger/40 bg-white px-4 py-2 text-danger hover:bg-danger hover:text-white"),
  small: "px-3 py-1.5 text-sm",
};

export const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink-soft/60 focus:border-forest-soft";

export const label = "mb-1.5 block text-sm font-semibold text-ink";
export const hint = "mt-1.5 text-sm text-ink-soft";
