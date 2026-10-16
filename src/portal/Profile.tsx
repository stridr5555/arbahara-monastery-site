import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
import {
  AchTransition,
  DuesDeclarationFields,
  duesPayload,
  emptyDuesAnswer,
} from "./DuesDeclaration";
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
  onEnrolled,
}: {
  profile: Doc<"members"> | null;
  email: string;
  onEnrolled?: () => void;
}) {
  const save = useMutation(api.members.save),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [spouseKind, setSpouseKind] = useState<"email" | "phone">("phone");
  const [spouseContact, setSpouseContact] = useState("");
  const [familyConsent, setFamilyConsent] = useState(false);
  const needsDuesAnswer = !profile || profile.status === "pending";
  const lastStep = needsDuesAnswer ? 3 : 2;
  const [duesAnswer, setDuesAnswer] = useState(emptyDuesAnswer);
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
          Your membership is active. Family dues are $20 per month total, not
          per spouse. No office approval is needed. Bank payment setup is a
          separate step and this registration has not charged you.
        </p>
        <div className="actions">
          <a className="button" href="/members?view=bank-setup">
            Continue to ACH setup
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
        Register to become an official member immediately. Dues are $20 per
        month for the whole family, not per spouse. New families begin dues this
        Gregorian month; existing family coverage and exemptions stay in place.
        Next, we will guide you directly to secure ACH setup. Registration
        itself does not authorize a bank debit or card charge.
      </p>
      <ol className="signup-steps">
        {[
          "Your household / ቤተሰብ",
          "Stay connected / አድራሻ",
          ...(needsDuesAnswer ? ["Previous dues / ያለፈ መዋጮ"] : []),
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
          if (needsDuesAnswer && step === 2) {
            try {
              duesPayload(duesAnswer);
            } catch (error) {
              setError(message(error));
              return;
            }
          }
          if (step < lastStep) {
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
            await save({
              ...values,
              consent: true,
              enroll: true,
              ...(needsDuesAnswer
                ? { duesDeclaration: duesPayload(duesAnswer) }
                : {}),
              ...(spouseContact.trim()
                ? {
                    spouseContactKind: spouseKind,
                    spouseContact,
                    familyConsent,
                  }
                : {}),
            });
            if ((!profile || profile.status === "pending") && onEnrolled)
              onEnrolled();
            else setSaved(true);
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
            <label>
              Find your spouse by / <span lang="am">ባለቤትዎን ያገናኙ</span>
              <select
                value={spouseKind}
                onChange={(e) => {
                  setSpouseKind(e.target.value as "email" | "phone");
                  setSpouseContact("");
                  setFamilyConsent(false);
                }}
              >
                <option value="phone">Phone number</option>
                <option value="email">Email address</option>
              </select>
            </label>
            <label>
              {spouseKind === "phone"
                ? "Spouse’s phone number (optional)"
                : "Spouse’s email address (optional)"}
              <input
                name="spouseContact"
                type={spouseKind === "phone" ? "tel" : "email"}
                value={spouseContact}
                maxLength={254}
                autoComplete="off"
                onChange={(e) => setSpouseContact(e.target.value)}
              />
            </label>
            {spouseContact.trim() && (
              <label className="check-label">
                <input
                  type="checkbox"
                  required
                  checked={familyConsent}
                  onChange={(e) => setFamilyConsent(e.target.checked)}
                />
                I confirm this person is my spouse and want one $20 monthly
                family dues account. An exact, unique match links family billing
                automatically, without spouse or office approval. Our private
                account and bank records remain separate.
              </label>
            )}
            <p className="small">
              Use your spouse’s registered email or phone number, not only their
              name. If no unique match exists yet, the contact is saved for a
              later match. Your membership does not wait for the match.
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
        ) : needsDuesAnswer && step === 2 ? (
          <>
            <DuesDeclarationFields
              value={duesAnswer}
              onChange={setDuesAnswer}
            />
            <AchTransition />
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
                "Spouse email or phone": spouseContact,
                "Email / ኢሜይል": email,
                "Phone / ስልክ": values.phone,
                "Address / አድራሻ": `${values.address} ${values.city}`,
                ...(needsDuesAnswer
                  ? {
                      "Previous family dues":
                        duesAnswer.answer === "yes"
                          ? `Reported paid · ${duesAnswer.method}${duesAnswer.amount ? ` · $${duesAnswer.amount}` : ""}`
                          : duesAnswer.answer === "no"
                            ? "Not already paid"
                            : "Not sure — office help requested",
                      "Coverage reported": duesAnswer.coverage,
                      "Payment date reported": duesAnswer.date,
                      "Payment details reported": duesAnswer.reference,
                    }
                  : {}),
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
              By submitting, you choose official membership at $20 per month for
              your whole family, with no approval wait. Next: secure ACH setup.
              This registration does not authorize a bank debit or card charge.
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
              : step === lastStep
                ? "Become a member & continue to ACH / ላክ"
                : "Continue / ቀጥል"}
          </button>
        </div>
      </form>
    </section>
  );
}
