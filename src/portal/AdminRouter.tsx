import { lazy, Suspense, useState } from "react";
import {
  MemberAdmin,
  Treasury,
  EventAdmin,
  CheckIn,
  ArchiveAdmin,
  RecordsAdmin,
} from "./Admin";
import { BankActivity } from "./BankActivity";
const FinanceAdmin = lazy(() => import("./FinanceAdmin"));
const CalendarAdmin = lazy(() =>
  import("./CalendarAdmin").then((m) => ({ default: m.CalendarAdmin })),
);
const ManualAchAdmin = lazy(() => import("./ManualAchAdmin"));
const OfficeHome = lazy(() => import("./OfficeHome"));
const RecordPayment = lazy(() => import("./RecordPayment"));
const FamilyAdmin = lazy(() => import("./FamilyAdmin"));
const DuesReportsAdmin = lazy(() => import("./DuesReportsAdmin"));
export default function AdminRouter({
  role,
  initialView,
  leaveOffice,
}: {
  role: string;
  initialView?: string;
  leaveOffice?: () => void;
}) {
  const finance = ["admin", "treasurer", "secretary"].includes(role);
  const tabs = [
    ...(finance
      ? [
          ["home", "Office tasks"],
          ["record", "Record payment"],
          ["dues-reports", "Previously paid dues"],
          ["households", "Households"],
          ["family", "Family connections"],
          ["manual-ach", "Bank setup"],
          ["bank", "Bank activity"],
          ["treasury", "Verify Zelle reports"],
          ["collections", "Collections & corrections"],
          ["imports", "Spreadsheet imports"],
          ["reports", "Financial statements"],
          ["overview", "Account balances"],
          ["journals", "Bookkeeping entries"],
          ...(role !== "secretary" ? [["periods", "Close a month"]] : []),
        ]
      : []),
    ...(role === "admin" || role === "secretary"
      ? [["calendar", "Church calendar"]]
      : []),
    ...(role === "admin"
      ? [
          ["members", "Website members"],
          ["events", "Events"],
          ["archive", "Archive"],
          ["access", "Staff invitations"],
          ["records", "Exports & audit"],
        ]
      : []),
    ...(role === "admin" || role === "checkin"
      ? [["checkin", "Event check-in"]]
      : []),
  ];
  const [tab, setTab] = useState(() => {
    const requested =
      initialView ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("office") ||
          (new URLSearchParams(window.location.search).has("oauth_state_id")
            ? "bank"
            : "")
        : "");
    return tabs.some(([key]) => key === requested) ? requested : tabs[0][0];
  });
  const choose = (key: string) => {
    if (!tabs.some(([allowed]) => key === allowed)) return;
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "admin");
    url.searchParams.set("office", key);
    history.replaceState(null, "", url);
  };
  const financeTab = [
    "overview",
    "households",
    "collections",
    "imports",
    "reports",
    "journals",
    "periods",
    "access",
  ].includes(tab);
  return (
    <div className="office-workspace">
      <nav className="office-sidebar" aria-label="Monastery office">
        <h2>Monastery office</h2>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => choose(key)}
          >
            {label}
          </button>
        ))}
        {leaveOffice ? (
          <button type="button" className="office-return" onClick={leaveOffice}>
            Return to my membership
          </button>
        ) : null}
      </nav>
      <div className="office-main">
        <Suspense fallback={<p role="status">Opening office tools…</p>}>
          {tab === "home" ? (
            <OfficeHome choose={choose} />
          ) : tab === "record" ? (
            <RecordPayment />
          ) : tab === "dues-reports" ? (
            <DuesReportsAdmin onRecord={() => choose("record")} />
          ) : tab === "family" ? (
            <FamilyAdmin role={role} />
          ) : tab === "manual-ach" ? (
            <ManualAchAdmin role={role} />
          ) : tab === "bank" ? (
            <section className="panel">
              <BankActivity role={role} />
            </section>
          ) : financeTab ? (
            <FinanceAdmin
              key={tab}
              role={role}
              initialTab={tab}
              hideNavigation
            />
          ) : tab === "calendar" ? (
            <CalendarAdmin />
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
        </Suspense>
      </div>
    </div>
  );
}
