/** Civil dates use UTC noon; gathering instants use America/Chicago explicitly. */
export const CHURCH_ZONE = "America/Chicago";
export const ETHIOPIAN_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
];
const eth = new Intl.DateTimeFormat("en-u-ca-ethiopic-nu-latn", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const zoned = new Intl.DateTimeFormat("en-US", {
  timeZone: CHURCH_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const DAY = 86400000;
export function civilDate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error("Invalid civil date");
  const d = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== iso)
    throw new Error("Invalid civil date");
  return d;
}
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function ethiopianDate(d: Date) {
  const p = Object.fromEntries(
    eth.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
}
export function ethiopianLabel(d: Date) {
  const e = ethiopianDate(d);
  return `${ETHIOPIAN_MONTHS[e.month - 1]} ${e.day}, ${e.year}`;
}
export function nearestSunday(d: Date) {
  const day = d.getUTCDay();
  return new Date(d.getTime() + (day <= 3 ? -day : 7 - day) * DAY);
}
/** Converts a church-local daytime hour to UTC, including both DST offsets. */
export function churchInstant(date: string, hour: number) {
  const d = civilDate(date);
  const wall = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    hour,
  );
  let instant = wall;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(
      zoned.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    const rendered = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    instant += wall - rendered;
  }
  return instant;
}
export type Gathering = {
  id: string;
  kind: "mahiber" | "ziker";
  title: string;
  date: string;
  ethiopian: string;
  startsAt: number;
  endsAt: number;
  location: string;
  description: string;
};
export function gatheringsBetween(from: string, to: string): Gathering[] {
  const start = civilDate(from).getTime(),
    end = civilDate(to).getTime();
  if (end < start || end - start > 3 * 366 * DAY)
    throw new Error("Choose a calendar range of at most three years");
  const events: Gathering[] = [];
  // Include a parent occurrence just outside the range whose nearest Sunday is inside.
  for (let t = start - 3 * DAY; t <= end + 3 * DAY; t += DAY) {
    const parent = new Date(t),
      e = ethiopianDate(parent);
    if (e.day !== 27 || e.month === 13) continue;
    for (const kind of ["mahiber", "ziker"] as const) {
      const date = kind === "mahiber" ? parent : nearestSunday(parent);
      if (date.getTime() < start || date.getTime() > end) continue;
      const iso = isoDate(date),
        hour = kind === "mahiber" ? 19 : 11;
      events.push({
        id: `arbahara-${kind}-${e.year}-${e.month}`,
        kind,
        title:
          kind === "mahiber"
            ? "Arbahara Teleconference Mahiber"
            : "Arbahara Medhanialem Ziker",
        date: iso,
        ethiopian: ethiopianLabel(date),
        startsAt: churchInstant(iso, hour),
        endsAt: churchInstant(iso, hour + 1),
        location:
          kind === "mahiber"
            ? "Teleconference · joining details from the monastery office"
            : "Mekane Selam St. Michael and St. Kidane Meheret Ethiopian Orthodox Tewahedo Church, 1709 North Garland Avenue, Garland, TX 75040",
        description:
          kind === "mahiber"
            ? "Monthly gathering on the Ethiopian 27th. Contact the monastery office for joining details."
            : "Monthly Ziker on the Sunday closest to the Ethiopian 27th.",
      });
    }
  }
  return events.sort((a, b) => a.startsAt - b.startsAt);
}
export function upcomingGatherings(now = new Date(), months = 12) {
  // en-CA formatting is not guaranteed ISO on all engines.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: CHURCH_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const start = `${parts.year}-${parts.month}-${parts.day}`;
  const end = civilDate(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return gatheringsBetween(start, isoDate(end)).filter(
    (e) => e.endsAt > now.getTime(),
  );
}
const escapeIcs = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (t: number) =>
  new Date(t)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
/** Materialized occurrences, not a Gregorian RRULE (which would drift). */
export function calendarIcs(events: Gathering[], generatedAt = Date.now()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arbahara//Gatherings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Arbahara gatherings",
  ];
  for (const e of events)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@haramonastery.org`,
      `DTSTAMP:${stamp(generatedAt)}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `DTEND:${stamp(e.endsAt)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
      `LOCATION:${escapeIcs(e.location)}`,
      `DESCRIPTION:${escapeIcs(`${e.ethiopian}. ${e.description} Times: America/Chicago.`)}`,
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  // RFC 5545: fold by UTF-8 octets, not JS characters (Amharic uses 3 bytes).
  const encoder = new TextEncoder();
  return (
    lines
      .map((line) => {
        let folded = "",
          bytes = 0;
        for (const char of line) {
          const n = encoder.encode(char).length;
          if (bytes + n > 75) {
            folded += "\r\n ";
            bytes = 1;
          }
          folded += char;
          bytes += n;
        }
        return folded;
      })
      .join("\r\n") + "\r\n"
  );
}
