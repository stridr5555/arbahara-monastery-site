import { smsPrograms } from "../../convex/smsProgram";
import { useState } from "react";
import { PageIntro, LinkButton } from "../components/Layout";
import { site } from "../content";
import { ErrorMessage, message } from "../components/Live";
import { Teleconference } from "../components/Teleconference";
export function Privacy() {
  return (
    <div className="wrap narrow">
      <PageIntro title="Your trust matters.">
        Privacy notice · Updated October 25, 2026
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
        <p>
          When you report family dues previously paid by Zelle, check, or cash,
          we keep your answer and any payment amount, date, coverage and
          reference you provide. Authorized finance staff use this self-report
          to check existing records and avoid duplicate collections during the
          move to ACH. A declaration is not proof of payment or debit
          authorization. Your billing-only spouse connection does not give your
          spouse access to your report.
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
        <h2>Spouse connections and family membership</h2>
        <p>
          With both spouses’ confirmation, separate verified sign-ins can share
          one household membership, address, dues coverage and household
          collection history. Family dues are $20 per month total, not per
          spouse. Personal giving, passwords, staff permissions and full bank
          details remain separate. Your own older records from a consolidated
          household remain available only to you and authorized finance staff.
          Email requests appear privately in the spouse’s account; phone
          requests require independent office identity verification. No email or
          text invitation is sent. Ask the office to correct or end an existing
          connection. Connecting a spouse does not authorize a debit or cancel
          any bank instruction.
        </p>
        <h2>Service providers</h2>
        <p>
          The website runs on Vercel. Convex hosts authentication and member
          records. Passwords are stored as protected hashes, not readable text.
          Verification and password-reset codes use the configured email
          provider. If you choose Google or Facebook sign-in, that provider
          shares your account identifier, name, email address, and profile image
          when available. We request identity information for sign-in, not
          access to your posts or contacts. Stripe processes new card payments;
          Zelle transfers take place through your bank. Plaid, when configured
          and connected by an authorized administrator, provides read-only
          monastery bank activity for reconciliation. It does not initiate
          payments through this website.
        </p>
        <h2>Manual bank payment setup</h2>
        <p>
          If you submit the dedicated bank setup form, your routing and account
          numbers are encrypted in your browser before submission and stored
          encrypted by the server. Routine lists and personal exports show only
          the last four account digits. Authorized administrators and treasurers
          can temporarily view full details after a separate debit authorization
          has been reviewed; each view is audited. Secretaries see masked
          requests. We do not request or store your bank login or PIN.
        </p>
        <p>
          This form requests bank-information sharing, not permission to debit
          your account. The office obtains the bank-approved authorization
          separately and enters the payor in Chase. The website does not
          initiate ACH collections. You can withdraw your request to remove full
          bank details from active records. This does not cancel existing Chase
          instructions; contact the office separately. Protected backups may
          retain earlier encrypted records until their retention period ends.
        </p>
        <p>
          Some archived films use the existing Amazon S3 media host. Opening an
          external resource or payment link subjects that visit to the
          provider’s privacy practices.
        </p>
        <section data-no-translate lang="en" id="sms">
          <h2>Optional text message preferences</h2>
          <p>Text messaging is not active. The website has separate optional choices for membership and meeting notices, including dues reminders, and for donation and fundraising reminders. Providing a membership phone number, joining, or donating does not create SMS consent.</p>
          <p>If you opt in when enrollment opens, we record your account identifier, the mobile number you enter, the category you choose, the exact disclosure and its version, the source page and policy links, and the server time. We retain a history of consent changes and withdrawals. Authorized administrators operate the member-record system described above; consent records are stored in Convex.</p>
          <p>We do not sell or share mobile numbers, SMS opt-in data, or SMS consent records with third parties for their marketing. Service providers may process this information as needed to operate the program: Convex stores consent records, and Twilio handles messaging delivery and opt-out processing when messaging is enabled. This service-provider processing does not authorize third-party marketing use.</p>
          <p>When inbound processing is enabled, Twilio supplies callback metadata. The handler keeps account and message identifiers, sender and destination numbers, event classification, and server time to process opt-outs and prevent duplicate handling; it does not retain free-text message bodies. You can withdraw either category independently on the <a href="/sms">text preferences page</a>. Withdrawal does not affect membership or other services. Your portal data download includes your consent history. Contact <a href={`mailto:${site.email}`}>{site.email}</a> for access, correction, deletion, and retention questions. The website does not verify possession of your mobile number by text.</p>
        </section>
        <h2>Storage on your device</h2>
        <p>
          The portal stores authentication tokens on your device to maintain
          your session. Sign out when using a shared device. Do not share
          passwords, verification codes, or ticket QR codes.
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
        Updated October 25, 2026
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
        <section data-no-translate lang="en" id="sms">
          <h2>Optional SMS terms</h2>
          <p>Text messaging is not active. When enrollment opens, each optional choice applies only to its stated category and the mobile number you provide. Neither category is required for membership, donations, purchases, or other services. Donating does not enroll you in text messages.</p>
          {Object.values(smsPrograms).map(program => <section key={program.id} id={`sms-${program.id}`}>
            <h3>{program.title}</h3><p>{program.disclosure}</p>
          </section>)}
          <p>Manage or withdraw each category independently at <a href="/sms">text preferences</a>. The program's cancellation instruction is STOP and its help instruction is HELP; inbound keyword handling must be enabled before messaging starts. For help now, email <a href={`mailto:${site.email}`}>{site.email}</a> or call <a href="tel:+12148031347">214-803-1347</a>. See the <a href="/privacy#sms">Privacy Policy</a> for consent records and your requests.</p>
        </section>
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
        <Teleconference />
        <p>ከመጓዝዎ በፊት የአምልኮ ሰዓትና አድራሻ ለማረጋገጥ ያነጋግሩን።</p>
        <p>
          <a href="tel:+12148031347">214 803 1347</a> /{" "}
          <a href="tel:+14692126370">469 212 6370</a>
          <br />
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p>
          ይህ ገጽ የአማርኛ አቀባበልና አስፈላጊ መመሪያዎችን ይሰጣል። በድረ ገጹ ላይ ከእንግሊዝኛና ከአማርኛ አንዱን
          ቋንቋ መምረጥ ይችላሉ። የመንፈሳዊ ቃላት ማብራሪያ ወይም የቋንቋ እርዳታ ካስፈለገዎት የገዳሙን ቢሮ ያነጋግሩ።
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
