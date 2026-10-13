import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
const interests = [
  "Prayer and worship",
  "Volunteering",
  "Youth and education",
  "Construction support",
  "Archive preservation",
];
export function Profile({
  profile,
  email,
}: {
  profile: Doc<"members"> | null;
  email: string;
}) {
  const save = useMutation(api.members.save),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [values, setValues] = useState({
    name: profile?.name || "",
    baptismalName: profile?.baptismalName || "",
    spouseName: profile?.spouseName || "",
    spouseBaptismalName: profile?.spouseBaptismalName || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    city: profile?.city || "",
    language: profile?.language || ("en" as "en" | "am"),
    interests: profile?.interests || ([] as string[]),
  });
  const field = (
    key:
      | "name"
      | "baptismalName"
      | "spouseName"
      | "spouseBaptismalName"
      | "phone"
      | "address"
      | "city",
    label: string,
    am: string,
    required = false,
    autoComplete?: string,
  ) => (
    <label>
      {label} / <span lang="am">{am}</span>
      <input
        name={key}
        value={values[key]}
        type={key === "phone" ? "tel" : "text"}
        required={required}
        maxLength={key === "address" ? 500 : key === "phone" ? 40 : 120}
        autoComplete={autoComplete}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );
  if (saved)
    return (
      <section className="panel">
        <h2>
          Welcome to our spiritual family.
          <br />
          <span lang="am">እንኳን ወደ መንፈሳዊ ቤተሰባችን በሰላም መጡ።</span>
        </h2>
        <p>
          Your profile has been saved for the monastery office to review.
          Household approval and payment are separate. If you already belong to
          a household on our roster, ask the office to link it before a second
          household is approved.
        </p>
        <div className="actions">
          <a className="button" href="/members?view=calendar">
            Find our next gathering
          </a>
          <a className="button secondary" href="/members?view=give">
            Explore optional giving
          </a>
          <button
            className="text-button"
            onClick={() => {
              setSaved(false);
              setStep(0);
            }}
          >
            Edit my details
          </button>
        </div>
      </section>
    );
  return (
    <section className="panel signup-panel">
      <h2>
        {profile ? "Your household profile" : "Join our spiritual family"}
      </h2>
      <p lang="am">የአባልነት ምዝገባ</p>
      <p>
        A few details help us welcome your household. General membership is $20
        per family per Gregorian month after approval, not per spouse; exempt
        households remain exempt. Giving is not required to submit this
        application.
      </p>
      <ol className="signup-steps">
        {[
          "Your household / ቤተሰብ",
          "Stay connected / አድራሻ",
          "Review / ማረጋገጫ",
        ].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      {profile && (
        <p>
          <a className="text-link" href="/members?view=family">
            Connect your spouse’s account by email or phone
          </a>
          . Entering a spouse’s name here alone does not link their account.
        </p>
      )}
      <form
        className="profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (step < 2) {
            setStep(step + 1);
            return;
          }
          const data = new FormData(e.currentTarget);
          if (data.get("consent") !== "on") {
            setError("Please accept the privacy notice.");
            return;
          }
          setBusy(true);
          try {
            await save({ ...values, consent: true });
            setSaved(true);
          } catch (error) {
            setError(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {step === 0 ? (
          <>
            <h3>
              Who is joining us?
              <br />
              <span lang="am">ማን ነው የሚቀላቀለን?</span>
            </h3>
            <div className="two-columns">
              {field("name", "Full name", "ሙሉ ስም", true, "name")}
              {field("baptismalName", "Baptismal name (optional)", "የክርስትና ስም")}
              {field(
                "spouseName",
                "Spouse’s full name (optional)",
                "የባለቤት ሙሉ ስም",
              )}
              {field(
                "spouseBaptismalName",
                "Spouse’s baptismal name (optional)",
                "የባለቤት የክርስትና ስም",
              )}
            </div>
            <p className="small">
              One household, one membership obligation. Adding a spouse here
              does not create a second bill or grant account access.
            </p>
          </>
        ) : step === 1 ? (
          <>
            <h3>How can we stay in touch?</h3>
            <label>
              Verified email / <span lang="am">ኢሜይል</span>
              <input value={email} readOnly autoComplete="email" />
            </label>
            <div className="two-columns">
              {field("phone", "Phone", "ስልክ ቁጥር", false, "tel")}
              {field(
                "address",
                "Street address",
                "አድራሻ",
                false,
                "street-address",
              )}
              {field(
                "city",
                "City, state and ZIP",
                "ከተማ፣ ግዛት እና ዚፕ ኮድ",
                false,
                "address-level2",
              )}
            </div>
            <label>
              Preferred language / <span lang="am">ቋንቋ</span>
              <select
                value={values.language}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    language: e.target.value as "en" | "am",
                  }))
                }
              >
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
              </select>
            </label>
            <fieldset>
              <legend>How would you like to take part? (optional)</legend>
              {interests.map((i) => (
                <label className="check-label" key={i}>
                  <input
                    type="checkbox"
                    checked={values.interests.includes(i)}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        interests: e.target.checked
                          ? [...v.interests, i]
                          : v.interests.filter((x) => x !== i),
                      }))
                    }
                  />
                  {i}
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <>
            <h3>
              Everything look right?
              <br />
              <span lang="am">መረጃው ትክክል ነው?</span>
            </h3>
            <dl className="form-review">
              {Object.entries({
                "Full name / ሙሉ ስም": values.name,
                "Baptismal name / የክርስትና ስም": values.baptismalName,
                "Spouse / ባለቤት": values.spouseName,
                "Spouse baptismal name": values.spouseBaptismalName,
                "Email / ኢሜይል": email,
                "Phone / ስልክ": values.phone,
                "Address / አድራሻ": `${values.address} ${values.city}`,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value.trim() || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <label className="check-label">
              <input type="checkbox" name="consent" required />I confirm these
              details and consent to their use for membership administration as
              described in the{" "}
              <a href="/privacy" target="_blank" rel="noreferrer">
                privacy notice
              </a>
              . <span lang="am">መረጃውን አረጋግጫለሁ።</span>
            </label>
            <p>
              New household dues start the month after approval. This
              application does not authorize a bank debit or card charge.
            </p>
          </>
        )}
        <ErrorMessage message={error} />
        <div className="actions">
          {step > 0 ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => setStep(step - 1)}
            >
              Back / ተመለስ
            </button>
          ) : null}
          <button className="button" disabled={busy}>
            {busy
              ? "Saving…"
              : step === 2
                ? "Submit application / ላክ"
                : "Continue / ቀጥል"}
          </button>
        </div>
      </form>
    </section>
  );
}
