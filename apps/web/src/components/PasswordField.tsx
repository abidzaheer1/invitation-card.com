"use client";

import { useId, useState } from "react";
import { cx, field, label as labelClass } from "./ui";

/** A password input with a show/hide switch, so typos on phones are easy to spot. */
export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
  id: idProp,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: React.ReactNode;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          className={cx(field, "pr-16")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-sm font-semibold text-forest hover:bg-sage-deep"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}
