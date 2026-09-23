import { useState } from "react";
import { PageIntro, LinkButton } from "../components/Layout";
import { site } from "../content";
import { ErrorMessage, message } from "../components/Live";
export function Privacy() {
  return (
    <div className="wrap narrow">
      <PageIntro title="Your trust matters.">
        Privacy notice · Updated September 23, 2026
      </PageIntro>
      <div className="prose">
        <h2>Information we keep</h2>
        <p>
          When you sign in, we use your email address to verify access. If you
          apply for membership, we store the name, phone, city, language
          preference, and service interests you choose to provide, together with
          your consent and membership status.
        </p>
        <p>
          Giving records include the amount, fund, method, date, payment status,
          and provider or transfer reference. Event records include
          registrations, attendee names, and check-in history. Administrative
          changes create an audit record.
        </p>
        <h2>Why we use it</h2>
        <p>
          We use these records to administer membership, reconcile offerings,
          provide your giving history, organize events, protect account access,
          and preserve the monastery’s records. We do not publish your personal
          giving history or sell member information.
        </p>
        <h2>Who can access it</h2>
        <p>
          You can access your own member profile, giving records, and tickets.
          Authorized administrators manage membership and church records.
          Treasurers review reported gifts. Authorized event volunteers validate
          tickets. These permissions are checked by the server.
        </p>
        <h2>Service providers</h2>
        <p>
          The website runs on Vercel. Convex hosts authentication and member
          records. Sign-in codes are sent through the configured email provider.
          Where bank giving is enabled, Stripe handles bank-account collection,
          authorization, and payment processing. We do not store your bank
          login, account number, or routing number. Zelle transfers take place
          through your bank.
        </p>
        <p>
          Some archived films use the existing Amazon S3 media host. Opening an
          external resource or payment link subjects that visit to the
          provider’s privacy practices.
        </p>
        <h2>Storage on your device</h2>
        <p>
          The portal stores authentication tokens on your device to maintain
          your session. Sign out when using a shared device. Do not share
          sign-in codes or ticket QR codes.
        </p>
        <h2>Retention and preservation</h2>
        <p>
          We retain membership, giving, and audit records for administration and
          applicable recordkeeping needs. Public archive materials may be
          preserved for historical purposes. We review access when
          responsibilities change. Backups and exports must remain protected.
        </p>
        <h2>Your requests</h2>
        <p>
          Use “Download my data” in your portal for a copy of your records.
          Email <a href={`mailto:${site.email}`}>{site.email}</a> to request
          access help, correction, deletion, or information about retention.
          Some financial or legal records may need to be retained even after an
          account closes.
        </p>
        <h2>Children and sensitive information</h2>
        <p>
          Adults should manage accounts and event registration for their
          households. Do not submit children’s personal details, identity
          documents, private pastoral conversations, medical information, or
          bank credentials through profile fields or archive submissions.
        </p>
        <h2>Photographs and recordings</h2>
        <p>
          Contact the office if an archived photograph or recording raises a
          consent or privacy concern. New archive material should have a
          documented source, permission, and visibility decision.
        </p>
      </div>
    </div>
  );
}
export function Terms() {
  return (
    <div className="wrap narrow">
      <PageIntro title="Website & giving terms">
        Updated September 23, 2026
      </PageIntro>
      <div className="prose">
        <h2>Use of the website</h2>
        <p>
          This website shares information about Arbahara Monastery and provides
          access to membership administration, giving records, and event
          registration. Please provide accurate information, protect your
          sign-in codes, and use the service respectfully.
        </p>
        <h2>Church life and membership</h2>
        <p>
          A website account allows access to the portal. The monastery office
          reviews membership applications. Account creation or a donation does
          not confer ecclesiastical standing, sacramental eligibility, or a
          particular pastoral relationship. Please seek guidance from the
          clergy.
        </p>
        <h2>Offerings</h2>
        <p>
          Review the amount, frequency, fund, and receiving organization before
          authorizing a payment. Bank payments are subject to processing delays
          and possible returns. Zelle reports require treasury confirmation. A
          checkout return or reported transfer is not proof of receipt.
        </p>
        <p>
          For recurring bank gifts, the payment provider presents the
          authorization terms. Use the portal’s monthly-giving management link
          to review or cancel an existing arrangement. For corrections, refund
          requests, or restricted gifts, contact the office; a refund is not
          automatic.
        </p>
        <h2>Events and tickets</h2>
        <p>
          Tickets are for the named event and are subject to its published
          arrangements and capacity. Do not share a ticket QR code. A valid
          ticket can be checked in once. Cancellation or rescheduling notices
          will appear in the portal. Ordinary worship and pastoral care are
          distinct from event registration.
        </p>
        <h2>Archive and intellectual property</h2>
        <p>
          Archive materials retain their stated source and rights. Permission to
          view does not necessarily grant permission to republish. Contact the
          office before reproducing photographs, recordings, or plans, or to
          report a rights concern.
        </p>
        <h2>Planning information</h2>
        <p>
          Campus concepts and development phases describe intentions. Designs,
          capacities, dates, and facilities may change according to
          ecclesiastical guidance, professional assessment, funding, and
          regulatory approvals. Confirm visiting arrangements directly with the
          office.
        </p>
        <h2>Availability and questions</h2>
        <p>
          We work to keep information accurate and the service available, but
          interruptions and errors can occur. Contact{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a> for help,
          corrections, or questions about these terms.
        </p>
      </div>
    </div>
  );
}
export function Amharic() {
  return (
    <div className="wrap narrow" lang="am">
      <PageIntro title="እንኳን ወደ አርባሐራ ገዳም በደህና መጡ">
        በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ።
      </PageIntro>
      <div className="prose">
        <h2>ስለ ገዳማችን</h2>
        <p>
          ገዳማችን በቴክሳስ፣ ክራንዳል አሥር ኤከር መሬት አግኝቷል። ለጸሎት፣ ለአምልኮ፣ ለመንፈሳዊ ትምህርት እና
          ለወደፊት ትውልድ የሚያገለግል ቦታ ለማዘጋጀት እየሠራን ነው።
        </p>
        <h2>አባልነት እና ልገሳ</h2>
        <p>
          በኢሜይልዎ ወደ አባላት መግቢያ ይግቡ። የአባልነት መረጃዎን ማስገባት፣ የልገሳ መዝገብዎን ማየት እና የዝግጅት
          ቲኬት ማግኘት ይችላሉ። በZelle የተላከ ልገሳ በገንዘብ ያዥ ይረጋገጣል።
        </p>
        <div className="actions">
          <LinkButton href="/members">የአባላት መግቢያ</LinkButton>
          <LinkButton href="/donate" secondary>
            ልገሳ
          </LinkButton>
        </div>
        <h2>መገናኛ እና ጉብኝት</h2>
        <p>ከመጓዝዎ በፊት የአምልኮ ሰዓትና አድራሻ ለማረጋገጥ ያነጋግሩን።</p>
        <p>
          <a href="tel:+12148031347">214 803 1347</a> /{" "}
          <a href="tel:+14692126370">469 212 6370</a>
          <br />
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p lang="en">
          This page provides an Amharic welcome and essential directions. The
          English/Amharic switch is available throughout the website. Contact
          the office for help with spiritual terminology or language assistance.
        </p>
      </div>
    </div>
  );
}
export function Store() {
  const [amount, setAmount] = useState("100");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="wrap">
      <PageIntro title="A cross for your home">
        The monastery’s existing home blessing cross offering.
      </PageIntro>
      <div className="editorial-split">
        <img
          className="store-photo"
          src="/assets/store/medhanialem-cross.jpg"
          alt="Medhanialem home blessing cross"
        />
        <form
          className="offering-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(amount) }),
              });
              const j = await r.json();
              if (!r.ok || !j.url)
                throw new Error(j.error || "Checkout unavailable.");
              window.location.assign(j.url);
            } catch (e) {
              setError(message(e));
              setBusy(false);
            }
          }}
        >
          <h2>Medhanialem home blessing cross</h2>
          <p>
            Minimum offering: $100. Shipping: $20 within the United States.
            Please contact the office to confirm availability or ask about the
            cross.
          </p>
          <label>
            Cross offering (USD)
            <input
              type="number"
              min="100"
              max="100000"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p>Total including shipping: ${(Number(amount) + 20).toFixed(2)}</p>
          <ErrorMessage message={error} />
          <button className="button" disabled={busy}>
            {busy ? "Opening checkout…" : "Continue to checkout"}
          </button>
          <p className="small">
            This existing store checkout is separate from the member donation
            ledger.
          </p>
        </form>
      </div>
    </div>
  );
}
export function StoreSuccess() {
  return (
    <div className="wrap narrow">
      <PageIntro title="Thank you for your support.">
        You have returned from checkout.
      </PageIntro>
      <p>
        Your payment-provider confirmation contains the payment details. Contact
        the monastery office if you need help with your order or delivery.
      </p>
      <LinkButton href="/">Return to the monastery</LinkButton>
    </div>
  );
}
