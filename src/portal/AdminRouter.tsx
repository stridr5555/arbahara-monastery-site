import { lazy, Suspense, useState } from "react";
const FinanceAdmin = lazy(() => import("./FinanceAdmin"));
const CalendarAdmin = lazy(() =>
  import("./CalendarAdmin").then((m) => ({ default: m.CalendarAdmin })),
);
import {
  MemberAdmin,
  Treasury,
  EventAdmin,
  CheckIn,
  ArchiveAdmin,
  RecordsAdmin,
} from "./Admin";
export default function AdminRouter({
  role,
  initialView,
}: {
  role: string;
  initialView?: string;
}) {
  const tabs =
    role === "admin"
      ? [
          ["finance", "Stewardship & accounts"],
          ["calendar", "Recurring calendar"],
          ["members", "Members"],
          ["treasury", "Zelle review"],
          ["events", "Events"],
          ["checkin", "Check-in"],
          ["archive", "Archive"],
          ["records", "Exports & audit"],
        ]
      : role === "treasurer" || role === "secretary"
        ? [
            ["finance", "Stewardship & accounts"],
            ["treasury", "Zelle review"],
            ...(role === "secretary"
              ? [["calendar", "Recurring calendar"]]
              : []),
          ]
        : [["checkin", "Check-in"]];
  const [tab, setTab] = useState(initialView || tabs[0][0]);
  return (
    <>
      <div className="filter-row" aria-label="Administration sections">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "finance" ? (
        <Suspense fallback={<p>Loading stewardship tools…</p>}>
          <FinanceAdmin role={role} />
        </Suspense>
      ) : tab === "calendar" ? (
        <Suspense fallback={<p>Loading calendar administration…</p>}>
          <CalendarAdmin />
        </Suspense>
      ) : tab === "members" ? (
        <MemberAdmin />
      ) : tab === "treasury" ? (
        <Treasury />
      ) : tab === "events" ? (
        <EventAdmin />
      ) : tab === "checkin" ? (
        <CheckIn />
      ) : tab === "archive" ? (
        <ArchiveAdmin />
      ) : (
        <RecordsAdmin />
      )}
    </>
  );
}
