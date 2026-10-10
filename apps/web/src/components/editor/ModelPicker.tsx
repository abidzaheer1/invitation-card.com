"use client";

import { MODEL_KINDS, MODEL_LABELS, type Model3DConfig, type Model3DKind } from "@invitation/shared";
import ModelIcon from "../ModelIcon";
import { cx, hint, label } from "../ui";
import FileUploader from "./ImageUploader";

const DEFAULT_COLOR = "#d4a017";

export default function ModelPicker({
  value,
  onChange,
  idPrefix,
}: {
  value?: Model3DConfig;
  onChange: (m: Model3DConfig) => void;
  idPrefix: string;
}) {
  const model: Model3DConfig = value ?? { kind: "none" };
  const set = (patch: Partial<Model3DConfig>) => onChange({ ...model, ...patch });
  const pick = (kind: Model3DKind) => onChange({ ...model, kind, autoRotate: model.autoRotate ?? true });

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="3D object" className="grid grid-cols-4 gap-2">
        {MODEL_KINDS.map((kind) => {
          const active = model.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(kind)}
              className={cx(
                "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-semibold",
                active ? "border-forest bg-sage-deep text-forest" : "border-line bg-white text-ink-soft hover:border-forest-soft",
              )}
            >
              {kind === "none" ? <span className="h-9 w-9 rounded-full border border-dashed border-line" /> : <ModelIcon kind={kind} color={model.color ?? DEFAULT_COLOR} size={36} />}
              {kind === "custom" ? "Your own" : MODEL_LABELS[kind]}
            </button>
          );
        })}
      </div>

      {model.kind === "custom" && (
        <div>
          <span className={label}>Model file</span>
          <FileUploader kind="model" label="model (.glb)" value={model.url} onChange={(url) => set({ url })} />
          <p className={hint}>A .glb file up to 12 MB. Keep it light so it loads fast on phones.</p>
        </div>
      )}

      {model.kind !== "none" && model.kind !== "custom" && (
        <div>
          <label className={label} htmlFor={`${idPrefix}-color`}>
            Color
          </label>
          <input
            id={`${idPrefix}-color`}
            type="color"
            className="h-10 w-16 cursor-pointer rounded-lg border border-line bg-white p-1"
            value={model.color ?? DEFAULT_COLOR}
            onChange={(e) => set({ color: e.target.value })}
          />
        </div>
      )}

      {model.kind !== "none" && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-forest" checked={model.autoRotate ?? true} onChange={(e) => set({ autoRotate: e.target.checked })} />
          Turn slowly by itself
        </label>
      )}
    </div>
  );
}
