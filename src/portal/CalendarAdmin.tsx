import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { upcomingGatherings, churchInstant } from "../lib/calendar";
import { ErrorMessage, message } from "../components/Live";
export function CalendarAdmin() {
  const change = useMutation(api.calendarRecords.change),
    changes = useQuery(api.calendarRecords.changes),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [events] = useState(() => upcomingGatherings(new Date(), 12));
  return (
    <section className="panel">
      <h2>Recurring gathering updates</h2>
      <p>
        Changes apply to the public/member calendars and trigger connected
        primary-calendar synchronization. The original occurrence ID remains
        stable. Only change a time or venue after it is confirmed by the
        monastery office.
      </p>
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Original date</th>
              <th>Gathering</th>
              <th>Office update</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const saved = changes?.find((c) => c.eventId === e.id);
              const local = Object.fromEntries(
                new Intl.DateTimeFormat("en", {
                  timeZone: "America/Chicago",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  hourCycle: "h23",
                })
                  .formatToParts(saved?.startsAt ?? e.startsAt)
                  .map((p) => [p.type, p.value]),
              );
              return (
                <tr key={e.id}>
                  <td>
                    {e.date}
                    <small lang="am">{e.ethiopian}</small>
                  </td>
                  <td>{e.title}</td>
                  <td>
                    <details>
                      <summary>
                        {saved?.cancelled
                          ? "Cancelled"
                          : saved
                            ? "Updated · edit"
                            : "Edit occurrence"}
                      </summary>
                      <form
                        className="finance-form"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          setBusy(true);
                          setError("");
                          const f = new FormData(event.currentTarget);
                          try {
                            const date = String(f.get("date")),
                              hour = Number(f.get("hour"));
                            await change({
                              eventId: e.id,
                              originalDate: e.date,
                              cancelled: f.get("cancelled") === "on",
                              startsAt: churchInstant(date, hour),
                              endsAt: churchInstant(date, hour + 1),
                              location: String(f.get("location")),
                              note: String(f.get("note")),
                            });
                            setNotice(
                              "Calendar update saved and connected calendars queued for sync.",
                            );
                          } catch (error) {
                            setError(message(error));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <label>
                          New church-local date
                          <input
                            type="date"
                            name="date"
                            defaultValue={`${local.year}-${local.month}-${local.day}`}
                            required
                          />
                        </label>
                        <label>
                          Start hour (Texas time)
                          <select name="hour" defaultValue={Number(local.hour)}>
                            {Array.from({ length: 17 }, (_, i) => i + 6).map(
                              (h) => (
                                <option key={h} value={h}>
                                  {h % 12 || 12}:00 {h >= 12 ? "PM" : "AM"}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label>
                          Confirmed venue / access note
                          <input
                            name="location"
                            defaultValue={saved?.location || e.location}
                            maxLength={500}
                            required
                          />
                        </label>
                        <label>
                          Public reason for change
                          <input
                            name="note"
                            defaultValue={saved?.note}
                            maxLength={500}
                            required
                          />
                        </label>
                        <label className="check-label">
                          <input
                            name="cancelled"
                            type="checkbox"
                            defaultChecked={saved?.cancelled}
                          />
                          Cancel this occurrence
                        </label>
                        <button disabled={busy} className="button">
                          Save confirmed update
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
