import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
export function Profile({
  profile,
  email,
}: {
  profile: Doc<"members"> | null;
  email: string;
}) {
  const save = useMutation(api.members.save);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <section className="panel">
      <h2>{profile ? "My membership" : "Join our spiritual family"}</h2>
      <p>
        Your profile helps the monastery office welcome you and review your
        membership. Giving is voluntary.
      </p>
      {profile ? (
        <p>
          <span className="status">{profile.status}</span>{" "}
          <span className="small">
            Member reference: {profile.memberNumber}
          </span>
        </p>
      ) : null}
      <form
        className="profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          const f = new FormData(e.currentTarget);
          try {
            await save({
              name: String(f.get("name")),
              phone: String(f.get("phone")),
              city: String(f.get("city")),
              language: f.get("language") as "en" | "am",
              interests: f.getAll("interests").map(String),
              consent: f.get("consent") === "on",
            });
            setSaved(true);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="two-columns">
          <label>
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={120}
              defaultValue={profile?.name}
            />
          </label>
          <label>
            Verified email
            <input value={email} readOnly autoComplete="email" />
          </label>
          <label>
            Phone (optional)
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              defaultValue={profile?.phone}
            />
          </label>
          <label>
            City (optional)
            <input
              name="city"
              autoComplete="address-level2"
              maxLength={120}
              defaultValue={profile?.city}
            />
          </label>
        </div>
        <label>
          Preferred language
          <select name="language" defaultValue={profile?.language || "en"}>
            <option value="en">English</option>
            <option value="am">Amharic / አማርኛ</option>
          </select>
        </label>
        <fieldset>
          <legend>How would you like to take part? (optional)</legend>
          <div className="checkbox-list">
            {[
              "Prayer and worship",
              "Volunteering",
              "Youth and education",
              "Construction support",
              "Archive preservation",
            ].map((i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  name="interests"
                  value={i}
                  defaultChecked={profile?.interests.includes(i)}
                />
                {i}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="check-label">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={!!profile}
          />
          I have read the <a href="/privacy">privacy notice</a> and agree that
          the monastery may use this information to administer my membership.
        </label>
        <ErrorMessage message={error} />
        {saved ? (
          <p className="form-message" role="status">
            {profile
              ? "Your profile has been saved."
              : "Your application has been received for review by the monastery office."}
          </p>
        ) : null}
        <button className="button" disabled={busy}>
          {busy
            ? "Saving…"
            : profile
              ? "Save my profile"
              : "Submit membership application"}
        </button>
      </form>
    </section>
  );
}
