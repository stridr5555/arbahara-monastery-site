import { useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ErrorMessage, message, downloadJson } from "../components/Live";
import { money } from "./Giving";
import { fundNames } from "../pages/Give";
import { eventDate } from "./Tickets";
export function MemberAdmin() {
  const members = useQuery(api.members.list);
  const setStatus = useMutation(api.members.setStatus);
  const grantRole = useMutation(api.members.grantRole);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <>
      <section className="panel">
        <h2>Membership review</h2>
        <p>
          Review applications independently of donations. The latest 500
          profiles appear here; exports include the complete record.
        </p>
        <label>
          Find a member
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <ErrorMessage message={error} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {members
                ?.filter((m) =>
                  `${m.name} ${m.email}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((m) => (
                  <tr key={m._id}>
                    <td data-no-translate>
                      {m.name}
                      <small>{m.memberNumber}</small>
                    </td>
                    <td data-no-translate>
                      {m.email}
                      <small>
                        {m.phone} · {m.city}
                      </small>
                    </td>
                    <td>{m.status}</td>
                    <td>
                      <select
                        aria-label={`Membership status for ${m.name}`}
                        value={m.status}
                        onChange={async (e) => {
                          try {
                            await setStatus({
                              id: m._id,
                              status: e.target.value as
                                "pending" | "active" | "inactive",
                            });
                            setError("");
                          } catch (e) {
                            setError(message(e));
                          }
                        }}
                      >
                        <option value="pending">Pending review</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {members?.length === 0 ? (
          <p className="empty">No membership applications yet.</p>
        ) : null}
      </section>
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError("");
          try {
            await grantRole({
              email: String(f.get("email")),
              role: f.get("role") as
                "member" | "admin" | "treasurer" | "checkin",
            });
            setNotice("Role updated for the verified account.");
          } catch (e) {
            setError(message(e));
          }
        }}
      >
        <h2>Staff access</h2>
        <p>
          The person must first sign in and verify their email. Administrators
          can access all records; treasurers review gifts; check-in staff
          validate event tickets.
        </p>
        <label>
          Verified staff email
          <input name="email" type="email" required />
        </label>
        <label>
          Role
          <select name="role">
            <option value="member">Member (remove staff role)</option>
            <option value="treasurer">Treasurer</option>
            <option value="checkin">Event check-in</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <button className="button secondary">Update role</button>
        {notice ? <p role="status">{notice}</p> : null}
      </form>
    </>
  );
}
export function Treasury() {
  const queue = useQuery(api.donations.reviewQueue);
  const reconcile = useMutation(api.donations.reconcile);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <section className="panel">
      <h2>Zelle reconciliation</h2>
      <p>
        Compare each report with the monastery’s bank records before confirming.
        Another reviewer must verify your own gifts.
      </p>
      <ErrorMessage message={error} />
      {queue?.map((d) => (
        <form
          className="review-row"
          key={d._id}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            setBusy(d._id);
            try {
              await reconcile({
                id: d._id,
                confirmed: f.get("decision") === "confirm",
                note: String(f.get("note")),
              });
              setError("");
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(null);
            }
          }}
        >
          <h3>
            {money(d.amountCents)} · {fundNames[d.fund]}
          </h3>
          <p>
            {d.email} · {d.giftDate}
            <br />
            Bank reference: <strong>{d.reference}</strong>
          </p>
          <label>
            Review note
            <input
              name="note"
              required
              maxLength={500}
              placeholder="Bank record checked, date, and reconciliation reference"
            />
          </label>
          <label>
            Decision
            <select name="decision">
              <option value="confirm">Confirm received in bank</option>
              <option value="reject">Reject / could not verify</option>
            </select>
          </label>
          <button className="button" disabled={busy === d._id}>
            Save review
          </button>
        </form>
      ))}
      {queue?.length === 0 ? (
        <p className="empty">No transfers awaiting review.</p>
      ) : null}
    </section>
  );
}
function dateInput(ms: number) {
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function EventAdmin() {
  const events = useQuery(api.events.all);
  const save = useMutation(api.events.save);
  const [editing, setEditing] = useState<Doc<"events"> | null>(null);
  const [key, setKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <>
      <section className="panel">
        <h2>Publish a gathering</h2>
        <p>
          Publish confirmed dates and locations only. Event reservations are
          free and separate from donations. Dates entered below use this
          device’s time zone; members see Central time.
        </p>
        <form
          key={key}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              await save({
                id: editing?._id,
                title: String(f.get("title")),
                description: String(f.get("description")),
                location: String(f.get("location")),
                startsAt: new Date(String(f.get("startsAt"))).getTime(),
                endsAt: new Date(String(f.get("endsAt"))).getTime(),
                capacity: Number(f.get("capacity")),
                published: f.get("published") === "on",
                cancelled: f.get("cancelled") === "on",
              });
              setEditing(null);
              setKey((k) => k + 1);
              setNotice("Event saved.");
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Event title
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={editing?.title}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              maxLength={5000}
              rows={4}
              defaultValue={editing?.description}
            />
          </label>
          <label>
            Location and access details
            <input
              name="location"
              required
              maxLength={300}
              defaultValue={editing?.location}
            />
          </label>
          <div className="two-columns">
            <label>
              Start (device local time)
              <input
                type="datetime-local"
                name="startsAt"
                required
                defaultValue={editing ? dateInput(editing.startsAt) : ""}
              />
            </label>
            <label>
              End (device local time)
              <input
                type="datetime-local"
                name="endsAt"
                required
                defaultValue={editing ? dateInput(editing.endsAt) : ""}
              />
            </label>
          </div>
          <label>
            Ticket capacity
            <input
              type="number"
              name="capacity"
              required
              min="1"
              max="10000"
              defaultValue={editing?.capacity || 100}
            />
          </label>
          <div className="checkbox-list">
            <label>
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing?.published}
              />
              Publish on the website
            </label>
            <label>
              <input
                type="checkbox"
                name="cancelled"
                defaultChecked={editing?.cancelled}
              />
              Mark event cancelled
            </label>
          </div>
          <ErrorMessage message={error} />
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save event changes" : "Create event"}
          </button>
          {editing ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setEditing(null);
                setKey((k) => k + 1);
              }}
            >
              Cancel editing
            </button>
          ) : null}
          {notice ? <p role="status">{notice}</p> : null}
        </form>
      </section>
      <section className="panel">
        <h2>Existing events</h2>
        {events?.map((e) => (
          <div className="record-row" key={e._id}>
            <div>
              <h3>{e.title}</h3>
              <p>
                {eventDate(e.startsAt)} ·{" "}
                {e.cancelled
                  ? "Cancelled"
                  : e.published
                    ? "Published"
                    : "Draft"}
              </p>
            </div>
            <button
              className="button secondary compact"
              onClick={() => {
                setEditing(e);
                setKey((k) => k + 1);
                setNotice("");
                window.scrollTo({ top: 0, behavior: "auto" });
              }}
            >
              Edit
            </button>
          </div>
        ))}
        {events?.length === 0 ? <p>No events have been created.</p> : null}
      </section>
    </>
  );
}
export function CheckIn() {
  const events = useQuery(api.events.all);
  const scan = useMutation(api.events.checkIn);
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.hash.slice(1));
    return p.get("ticket") || "";
  });
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h2>Event check-in</h2>
      <p>
        Scan the ticket using your phone’s camera and open its link. Sign in
        with an authorized account, select the event, and confirm admission. You
        can also paste a ticket link below.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError("");
          setResult("");
          setBusy(true);
          let value = token.trim();
          try {
            if (value.startsWith("https://"))
              value =
                new URLSearchParams(new URL(value).hash.slice(1)).get(
                  "ticket",
                ) || "";
            const r = await scan({
              eventId: String(f.get("eventId")) as Id<"events">,
              token: value,
            });
            setResult(
              r.alreadyCheckedIn
                ? `Already admitted: ${r.name}. Do not admit again with this ticket.`
                : `Admission confirmed: ${r.name}.`,
            );
            if (!r.alreadyCheckedIn) {
              setToken("");
              history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search,
              );
            }
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Event
          <select name="eventId" required defaultValue="">
            <option value="" disabled>
              Select the event
            </option>
            {events
              ?.filter((e) => e.published && !e.cancelled)
              .map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          Ticket code or link
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Checking…" : "Validate and check in"}
        </button>
        <ErrorMessage message={error} />
        {result ? (
          <p className="form-message" role="status">
            {result}
          </p>
        ) : null}
      </form>
    </section>
  );
}
export function ArchiveAdmin() {
  const items = useQuery(api.archive.all);
  const save = useMutation(api.archive.save);
  const uploadUrl = useMutation(api.archive.uploadUrl);
  const [editing, setEditing] = useState<Doc<"archive"> | null>(null);
  const [key, setKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <form
        key={key}
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            let storageId = editing?.storageId;
            const file = f.get("file") as File;
            if (file?.size) {
              if (file.size > 50 * 1024 * 1024)
                throw new Error("The file must be 50 MB or smaller.");
              const upload = await uploadUrl({});
              const r = await fetch(upload, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
              });
              if (!r.ok) throw new Error("File upload failed.");
              storageId = (await r.json()).storageId;
            }
            await save({
              id: editing?._id,
              title: String(f.get("title")),
              description: String(f.get("description")),
              kind: f.get("kind") as
                "document" | "recording" | "photograph" | "announcement",
              date: String(f.get("date")),
              language: String(f.get("language")),
              rights: String(f.get("rights")),
              visibility: f.get("visibility") as "public" | "members" | "admin",
              published: f.get("published") === "on",
              url: String(f.get("url")) || undefined,
              storageId,
            });
            setEditing(null);
            setKey((k) => k + 1);
            setNotice("Archive item saved. Earlier versions are retained.");
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{editing ? "Edit archive record" : "Add to the church archive"}</h2>
        <p>
          Confirm permission to publish and choose who may access the material.
          Each edit retains a copy of the prior record.
        </p>
        <label>
          Title
          <input
            name="title"
            required
            maxLength={180}
            defaultValue={editing?.title}
          />
        </label>
        <label>
          Description or announcement
          <textarea
            name="description"
            required
            maxLength={5000}
            rows={5}
            defaultValue={editing?.description}
          />
        </label>
        <div className="two-columns">
          <label>
            Type
            <select name="kind" defaultValue={editing?.kind || "document"}>
              <option value="document">Document</option>
              <option value="recording">Recording</option>
              <option value="photograph">Photograph</option>
              <option value="announcement">Announcement</option>
            </select>
          </label>
          <label>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={
                editing?.date || new Date().toISOString().slice(0, 10)
              }
            />
          </label>
          <label>
            Language
            <input
              name="language"
              required
              maxLength={40}
              defaultValue={editing?.language || "English"}
            />
          </label>
          <label>
            Visibility
            <select
              name="visibility"
              defaultValue={editing?.visibility || "admin"}
            >
              <option value="admin">Administrators only</option>
              <option value="members">Active members</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>
        <label>
          Source, rights, and permission
          <input
            name="rights"
            required
            maxLength={500}
            defaultValue={editing?.rights}
          />
        </label>
        <label>
          Document or media link (optional)
          <input name="url" maxLength={2048} defaultValue={editing?.url} />
        </label>
        <label>
          Or upload a file (optional, up to 50 MB)
          <input
            type="file"
            name="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.txt"
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="published"
            defaultChecked={editing?.published}
          />
          Publish this record
        </label>
        <ErrorMessage message={error} />
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save archive record"}
        </button>
        {editing ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setEditing(null);
              setKey((k) => k + 1);
            }}
          >
            Cancel editing
          </button>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
      </form>
      <section className="panel">
        <h2>Archive records</h2>
        {items?.map((i) => (
          <div className="record-row" key={i._id}>
            <div>
              <h3>{i.title}</h3>
              <p>
                {i.visibility} · {i.published ? "Published" : "Draft"} · version{" "}
                {i.version}
              </p>
            </div>
            <button
              className="button secondary compact"
              onClick={() => {
                setEditing(i);
                setKey((k) => k + 1);
                setNotice("");
                window.scrollTo({ top: 0 });
              }}
            >
              Edit
            </button>
          </div>
        ))}
        {!items?.length ? (
          <p>
            No new records yet. The founding collection remains available in the
            public archive.
          </p>
        ) : null}
        <a href="/admin-recordings" className="text-link">
          Existing Drive recording upload tools
        </a>
      </section>
    </>
  );
}
export function RecordsAdmin() {
  const client = useConvex();
  const log = useQuery(api.administration.auditLog);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <section className="panel">
        <h2>Preserve and hand over the records</h2>
        <p>
          Download a portable JSON export of church records. Keep it in an
          encrypted location accessible to authorized successors. The export
          includes personal and financial information and must not be published.
        </p>
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const data: Record<string, unknown> = {
                schemaVersion: 1,
                exportedAt: new Date().toISOString(),
              };
              for (const table of [
                "members",
                "donations",
                "events",
                "tickets",
                "archive",
                "archiveRevisions",
                "audit",
                "subscriptions",
              ] as const) {
                let cursor: string | null = null;
                const rows: unknown[] = [];
                do {
                  const result: {
                    page: unknown[];
                    isDone: boolean;
                    continueCursor: string;
                  } = await client.query(api.administration.exportPage, {
                    table,
                    paginationOpts: { numItems: 100, cursor },
                  });
                  rows.push(...result.page);
                  cursor = result.isDone ? null : result.continueCursor;
                } while (cursor);
                data[table] = rows;
              }
              downloadJson(
                `arbahara-records-${new Date().toISOString().slice(0, 10)}.json`,
                data,
              );
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparing export…" : "Export church records"}
        </button>
        <ErrorMessage message={error} />
        <p className="small">
          This administrative export excludes sign-in credentials and ticket
          bearer codes. A full disaster-recovery backup, including files and
          authentication data, must use the protected Convex export workflow
          described in the operations guide.
        </p>
      </section>
      <section className="panel">
        <h2>Recent administrative activity</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {log?.map((e) => (
                <tr key={e._id}>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{e.action}</td>
                  <td>{e.details || e.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
