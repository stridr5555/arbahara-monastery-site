import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Download,
  MapPin,
  Clock,
} from "lucide-react";
import {
  calendarIcs,
  CHURCH_ZONE,
  civilDate,
  ETHIOPIAN_MONTHS,
  ethiopianDate,
  ethiopianLabel,
  gatheringsBetween,
  isoDate,
  upcomingGatherings,
  type Gathering,
} from "../lib/calendar";
import {
  applyCalendarChanges,
  type GatheringChange,
} from "../lib/calendarChanges";
import { Live } from "./Live";
import { CalendarUpdates } from "./CalendarUpdates";
const DAY = 86400000;
const calendarExportUrl =
  import.meta.env.VITE_CONVEX_URL?.replace(
    /\.convex\.cloud\/?$/,
    ".convex.site",
  ) + "/calendar.ics";
const dateLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});
const timeLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: CHURCH_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
function periodStart(d: Date, mode: "gregorian" | "ethiopian") {
  return mode === "gregorian"
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12))
    : new Date(d.getTime() - (ethiopianDate(d).day - 1) * DAY);
}
function nextPeriod(
  d: Date,
  mode: "gregorian" | "ethiopian",
  direction: number,
) {
  if (mode === "gregorian")
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + direction, 1, 12),
    );
  return periodStart(
    new Date(
      d.getTime() +
        (direction > 0 ? (ethiopianDate(d).month === 13 ? 6 : 30) : -1) * DAY,
    ),
    mode,
  );
}
export function downloadCalendar(events: Gathering[]) {
  const url = URL.createObjectURL(
    new Blob([calendarIcs(events)], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "arbahara-gatherings.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function GatheringDetails({ event }: { event: Gathering }) {
  return (
    <article className={`gathering-detail ${event.kind}`}>
      <h3>{event.title}</h3>
      <p>
        <CalendarDays size={17} />
        {dateLabel.format(civilDate(event.date))}
      </p>
      <p lang="am">{event.ethiopian}</p>
      <p>
        <Clock size={17} />
        {timeLabel.format(event.startsAt)}–{timeLabel.format(event.endsAt)} ·
        Texas time
      </p>
      <p>
        <MapPin size={17} />
        {event.location}
      </p>
    </article>
  );
}
export function NextGatherings() {
  const [events, setEvents] = useState<Gathering[]>([]);
  const [changes, setChanges] = useState<GatheringChange[]>([]);
  useEffect(
    () => setEvents(upcomingGatherings(new Date(Date.now() - 7 * 86400000))),
    [],
  );
  return (
    <section className="next-gatherings">
      <Live>
        <CalendarUpdates onChange={setChanges} />
      </Live>
      <div className="section-heading">
        <h2>Next gatherings</h2>
        <a className="text-link" href="/calendar">
          View full calendar <ArrowRight size={16} />
        </a>
      </div>
      {events.length ? (
        applyCalendarChanges(events, changes)
          .filter((e) => !e.cancelled && e.endsAt > Date.now())
          .slice(0, 2)
          .map((e) => <GatheringDetails event={e} key={e.id} />)
      ) : (
        <p>
          Mahiber: Ethiopian 27th, 7–8 p.m. · Ziker: nearest Sunday, 11
          a.m.–noon.
        </p>
      )}
      <p className="small">
        All times America/Chicago. Meeting access is provided by the monastery
        office.
      </p>
    </section>
  );
}
export function ChurchCalendar() {
  const [mode, setMode] = useState<"gregorian" | "ethiopian">("gregorian");
  const [cursor, setCursor] = useState(() => civilDate("2026-10-01"));
  const [selected, setSelected] = useState<string | null>(null);
  const [changes, setChanges] = useState<GatheringChange[]>([]);
  useEffect(
    () => setCursor(periodStart(civilDate(isoDate(new Date())), "gregorian")),
    [],
  );
  const start = periodStart(cursor, mode),
    end = new Date(nextPeriod(start, mode, 1).getTime() - DAY);
  const from = isoDate(start),
    to = isoDate(end);
  const events = useMemo(
    () =>
      applyCalendarChanges(
        gatheringsBetween(
          isoDate(new Date(civilDate(from).getTime() - 7 * DAY)),
          isoDate(new Date(civilDate(to).getTime() + 7 * DAY)),
        ),
        changes,
      )
        .filter((e) => !e.cancelled && e.date >= from && e.date <= to)
        .map((e) => ({ ...e, ethiopian: ethiopianLabel(civilDate(e.date)) })),
    [from, to, changes],
  );
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY)
    days.push(new Date(t));
  const e = ethiopianDate(start);
  const title =
    mode === "gregorian"
      ? new Intl.DateTimeFormat("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(start)
      : `${ETHIOPIAN_MONTHS[e.month - 1]} ${e.year}`;
  const agenda = selected ? events.filter((e) => e.date === selected) : events;
  return (
    <div className="church-calendar">
      <Live>
        <CalendarUpdates onChange={setChanges} />
      </Live>
      <section className="calendar-month" aria-label="Monthly calendar">
        <div className="calendar-toolbar">
          <div className="calendar-switch" aria-label="Calendar system">
            {(["gregorian", "ethiopian"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => {
                  setCursor(periodStart(cursor, m));
                  setMode(m);
                  setSelected(null);
                }}
              >
                {m === "gregorian" ? "Gregorian" : "Ethiopian"}
              </button>
            ))}
          </div>
          <h2 aria-live="polite">{title}</h2>
          <div className="calendar-arrows">
            <button
              aria-label="Previous month"
              onClick={() => {
                setCursor(nextPeriod(start, mode, -1));
                setSelected(null);
              }}
            >
              <ArrowLeft size={19} />
            </button>
            <button
              aria-label="Next month"
              onClick={() => {
                setCursor(nextPeriod(start, mode, 1));
                setSelected(null);
              }}
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
        <div
          className="calendar-grid"
          role="group"
          aria-label={`${title} · choose a day for its agenda`}
        >
          <div className="calendar-week" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-cells">
            {Array.from({ length: start.getUTCDay() }, (_, i) => (
              <div
                key={`empty${i}`}
                className="calendar-blank"
                aria-hidden="true"
              />
            ))}
            {days.map((d) => {
              const date = isoDate(d),
                eth = ethiopianDate(d),
                daily = events.filter((e) => e.date === date);
              return (
                <button
                  key={date}
                  className={`calendar-day ${selected === date ? "selected" : ""}`}
                  aria-label={`${dateLabel.format(d)}, ${ethiopianLabel(d)}${daily.map((e) => `, ${e.title}`).join("")}`}
                  aria-pressed={selected === date}
                  onClick={() => setSelected(selected === date ? null : date)}
                >
                  <span className="day-primary">
                    {mode === "gregorian" ? d.getUTCDate() : eth.day}
                  </span>
                  <small>
                    {mode === "gregorian"
                      ? `${ETHIOPIAN_MONTHS[eth.month - 1]} ${eth.day}`
                      : new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(d)}
                  </small>
                  {daily.map((e) => (
                    <span className={`day-event ${e.kind}`} key={e.id}>
                      {e.kind === "mahiber" ? "Mahiber" : "Ziker"}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </section>
      <section className="calendar-agenda" aria-label="Gathering agenda">
        <div className="section-heading">
          <h2>{selected ? "Selected day" : "This month"}</h2>
          {selected ? (
            <button className="text-button" onClick={() => setSelected(null)}>
              Show month
            </button>
          ) : null}
        </div>
        <div aria-live="polite">
          {agenda.length ? (
            agenda.map((e) => <GatheringDetails event={e} key={e.id} />)
          ) : (
            <p className="empty">
              No scheduled Mahiber or Ziker on{" "}
              {selected ? "this day" : "this month"}. Other monastery events are
              listed below.
            </p>
          )}
        </div>
        <div className="calendar-actions">
          {import.meta.env.VITE_CONVEX_URL ? (
            <a
              className="button"
              href={calendarExportUrl}
              download="arbahara-gatherings.ics"
            >
              <Download size={17} /> Download 12-month calendar
            </a>
          ) : (
            <button
              className="button"
              onClick={() =>
                downloadCalendar(
                  applyCalendarChanges(
                    upcomingGatherings(new Date(), 12),
                    changes,
                  ).filter((e) => !e.cancelled),
                )
              }
            >
              <Download size={17} />
              Download 12-month calendar
            </button>
          )}
          <a className="button secondary" href="/members?view=calendar">
            Connect Google Calendar <ArrowRight size={17} />
          </a>
        </div>
        <p className="small">
          Import the .ics file into Google, Apple or Outlook. This is a dated
          export, not automatic synchronization. Connect your primary Google
          calendar separately in the member portal when available.
        </p>
        <p className="small">
          Mahiber: Ethiopian 27th. Ziker: nearest Sunday. Pagume has no 27th.
          Times follow America/Chicago, including daylight saving time.
        </p>
      </section>
    </div>
  );
}
