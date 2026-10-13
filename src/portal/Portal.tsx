import { lazy, Suspense, useState } from "react";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { SignIn } from "./Auth";
import { Profile } from "./Profile";
import { GivingHistory, MemberGive } from "./Giving";
import { MyTickets, EventList } from "./Tickets";
import { ErrorMessage, message, downloadJson } from "../components/Live";
import { HouseholdDues } from "./Household";
import { ChurchCalendar, NextGatherings } from "../components/ChurchCalendar";
import { announcements } from "../content";
import { CalendarConnection } from "./CalendarConnection";
import { ManualAch } from "./ManualAch";
const Admin = lazy(() => import("./AdminRouter"));
function Dashboard() {
  const me = useQuery(api.members.me);
  const { signOut } = useAuthActions();
  const client = useConvex();
  const [view, setView] = useState(
    () =>
      new URLSearchParams(window.location.search).get("view") ||
      (new URLSearchParams(window.location.search).has("oauth_state_id")
        ? "admin"
        : "overview"),
  );
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  if (!me)
    return (
      <p className="empty" role="status">
        Loading your member record…
      </p>
    );
  const staff = me.role !== "member";
  const tabs = [
    ["overview", "My household"],
    ["calendar", "Calendar"],
    ["dues", "Membership dues"],
    ["bank-setup", "Bank payment setup"],
    ["profile", "Household profile"],
    ["give", "Make an offering"],
    ["giving", "Giving history"],
    ["tickets", "My tickets"],
    ["events", "Gatherings"],
    ["account", "Account"],
    ...(staff ? [["admin", "Administration"]] : []),
  ];
  const choose = (next: string) => {
    setView(next);
    const u = new URL(window.location.href);
    u.searchParams.set("view", next);
    history.replaceState(null, "", u);
  };
  return (
    <>
      <div className="portal-session">
        <span>Signed in as {me.email}</span>
        <button className="text-button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      {staff && (view === "admin" || view === "checkin") ? (
        <Suspense fallback={<p>Loading administration…</p>}>
          <Admin
            role={me.role}
            initialView={view === "checkin" ? "checkin" : undefined}
            leaveOffice={() => choose("overview")}
          />
        </Suspense>
      ) : (
        <div className="portal-workspace">
          <nav className="portal-sidebar" aria-label="Member portal">
            <h2>Arbahara</h2>
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={view === key ? "page" : undefined}
                onClick={() => choose(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="portal-main">
            <ErrorMessage message={error} />
            {view === "overview" ? (
              <>
                <h2>Peace be with your household.</h2>
                <p className="lead">
                  Your membership, gatherings and monastery news.
                </p>
                <div className="dashboard-grid">
                  <div className="panel">
                    <NextGatherings />
                  </div>
                  <HouseholdDues compact />
                  <section className="panel">
                    <h3>{announcements[0].title}</h3>
                    <p>{announcements[0].excerpt}</p>
                    <a
                      className="text-link"
                      href={`/announcements/${announcements[0].slug}`}
                    >
                      Read the founding announcement
                    </a>
                  </section>
                  <GivingHistory compact />
                  <section className="panel">
                    <h2>Upcoming gatherings</h2>
                    <p>
                      See the monastery’s published events and reserve a ticket.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => choose("events")}
                    >
                      View events
                    </button>
                  </section>
                </div>
                <div className="panel export-banner">
                  <div>
                    <h3>Keep your own records</h3>
                    <p>
                      Download a copy of your membership and giving records.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => choose("account")}
                  >
                    Download my data
                  </button>
                </div>
              </>
            ) : view === "calendar" ? (
              <>
                <CalendarConnection />
                <ChurchCalendar />
              </>
            ) : view === "dues" ? (
              <HouseholdDues />
            ) : view === "bank-setup" ? (
              <Suspense fallback={<p>Checking secure bank setup…</p>}>
                <ManualAch />
              </Suspense>
            ) : view === "profile" ? (
              <Profile profile={me.profile} email={me.email!} />
            ) : view === "give" ? (
              <MemberGive />
            ) : view === "giving" ? (
              <>
                <p className="notice">
                  A return from checkout is not payment confirmation. Bank gifts
                  may remain pending while they process.
                </p>
                <GivingHistory />
              </>
            ) : view === "tickets" ? (
              <MyTickets />
            ) : view === "events" ? (
              <EventList signedIn />
            ) : view === "account" ? (
              <section className="panel">
                <h2>Your account & records</h2>
                <p>Verified email: {me.email}</p>
                <p>
                  Sign in with your password or a connected Google or Facebook
                  account. To set or reset a password, sign out and use the
                  password options on the sign-in page. Keep access to this
                  email address secure. Contact the office if your email changes
                  or you need a record corrected or removed.
                </p>
                <button
                  className="button secondary"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      downloadJson(
                        "my-arbahara-records.json",
                        await client.query(api.members.exportMine, {}),
                      );
                    } catch (e) {
                      setError(message(e));
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? "Preparing…" : "Download my data"}
                </button>
                <a
                  className="text-link"
                  href="mailto:support@haramonastery.org"
                >
                  Request account assistance
                </a>
              </section>
            ) : view === "admin" || view === "checkin" ? (
              staff ? (
                <Suspense fallback={<p>Loading administration…</p>}>
                  <Admin
                    role={me.role}
                    initialView={view === "checkin" ? "checkin" : undefined}
                  />
                </Suspense>
              ) : (
                <section className="panel">
                  <h2>Staff access required</h2>
                  <p>
                    Event check-in and administration require an authorized
                    staff account.
                  </p>
                </section>
              )
            ) : (
              <p>Choose a section from the member menu.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
export default function Portal() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  return isLoading ? (
    <p className="empty" role="status">
      Checking your sign-in…
    </p>
  ) : isAuthenticated ? (
    <Dashboard />
  ) : (
    <SignIn />
  );
}
