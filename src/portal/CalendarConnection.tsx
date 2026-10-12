import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorMessage, message } from "../components/Live";
export function CalendarConnection() {
  const state = useQuery(api.calendarRecords.status),
    connect = useAction(api.calendarActions.connect),
    sync = useAction(api.calendarActions.sync),
    disconnect = useAction(api.calendarActions.disconnect);
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Your Google Calendar</h2>
      <p>
        Write Mahiber and Ziker into your{" "}
        <strong>primary personal calendar</strong>. Arbahara updates its own
        gathering events daily, including schedule changes and cancellations.
        Google sign-in alone does not grant this permission.
      </p>
      <p>
        Connection: <strong>{state?.status || "Checking…"}</strong>
        {state?.lastSyncedAt
          ? ` · Last sync ${new Date(state.lastSyncedAt).toLocaleString()}`
          : ""}
      </p>
      <ErrorMessage message={error || state?.lastError || ""} />
      {notice ? <p role="status">{notice}</p> : null}
      {state?.status === "connected" ? (
        <div className="actions">
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await sync({});
                setNotice(
                  `${result.updated} gathering events checked and updated.`,
                );
              })
            }
          >
            Sync now
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await disconnect({});
                setNotice(
                  result.revoked
                    ? "Disconnected. Existing events remain; automatic updates have stopped."
                    : "Local access removed. Google revocation could not be confirmed; remove Arbahara from your Google Account permissions as well. Existing events remain.",
                );
              })
            }
          >
            Disconnect
          </button>
        </div>
      ) : state?.configured ? (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I want Arbahara to create and update its gathering events in my
            primary Google calendar. Google’s permission covers events on
            calendars I own; Arbahara only uses its own events in primary.
          </label>
          <button
            className="button"
            disabled={busy || !consent}
            onClick={() =>
              void run(async () =>
                window.location.assign(await connect({ consent })),
              )
            }
          >
            Connect primary Google Calendar
          </button>
        </>
      ) : (
        <p className="notice">
          Primary-calendar sync is awaiting OAuth setup. You can use the
          downloadable calendar below in the meantime. An import is not a live
          connection.
        </p>
      )}
      <p className="small">
        Disconnecting retains events already written to Google. Remove those
        manually in Google Calendar if you no longer want them. You may revoke
        access at any time in your Google Account.
      </p>
    </section>
  );
}
