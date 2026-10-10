import type { ResponsesPayload } from "@invitation/shared";

const STATUS_LABEL = { ATTENDING: "Attending", DECLINED: "Can't come", MAYBE: "Maybe" } as const;

/** Guest text is untrusted. A leading = + - @ makes spreadsheets run it as a formula, so neutralise it. */
export function csvCell(value: string): string {
  let text = value.replace(/\r\n?/g, "\n");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildResponsesCsv(data: ResponsesPayload): string {
  const fields = data.invitation.rsvpFields;
  const header = ["Replied at", "Name", "Answer", ...fields.map((f) => f.label)];
  const rows = data.responses.map((r) => [
    r.createdAt,
    r.guestName,
    STATUS_LABEL[r.status],
    ...fields.map((f) => r.answers[f.id] ?? ""),
  ]);
  return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
