import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { appeal, invocation, site } from "../content";
import { TextLink, PageIntro } from "../components/Layout";
export const fundNames: Record<string, string> = {
  construction: "Construction fund",
  general: "General offering",
  membership: "Membership offering",
};
export function OfferingForm({
  onContinue,
  disabled = false,
}: {
  onContinue?: (a: {
    amountCents: number;
    frequency: "once" | "monthly";
    fund: string;
    method: "ach" | "zelle";
  }) => void;
  disabled?: boolean;
}) {
  const [amount, setAmount] = useState("50");
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [fund, setFund] = useState("construction");
  const [method, setMethod] = useState<"ach" | "zelle">("zelle");
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!onContinue) return;
    const p = new URLSearchParams(window.location.search);
    const selected = p.get("amount");
    if (
      selected &&
      Number.isFinite(Number(selected)) &&
      Number(selected) >= 1 &&
      Number(selected) <= 100000
    )
      setAmount(selected);
    const selectedFund = p.get("fund");
    if (selectedFund && fundNames[selectedFund]) setFund(selectedFund);
    if (p.get("method") === "ach") setMethod("ach");
    if (p.get("frequency") === "monthly") {
      setFrequency("monthly");
      setMethod("ach");
    }
  }, []);
  useEffect(() => {
    import("qrcode")
      .then((q) =>
        q.toDataURL(site.zelle, {
          width: 200,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      )
      .then(setQr)
      .catch(() => {});
  }, []);
  return (
    <form
      className="offering-form"
      onSubmit={(e) => {
        e.preventDefault();
        const a = {
          amountCents: Math.round(Number(amount) * 100),
          frequency,
          fund,
          method,
        };
        if (onContinue) onContinue(a);
        else
          window.location.href = `/members?view=give&amount=${encodeURIComponent(amount)}&fund=${fund}&frequency=${frequency}&method=${method}`;
      }}
    >
      <h2>Make an offering</h2>
      <p>Support the mission and future of our monastery.</p>
      <fieldset>
        <legend>Giving frequency</legend>
        <div className="radio-row">
          <label>
            <input
              type="radio"
              name="frequency"
              value="once"
              checked={frequency === "once"}
              onChange={() => setFrequency("once")}
            />
            One time
          </label>
          <label>
            <input
              type="radio"
              name="frequency"
              value="monthly"
              checked={frequency === "monthly"}
              onChange={() => {
                setFrequency("monthly");
                setMethod("ach");
              }}
            />
            Monthly
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Select amount</legend>
        <div className="amount-options">
          {["25", "50", "100", "250"].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={amount === v}
              onClick={() => setAmount(v)}
            >
              ${v}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Gift amount (USD)
        <input
          type="number"
          name="amount"
          min="1"
          max="100000"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label>
        Fund
        <select value={fund} onChange={(e) => setFund(e.target.value)}>
          {Object.entries(fundNames).map(([v, label]) => (
            <option value={v} key={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Payment method</legend>
        <div className="method-options">
          <button
            type="button"
            aria-pressed={method === "ach"}
            onClick={() => setMethod("ach")}
          >
            Bank account (ACH)
          </button>
          <button
            type="button"
            aria-pressed={method === "zelle"}
            onClick={() => {
              setMethod("zelle");
              setFrequency("once");
            }}
          >
            Zelle
          </button>
        </div>
      </fieldset>
      {method === "zelle" ? (
        <div className="zelle-details">
          {qr ? (
            <img
              src={qr}
              width="152"
              height="152"
              alt="QR code for the monastery’s existing Zelle donation link"
            />
          ) : null}
          <div>
            <p>
              Send your offering through your bank using the monastery’s
              existing Zelle link. Confirm the recipient in your bank before
              sending.
            </p>
            <p className="zelle-recipient">
              <strong>Monastery of Abuna Hara Dengeel</strong>
              <br />
              {site.zelleRecipient}
            </p>
            <a
              className="text-link"
              href={site.zelle}
              target="_blank"
              rel="noreferrer"
            >
              Open Zelle donation link <ArrowRight size={16} />
            </a>
            <p className="small">
              After sending, sign in to report your transfer. The treasurer will
              confirm it against bank records.
            </p>
          </div>
        </div>
      ) : (
        <p className="payment-note">
          <ShieldCheck size={18} />
          Bank giving uses a secure payment-provider checkout. Availability
          appears after member sign-in.
        </p>
      )}
      <button type="submit" className="button full" disabled={disabled}>
        {disabled
          ? "Please wait…"
          : method === "zelle"
            ? "Record my Zelle gift"
            : frequency === "monthly"
              ? "Set up monthly giving"
              : "Continue with bank giving"}
        <ArrowRight size={17} />
      </button>
      <p className="small">
        {onContinue
          ? "You can review the next step before continuing."
          : "Member sign-in keeps your giving records together."}
      </p>
      <p className="small">
        Your contribution is voluntary. Membership and pastoral care are not
        conditional on giving.
      </p>
    </form>
  );
}
export function Give() {
  return (
    <div className="wrap">
      <div className="give-layout">
        <div className="pastoral-letter">
          <h1>
            Let us build this
            <br />
            house of God.
          </h1>
          <p className="invocation">{invocation}</p>
          <div className="fine-rule" />
          <h2>To our cherished spiritual family and supporters,</h2>
          {appeal.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="letter-signoff">
            With love in Christ,
            <br />
            {site.fullName}
          </p>
          <img
            className="letter-photo"
            loading="lazy"
            src="/assets/property/land-01.webp"
            alt="The residence and grounds at the monastery’s acquired property"
          />
        </div>
        <aside>
          <OfferingForm />
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>
            Your gift supports
            <br />
            the work ahead.
          </h2>
          <TextLink href="/monastery#plans">See the development plan</TextLink>
        </div>
        <div className="three-columns">
          <article>
            <span className="phase-number">01</span>
            <h3>A place for prayer</h3>
            <p>
              Preparing the existing garage for congregational gathering and
              worship under the guidance of the Church.
            </p>
          </article>
          <article>
            <span className="phase-number">02</span>
            <h3>Care for the land</h3>
            <p>
              Professional planning, permitting, access, utilities, site work,
              and assessment of the proposed well.
            </p>
          </article>
          <article>
            <span className="phase-number">03</span>
            <h3>A lasting monastery</h3>
            <p>
              The permanent church and spaces for hospitality, education, and
              monastic life, developed as resources allow.
            </p>
          </article>
        </div>
      </section>
      <section className="faq-section">
        <h2>Giving with understanding</h2>
        {[
          [
            "How is a Zelle gift confirmed?",
            "After you send a transfer through your bank, report the date, amount, and confirmation reference in the member portal. A treasurer checks the bank records. A reported transfer is not a confirmed receipt.",
          ],
          [
            "When will my ACH gift appear?",
            "Bank payments can take several business days to complete. Your portal distinguishes pending, confirmed, failed, refunded, and disputed payments. Returning from checkout does not by itself confirm a gift.",
          ],
          [
            "Can I give every month?",
            "Monthly bank giving is available when the monastery’s payment account is connected. You authorize the recurring amount in the provider’s checkout and can manage or cancel it through the portal. For standing Zelle transfers, ask your bank about its options.",
          ],
          [
            "Can I request a receipt or discuss a larger gift?",
            "Contact support@haramonastery.org for an official acknowledgment, a correction, a restricted gift, or a larger contribution. Portal records summarize transactions; tax treatment depends on the receiving organization and your circumstances.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
