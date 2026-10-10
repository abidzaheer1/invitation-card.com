import type { Metadata, Viewport } from "next";
import AuthProvider from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Invitation-card.com | Invitation websites with 3D and RSVPs",
    template: "%s | Invitation-card.com",
  },
  description:
    "Make an invitation website for your wedding, birthday or any celebration. Add 3D objects, photos and a reply form, then share one link.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b3a33",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
