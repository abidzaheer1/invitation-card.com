"use client";

import { RSVP_FIELD_TYPES, type RsvpField, type RsvpFieldType } from "@invitation/shared";
import Icon from "../Icon";
import { button, cx, field, hint, label } from "../ui";

const TYPE_LABEL: Record<RsvpFieldType, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Choice list",
  textarea: "Long text",
};

const LOCKED = ["name"];

export default function FormPanel({
  fields,
  onFields,
  hasRsvp,
}: {
  fields: RsvpField[];
  onFields: (next: RsvpField[]) => void;
  hasRsvp: boolean;
}) {
  const update = (id: string, patch: Partial<RsvpField>) => onFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function add() {
    if (fields.length >= 30) return;
    const id = `q${Math.random().toString(36).slice(2, 8)}`;
    onFields([...fields, { id, label: "New question", type: "text", required: false }]);
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onFields(next);
  }

  return (
    <div className="space-y-5">
      {!hasRsvp && (
        <p className="rounded-lg bg-marigold/15 px-3 py-2 text-sm font-medium">
          Your invitation has no RSVP form section, so guests won&apos;t see these questions. Add one in Sections.
        </p>
      )}
      <p className="text-ink-soft">
        Guests always say whether they are coming. These are the questions they answer after that.
      </p>
      <ul className="space-y-3">
        {fields.map((f, i) => (
          <li key={f.id} className="space-y-3 rounded-xl border border-line bg-white p-3">
            <div>
              <label className={label} htmlFor={`q-${f.id}`}>
                Question
              </label>
              <input id={`q-${f.id}`} className={field} maxLength={120} value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor={`ty-${f.id}`}>
                  Answer type
                </label>
                <select
                  id={`ty-${f.id}`}
                  className={field}
                  value={f.type}
                  disabled={LOCKED.includes(f.id)}
                  onChange={(e) => {
                    const type = e.target.value as RsvpFieldType;
                    update(f.id, { type, options: type === "select" ? (f.options?.length ? f.options : ["Yes", "No"]) : undefined });
                  }}
                >
                  {RSVP_FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-7 flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-forest"
                  checked={f.required}
                  disabled={LOCKED.includes(f.id)}
                  onChange={(e) => update(f.id, { required: e.target.checked })}
                />
                Required
              </label>
            </div>
            {f.type === "select" && (
              <div>
                <label className={label} htmlFor={`op-${f.id}`}>
                  Choices
                </label>
                <textarea
                  id={`op-${f.id}`}
                  className={cx(field, "min-h-20")}
                  rows={3}
                  value={(f.options ?? []).join("\n")}
                  onChange={(e) => update(f.id, { options: e.target.value.split("\n") })}
                  onBlur={(e) => update(f.id, { options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean) })}
                />
                <p className={hint}>One choice per line.</p>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button type="button" className={cx(button.ghost, button.small)} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move “${f.label}” up`}>
                <Icon name="up" size={15} />
              </button>
              <button type="button" className={cx(button.ghost, button.small)} disabled={i === fields.length - 1} onClick={() => move(i, 1)} aria-label={`Move “${f.label}” down`}>
                <Icon name="down" size={15} />
              </button>
              {!LOCKED.includes(f.id) && (
                <button type="button" className={cx(button.ghost, button.small, "ml-auto")} onClick={() => onFields(fields.filter((x) => x.id !== f.id))}>
                  <Icon name="trash" size={15} /> Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={button.dark} onClick={add} disabled={fields.length >= 30}>
        <Icon name="plus" size={16} /> Add a question
      </button>
    </div>
  );
}
