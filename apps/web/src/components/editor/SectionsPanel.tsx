"use client";

import { SECTION_LABELS, SECTION_TYPES, newSectionId, type InvitationSection, type SectionType } from "@invitation/shared";
import { useState } from "react";
import Icon from "../Icon";
import { button, cx, field, hint, label } from "../ui";
import FileUploader from "./ImageUploader";

const BODY_HINT: Partial<Record<SectionType, string>> = {
  schedule: "One item per line, for example “4:00 pm Ceremony”.",
  hero: "A short line shown under the title.",
};

function SectionCard({
  section,
  index,
  count,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  section: InvitationSection;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<InvitationSection>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const fixed = section.type === "hero";
  const hasText = section.type !== "rsvp" && section.type !== "venue" && section.type !== "countdown";
  const urls = section.imageUrls ?? [];

  return (
    <li className="rounded-xl border border-line bg-white">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left"
        >
          <Icon name={open ? "down" : "up"} size={16} className={open ? "" : "rotate-90"} />
          <span className="truncate font-semibold">{SECTION_LABELS[section.type]}</span>
          {section.title && <span className="truncate text-sm text-ink-soft">{section.title}</span>}
        </button>
        <button type="button" className={cx(button.ghost, button.small)} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${SECTION_LABELS[section.type]} up`}>
          <Icon name="up" size={15} />
        </button>
        <button type="button" className={cx(button.ghost, button.small)} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${SECTION_LABELS[section.type]} down`}>
          <Icon name="down" size={15} />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line px-3 py-4">
          {hasText && section.type !== "hero" && (
            <div>
              <label className={label} htmlFor={`t-${section.id}`}>
                Heading
              </label>
              <input id={`t-${section.id}`} className={field} maxLength={120} value={section.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
          )}
          {hasText && (
            <div>
              <label className={label} htmlFor={`b-${section.id}`}>
                {section.type === "hero" ? "Line under the title" : "Text"}
              </label>
              <textarea
                id={`b-${section.id}`}
                className={cx(field, "min-h-24")}
                maxLength={4000}
                rows={section.type === "hero" ? 2 : 5}
                value={section.body ?? ""}
                onChange={(e) => onChange({ body: e.target.value })}
              />
              {BODY_HINT[section.type] && <p className={hint}>{BODY_HINT[section.type]}</p>}
            </div>
          )}
          {(section.type === "venue" || section.type === "countdown") && (
            <p className="text-sm text-ink-soft">
              {section.type === "venue" ? "Uses the venue name and address from Details." : "Counts down to the date from Details."}
            </p>
          )}
          {section.type === "venue" && (
            <div>
              <label className={label} htmlFor={`t-${section.id}`}>
                Heading
              </label>
              <input id={`t-${section.id}`} className={field} maxLength={120} value={section.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} />
            </div>
          )}
          {section.type === "gallery" && (
            <div>
              <span className={label}>Photos ({urls.length}/24)</span>
              <ul className="mb-3 flex flex-wrap gap-2">
                {urls.map((url, i) => (
                  <li key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() => onChange({ imageUrls: urls.filter((u) => u !== url) })}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-0.5 text-white"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              {urls.length < 24 && (
                <FileUploader key={urls.length} kind="image" label="photo" onChange={(url) => url && onChange({ imageUrls: [...urls, url] })} />
              )}
            </div>
          )}

          {!fixed && section.type !== "rsvp" && (
            <div className="pt-1">
              {confirm ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-danger">Remove this section?</span>
                  <button type="button" className={cx(button.danger, button.small)} onClick={onRemove}>
                    Remove
                  </button>
                  <button type="button" className={cx(button.ghost, button.small)} onClick={() => setConfirm(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className={cx(button.ghost, button.small)} onClick={() => setConfirm(true)}>
                  <Icon name="trash" size={15} /> Remove section
                </button>
              )}
            </div>
          )}
          {section.type === "rsvp" && <p className="text-sm text-ink-soft">Edit the questions in the Form tab. Remove this section to stop collecting replies.</p>}
          {section.type === "rsvp" && (
            <button type="button" className={cx(button.ghost, button.small)} onClick={onRemove}>
              <Icon name="trash" size={15} /> Remove RSVP form
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function SectionsPanel({
  sections,
  onSections,
}: {
  sections: InvitationSection[];
  onSections: (next: InvitationSection[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);
  const [adding, setAdding] = useState<SectionType>("story");

  const has = (t: SectionType) => sections.some((s) => s.type === t);
  const addable = SECTION_TYPES.filter((t) => t !== "hero" && !((t === "rsvp" || t === "countdown") && has(t)));
  const selected = addable.includes(adding) ? adding : addable[0];

  function move(i: number, dir: -1 | 1) {
    const next = [...sections];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onSections(next);
  }

  function add() {
    if (!selected || sections.length >= 30) return;
    const section: InvitationSection = {
      id: newSectionId(),
      type: selected,
      title: selected === "rsvp" || selected === "countdown" ? undefined : SECTION_LABELS[selected] === "Free text" ? "More details" : SECTION_LABELS[selected],
      body: "",
    };
    // The RSVP form reads best last, so new sections go before it.
    const rsvpAt = sections.findIndex((s) => s.type === "rsvp");
    const next = [...sections];
    next.splice(selected !== "rsvp" && rsvpAt >= 0 ? rsvpAt : next.length, 0, section);
    onSections(next);
    setOpenId(section.id);
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {sections.map((s, i) => (
          <SectionCard
            key={s.id}
            section={s}
            index={i}
            count={sections.length}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            onChange={(patch) => onSections(sections.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))}
            onMove={(dir) => move(i, dir)}
            onRemove={() => onSections(sections.filter((x) => x.id !== s.id))}
          />
        ))}
      </ul>
      {selected && (
        <div className="flex items-end gap-2 border-t border-line pt-5">
          <div className="min-w-0 flex-1">
            <label className={label} htmlFor="add-section">
              Add a section
            </label>
            <select id="add-section" className={field} value={selected} onChange={(e) => setAdding(e.target.value as SectionType)}>
              {addable.map((t) => (
                <option key={t} value={t}>
                  {SECTION_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={button.dark} onClick={add} disabled={sections.length >= 30}>
            <Icon name="plus" size={16} /> Add
          </button>
        </div>
      )}
    </div>
  );
}
