import { civilDate, ethiopianLabel, type Gathering } from "./calendar";
export type GatheringChange = {
  eventId: string;
  cancelled: boolean;
  startsAt?: number;
  endsAt?: number;
  location?: string;
  note: string;
};
export function applyCalendarChanges(
  events: Gathering[],
  changes: GatheringChange[],
) {
  const byId = new Map(changes.map((c) => [c.eventId, c]));
  return events
    .map((e) => {
      const change = byId.get(e.id);
      if (!change) return { ...e, cancelled: false };
      const startsAt = change.startsAt ?? e.startsAt;
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .formatToParts(startsAt)
          .map((p) => [p.type, p.value]),
      );
      const date = `${parts.year}-${parts.month}-${parts.day}`;
      return {
        ...e,
        startsAt,
        endsAt: change.endsAt ?? e.endsAt,
        date,
        ethiopian: ethiopianLabel(civilDate(date)),
        location: change.location ?? e.location,
        description: `${e.description}${change.note ? ` Office update: ${change.note}` : ""}`,
        cancelled: change.cancelled,
      };
    })
    .sort((a, b) => a.startsAt - b.startsAt);
}
