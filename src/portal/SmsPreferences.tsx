import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { smsPrograms, type SmsProgramId } from "../../convex/smsProgram";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";

type Controls = {
  collecting?: boolean;
  authenticated?: boolean;
  current?: Doc<"smsConsents">[];
  optIn?: (programId: SmsProgramId, phone: string) => Promise<unknown>;
  withdraw?: (programId: SmsProgramId) => Promise<unknown>;
};

function Choice({ id, controls }: { id: SmsProgramId; controls: Controls }) {
  const program = smsPrograms[id];
  const existing = controls.current?.find((c) => c.programId === id);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const canSave =
    controls.authenticated && controls.collecting && !!controls.current;
  return (
    <section className="panel" data-no-translate lang="en">
      <h2>{program.title}</h2>
      {existing ? (
        <p>
          Website preference:{" "}
          {existing.status === "consented" ? "consent recorded" : "withdrawn"}{" "}
          for {existing.phone}.
        </p>
      ) : null}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSave || !consent || !controls.optIn) return;
          setBusy(true);
          setError("");
          setStatus("");
          try {
            await controls.optIn(id, phone);
            setConsent(false);
            setPhone("");
            setStatus(
              `${program.title}: your consent was recorded. Messaging is not active; no text was sent.`,
            );
          } catch (error) {
            setError(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor={`sms-phone-${id}`}>
          Your mobile number for this category
        </label>
        <input
          id={`sms-phone-${id}`}
          name={`sms-phone-${id}`}
          type="tel"
          autoComplete="tel"
          value={phone}
          maxLength={40}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={busy}
          aria-describedby={`sms-disclosure-${id}`}
        />
        <label className="check-label">
          <input
            type="checkbox"
            name={`sms-consent-${id}`}
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy}
          />
          <span id={`sms-disclosure-${id}`}>{program.disclosure}</span>
        </label>
        <p>
          <a href="/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          {" · "}
          <a href={`/terms#sms-${id}`} target="_blank" rel="noreferrer">
            SMS terms
          </a>
        </p>
        <p>
          Choose this only for your own mobile number. Confirm it carefully; the
          website does not verify possession by text.
        </p>
        <button
          className="button"
          type="submit"
          disabled={!canSave || !consent || busy}
        >
          Record optional SMS consent
        </button>
      </form>
      {existing?.status === "consented" ? (
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!controls.withdraw) return;
            setBusy(true);
            setError("");
            setStatus("");
            try {
              await controls.withdraw(id);
              setStatus(
                `${program.title}: your website consent was withdrawn.`,
              );
            } catch (error) {
              setError(message(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          Withdraw consent for this category
        </button>
      ) : null}
      <ErrorMessage message={error} />
      <p role="status">{status}</p>
    </section>
  );
}

export function SmsChoices(controls: Controls = {}) {
  return (
    <div data-no-translate lang="en">
      {!controls.authenticated ? (
        <p>
          <a href="/members">Sign in or create an account</a> to manage your own
          optional choices. Creating an account does not enroll
          you in SMS.
        </p>
      ) : null}
      {controls.collecting === false ? (
        <p>
          SMS enrollment is closed. The optional choices below show the
          disclosures.
        </p>
      ) : null}
      <Choice id="informational" controls={controls} />
      <Choice id="fundraising" controls={controls} />
    </div>
  );
}

export function ConnectedPreferences() {
  const { isAuthenticated } = useConvexAuth();
  const availability = useQuery(api.smsConsent.availability);
  const current = useQuery(api.smsConsent.mine, isAuthenticated ? {} : "skip");
  const optIn = useMutation(api.smsConsent.optIn);
  const withdraw = useMutation(api.smsConsent.withdraw);
  return (
    <SmsChoices
      collecting={availability?.collecting}
      authenticated={isAuthenticated}
      current={current}
      optIn={(programId, phone) =>
        optIn({
          programId,
          phone,
          consent: true,
          disclosureVersion: smsPrograms[programId].version,
        })
      }
      withdraw={(programId) => withdraw({ programId })}
    />
  );
}
