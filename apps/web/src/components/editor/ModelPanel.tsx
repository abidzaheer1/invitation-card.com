"use client";

import { SECTION_LABELS, type InvitationSection, type Model3DConfig } from "@invitation/shared";
import { useState } from "react";
import { field, hint, label } from "../ui";
import ModelPicker from "./ModelPicker";

export default function ModelPanel({
  sections,
  onModel,
}: {
  sections: InvitationSection[];
  onModel: (sectionId: string, model: Model3DConfig) => void;
}) {
  const candidates = sections.filter((s) => s.type !== "rsvp");
  const hero = candidates.find((s) => s.type === "hero") ?? candidates[0];
  const [selected, setSelected] = useState(hero?.id ?? "");
  const section = candidates.find((s) => s.id === selected) ?? hero;

  if (!section) return <p className="text-ink-soft">Add a section first, then you can place a 3D object in it.</p>;

  return (
    <div className="space-y-5">
      <p className="text-ink-soft">
        Place a 3D object in any section. Guests can drag it to turn it around. Choose “Your own” to upload a .glb model.
      </p>
      <div>
        <label className={label} htmlFor="m-section">
          Show it in
        </label>
        <select id="m-section" className={field} value={section.id} onChange={(e) => setSelected(e.target.value)}>
          {candidates.map((s, i) => (
            <option key={s.id} value={s.id}>
              {SECTION_LABELS[s.type]}
              {s.title ? `: ${s.title}` : ""} {s.model && s.model.kind !== "none" ? "(has 3D)" : ""}
              {candidates.filter((c) => c.type === s.type).length > 1 ? ` #${i + 1}` : ""}
            </option>
          ))}
        </select>
        <p className={hint}>Each section can have its own object.</p>
      </div>
      <ModelPicker key={section.id} idPrefix={`m-${section.id}`} value={section.model} onChange={(m) => onModel(section.id, m)} />
    </div>
  );
}
