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
    "Design an invitation webpage for a wedding, birthday or any celebration. Customize it, and we host it at its own address on our domain.",
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
