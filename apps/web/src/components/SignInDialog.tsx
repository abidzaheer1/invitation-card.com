"use client";

import { useEffect, useRef } from "react";
import type { SignInReason } from "@/lib/auth-context";
import Icon from "./Icon";
import SignInForm from "./SignInForm";

/** A native <dialog>, so focus stays inside it and Esc closes it. */
export default function SignInDialog({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason: SignInReason;
  onClose: (signedIn: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Sign in"
      onClose={() => onClose(false)}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-white p-0 text-ink backdrop:bg-forest-deep/60"
    >
      {open && (
        <div className="relative p-6 sm:p-7">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="absolute right-3 top-3 rounded-lg p-2 text-ink-soft hover:bg-sage-deep hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
          <SignInForm reason={reason} onDone={() => onClose(true)} />
        </div>
      )}
    </dialog>
  );
}
