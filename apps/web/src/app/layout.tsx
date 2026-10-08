import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Invitation-card.com | Beautiful 3D invitation websites",
    template: "%s | Invitation-card.com",
  },
  description:
    "Create stunning invitation websites for weddings, birthdays and every celebration, with 3D elements and built-in RSVP forms.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
