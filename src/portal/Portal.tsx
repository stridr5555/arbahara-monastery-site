import { lazy, Suspense, useState } from "react";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { SignIn } from "./Auth";
import { Profile } from "./Profile";
import { GivingHistory, MemberGive } from "./Giving";
import { MyTickets, EventList } from "./Tickets";
import { ErrorMessage, message, downloadJson } from "../components/Live";
const Admin = lazy(() => import("./AdminRouter"));
function Dashboard() {
  const me = useQuery(api.members.me);
  const { signOut } = useAuthActions();
  const client = useConvex();
  const [view, setView] = useState(
    () => new URLSearchParams(window.location.search).get("view") || "overview",
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
    ["overview", "Overview"],
    ["profile", "My membership"],
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
      <nav className="portal-tabs" aria-label="Member portal">
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
      <ErrorMessage message={error} />
      {view === "overview" ? (
        <>
          <div className="dashboard-grid">
            <section className="panel welcome-panel">
              <h2>
                {me.profile
                  ? `Peace be with you, ${me.profile.name.split(" ")[0]}.`
                  : "Welcome to your member portal"}
              </h2>
              <p>
                {me.profile
                  ? "Thank you for being part of the monastery’s life. Your membership, offerings, and event tickets are gathered here."
                  : "Complete your profile so the monastery office can review your membership."}
              </p>
              <button className="button" onClick={() => choose("profile")}>
                {me.profile ? "View my membership" : "Complete my profile"}
              </button>
            </section>
            <section className="panel">
              <h2>Membership</h2>
              <span className="status">
                {me.profile?.status || "Not yet submitted"}
              </span>
              <p>Your membership is reviewed by the monastery office.</p>
              {me.profile ? <small>{me.profile.memberNumber}</small> : null}
            </section>
            <GivingHistory compact />
            <section className="panel">
              <h2>Upcoming gatherings</h2>
              <p>See the monastery’s published events and reserve a ticket.</p>
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
              <p>Download a copy of your membership and giving records.</p>
            </div>
            <button className="text-button" onClick={() => choose("account")}>
              Download my data
            </button>
          </div>
        </>
      ) : view === "profile" ? (
        <Profile profile={me.profile} email={me.email!} />
      ) : view === "give" ? (
        <MemberGive />
      ) : view === "giving" ? (
        <>
          <p className="notice">
            A return from checkout is not payment confirmation. Bank gifts may
            remain pending while they process.
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
            account. To set or reset a password, sign out and use the password
            options on the sign-in page. Keep access to this email address
            secure. Contact the office if your email changes or you need a
            record corrected or removed.
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
          <a className="text-link" href="mailto:support@haramonastery.org">
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
              Event check-in and administration require an authorized staff
              account.
            </p>
          </section>
        )
      ) : (
        <p>Choose a section from the member menu.</p>
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
