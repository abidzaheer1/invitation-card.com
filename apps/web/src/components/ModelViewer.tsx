"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Model3DConfig } from "@invitation/shared";

// three.js is only downloaded in the browser, and only when a 3D element is on the page.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full" aria-hidden />,
});

/** Draws the 3D object and pauses rendering while it is scrolled out of view, to save battery. */
export default function ModelViewer({ model }: { model: Model3DConfig }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      <Scene3D model={model} active={visible} />
    </div>
  );
}
