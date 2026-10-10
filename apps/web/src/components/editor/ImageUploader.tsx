"use client";

import { useId, useRef, useState } from "react";
import { isUploadUrl, type UploadResult } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Icon from "../Icon";
import { button, cx } from "../ui";

export async function uploadFile(file: File, kind: "image" | "model"): Promise<UploadResult> {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  return apiFetch<UploadResult>("/uploads", { method: "POST", form });
}

/** Picks a file, uploads it and reports the stored URL. Shows a thumbnail for images. */
export default function FileUploader({
  kind,
  value,
  onChange,
  label,
  accept,
  maxMb,
}: {
  kind: "image" | "model";
  value?: string;
  onChange: (url: string | undefined) => void;
  label: string;
  accept?: string;
  maxMb?: number;
}) {
  const { ensureSession } = useAuth();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const limit = maxMb ?? (kind === "image" ? 8 : 12);
  const acceptTypes = accept ?? (kind === "image" ? "image/jpeg,image/png,image/webp" : ".glb,model/gltf-binary");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > limit * 1024 * 1024) {
      setError(`That file is larger than ${limit} MB.`);
      return;
    }
    setBusy(true);
    try {
      await ensureSession();
      const res = await uploadFile(file, kind);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {kind === "image" && isUploadUrl(value) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-14 w-14 rounded-lg border border-line object-cover" />
        )}
        {kind === "model" && isUploadUrl(value) && (
          <span className="rounded-lg bg-sage-deep px-3 py-2 text-sm font-medium">Model uploaded</span>
        )}
        <label htmlFor={id} className={cx(button.outline, button.small, "cursor-pointer", busy && "opacity-60")}>
          <Icon name={kind === "image" ? "image" : "cube"} size={15} />
          {busy ? "Uploading…" : value ? `Replace ${label}` : `Add ${label}`}
        </label>
        <input
          id={id}
          ref={input}
          type="file"
          accept={acceptTypes}
          disabled={busy}
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {value && !busy && (
          <button type="button" className={cx(button.ghost, button.small)} onClick={() => onChange(undefined)}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
