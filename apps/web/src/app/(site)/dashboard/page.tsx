import type { Metadata } from "next";
import DashboardView from "@/components/DashboardView";

export const metadata: Metadata = { title: "My invitations" };

export default function DashboardPage() {
  return <DashboardView />;
}
