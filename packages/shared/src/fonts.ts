/**
 * Fonts an invitation can use. The web app self-hosts these (see apps/web/public/fonts),
 * so guests never make a request to a third-party font service.
 */
export interface FontOption {
  name: string;
  /** Where it reads best */
  role: "heading" | "body" | "both";
  /** CSS fallback stack used until the font loads */
  fallback: string;
}

export const FONTS: FontOption[] = [
  { name: "Playfair Display", role: "heading", fallback: "Georgia, 'Times New Roman', serif" },
  { name: "Cormorant Garamond", role: "heading", fallback: "Georgia, 'Times New Roman', serif" },
  { name: "Cinzel", role: "heading", fallback: "Georgia, 'Times New Roman', serif" },
  { name: "Great Vibes", role: "heading", fallback: "'Brush Script MT', cursive" },
  { name: "Dancing Script", role: "heading", fallback: "'Brush Script MT', cursive" },
  { name: "Montserrat", role: "both", fallback: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { name: "Poppins", role: "both", fallback: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { name: "Inter", role: "body", fallback: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { name: "Lora", role: "body", fallback: "Georgia, 'Times New Roman', serif" },
];

export const FONT_NAMES: string[] = FONTS.map((f) => f.name);

/** A CSS `font-family` value for a known font name. Unknown names fall back to a safe default. */
export function fontStack(name: string | undefined): string {
  const font = FONTS.find((f) => f.name === name);
  return font ? `"${font.name}", ${font.fallback}` : "system-ui, 'Segoe UI', Roboto, sans-serif";
}
