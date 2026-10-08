"use client";

import dynamic from "next/dynamic";
import type { Model3DConfig } from "@invitation/shared";

// three.js is only downloaded in the browser, and only when a 3D element is on screen.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden />,
});

export default function ModelViewer({ model }: { model: Model3DConfig }) {
  return <Scene3D model={model} />;
}
