import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
export function eventDate(ms: number) {
  return (
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Chicago",
    }).format(ms) + " (Central time)"
  );
}
function calendar(event: Doc<"events">) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const date = (n: number) =>
    new Date(n)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const data = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arbahara//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event._id}@haramonastery.org`,
    `DTSTAMP:${date(Date.now())}`,
    `DTSTART:${date(event.startsAt)}`,
    `DTEND:${date(event.endsAt)}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(event.location)}`,
    `DESCRIPTION:${escape(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([data], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "arbahara-event.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Ticket({
  ticket,
}: {
  ticket: Doc<"tickets"> & { event: Doc<"events"> | null };
}) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cancel = useMutation(api.events.cancel);
  const valid = ticket.status !== "cancelled" && !ticket.event?.cancelled;
  useEffect(() => {
    if (valid)
      import("qrcode")
        .then((q) =>
          q.toDataURL(
            `${window.location.origin}/members?view=checkin#ticket=${encodeURIComponent(ticket.token)}`,
            { width: 240, margin: 4, errorCorrectionLevel: "M" },
          ),
        )
        .then(setQr)
        .catch(() =>
          setError("Unable to display QR code. Please contact the office."),
        );
  }, [ticket.token, valid]);
  return (
    <article className="ticket panel">
      <div>
        <span className="status">
          {ticket.event?.cancelled
            ? "Event cancelled"
            : ticket.status.replace("_", " ")}
        </span>
        <h3>{ticket.event?.title || "Archived event"}</h3>
        <p data-no-translate>{ticket.attendeeName}</p>
        {ticket.event ? (
          <>
            <p>
              {eventDate(ticket.event.startsAt)}
              <br />
              {ticket.event.location}
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => calendar(ticket.event!)}
            >
              Add to calendar
            </button>
          </>
        ) : null}
        <p className="small">
          Present this code at the event. Keep it private.
        </p>
        <ErrorMessage message={error} />
        <div className="actions">
          {valid ? (
            <button
              className="text-button"
              type="button"
              onClick={() => window.print()}
            >
              Print ticket
            </button>
          ) : null}
          {ticket.status === "reserved" ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm("Cancel this event reservation?")) return;
                setBusy(true);
                try {
                  await cancel({ id: ticket._id });
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Cancel reservation
            </button>
          ) : null}
        </div>
      </div>
      {valid && qr ? (
        <img
          src={qr}
          width="200"
          height="200"
          alt={`Admission QR code for ${ticket.event?.title || "event"}`}
        />
      ) : null}
    </article>
  );
}
export function MyTickets() {
  const tickets = useQuery(api.events.mine);
  return (
    <section>
      <h2>My tickets</h2>
      {tickets?.length ? (
        tickets.map((t) => <Ticket key={t._id} ticket={t} />)
      ) : (
        <div className="panel empty">
          <p>
            {tickets
              ? "You have no event reservations yet."
              : "Loading your tickets…"}
          </p>
          <a className="button secondary" href="/events">
            Browse gatherings
          </a>
        </div>
      )}
    </section>
  );
}
export function EventList({ signedIn = false }: { signedIn?: boolean }) {
  const events = useQuery(api.events.upcoming);
  const register = useAction(api.events.register);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reserved, setReserved] = useState<string | null>(null);
  return (
    <>
      <ErrorMessage message={error} />
      {events === undefined ? (
        <p className="empty" role="status">
          Loading published gatherings…
        </p>
      ) : !events.length ? (
        <div className="empty panel">
          <h2>Gatherings will be announced here.</h2>
          <p>
            No upcoming event has been published. Contact the office for current
            worship and visiting arrangements.
          </p>
          <a className="text-link" href="/visit">
            Contact the monastery
          </a>
        </div>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <article className="event panel" key={event._id}>
              <div className="event-date">
                <strong>
                  {new Date(event.startsAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    timeZone: "America/Chicago",
                  })}
                </strong>
                <span>
                  {new Date(event.startsAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                    timeZone: "America/Chicago",
                  })}
                </span>
              </div>
              <div>
                <h2>{event.title}</h2>
                <p>{event.description}</p>
                <p>
                  {eventDate(event.startsAt)}
                  <br />
                  {event.location}
                </p>
                {event.cancelled ? (
                  <p className="status">Cancelled</p>
                ) : reserved === event._id ? (
                  <p role="status">
                    Your ticket is ready.{" "}
                    <a href="/members?view=tickets">Open my tickets</a>
                  </p>
                ) : signedIn ? (
                  <form
                    className="event-reserve"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      setError("");
                      setBusy(event._id);
                      try {
                        await register({
                          eventId: event._id,
                          attendeeName: String(f.get("attendeeName")),
                        });
                        setReserved(event._id);
                      } catch (e) {
                        setError(message(e));
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <label>
                      Attendee name
                      <input
                        name="attendeeName"
                        required
                        maxLength={120}
                        autoComplete="name"
                      />
                    </label>
                    <button className="button" disabled={busy === event._id}>
                      {busy === event._id ? "Reserving…" : "Reserve my ticket"}
                    </button>
                    <small>
                      One reservation per account. Contact the office for
                      household arrangements.
                    </small>
                  </form>
                ) : (
                  <a href="/members?view=events" className="button">
                    Sign in to reserve
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
