import type { Metadata } from "next";
import Editor from "@/components/editor/Editor";

export const metadata: Metadata = { title: "Edit invitation", robots: { index: false } };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Editor id={id} />;
}
