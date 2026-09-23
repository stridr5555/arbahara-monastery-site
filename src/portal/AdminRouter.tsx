import { useState } from "react";
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
          ["members", "Members"],
          ["treasury", "Zelle review"],
          ["events", "Events"],
          ["checkin", "Check-in"],
          ["archive", "Archive"],
          ["records", "Exports & audit"],
        ]
      : role === "treasurer"
        ? [["treasury", "Zelle review"]]
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
      {tab === "members" ? (
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
