"use client";

import { EVENT_LABELS, EVENT_TYPES, type EventType, type InvitationContent } from "@invitation/shared";
import { field, hint, label } from "../ui";
import FileUploader from "./ImageUploader";

export default function DetailsPanel({
  content,
  eventType,
  onContent,
  onEventType,
}: {
  content: InvitationContent;
  eventType: EventType;
  onContent: (patch: Partial<InvitationContent>) => void;
  onEventType: (t: EventType) => void;
}) {
  const hero = content.sections.find((s) => s.type === "hero");
  return (
    <div className="space-y-5">
      <div>
        <label className={label} htmlFor="d-event">
          Type of event
        </label>
        <select id="d-event" className={field} value={eventType} onChange={(e) => onEventType(e.target.value as EventType)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EVENT_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="d-title">
          Title
        </label>
        <input id="d-title" className={field} maxLength={120} value={content.title} onChange={(e) => onContent({ title: e.target.value })} />
      </div>
      <div>
        <label className={label} htmlFor="d-hosts">
          Hosted by
        </label>
        <input id="d-hosts" className={field} maxLength={120} value={content.hosts} onChange={(e) => onContent({ hosts: e.target.value })} />
        <p className={hint}>Names shown above the title, for example “Aisha &amp; Omar”.</p>
      </div>
      <div>
        <label className={label} htmlFor="d-date">
          Date and time
        </label>
        <input
          id="d-date"
          type="datetime-local"
          className={field}
          value={content.eventDate ?? ""}
          onChange={(e) => onContent({ eventDate: e.target.value || undefined })}
        />
        <p className={hint}>Guests see the time you set here, wherever they are.</p>
      </div>
      <div>
        <label className={label} htmlFor="d-loc">
          Venue name
        </label>
        <input id="d-loc" className={field} maxLength={120} value={content.locationName ?? ""} onChange={(e) => onContent({ locationName: e.target.value || undefined })} />
      </div>
      <div>
        <label className={label} htmlFor="d-addr">
          Address
        </label>
        <input id="d-addr" className={field} maxLength={200} value={content.locationAddress ?? ""} onChange={(e) => onContent({ locationAddress: e.target.value || undefined })} />
      </div>
      {hero && (
        <div className="text-sm text-ink-soft">The short line under the title is edited in Sections, under Cover.</div>
      )}
      <div>
        <span className={label}>Cover photo</span>
        <FileUploader kind="image" label="photo" value={content.coverImageUrl} onChange={(url) => onContent({ coverImageUrl: url })} />
        <p className={hint}>JPG, PNG or WebP up to 8 MB. It is shrunk automatically.</p>
      </div>
    </div>
  );
}
