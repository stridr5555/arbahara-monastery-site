import { PageIntro } from "../components/Layout";
import { Live } from "../components/Live";
import { SmsChoices, ConnectedPreferences } from "../portal/SmsPreferences";

export function Sms() {
  return (
    <div className="wrap narrow" data-no-translate lang="en">
      <PageIntro title="Optional text messages">
        Monastery of Abuna Hara Dengeel
      </PageIntro>
      <p>
        Text messaging is not active. No
        messages are sent by this form.
      </p>
      <p>
        Choose either category, both, or neither. Membership, giving, and other
        services remain available without SMS consent. Donating or providing a
        membership phone number does not sign you up for texts.
      </p>
      <p>
        This disclosure is currently available in English. Contact{" "}
        <a href="/visit">the office</a> for language assistance.
      </p>
      <Live fallback={<SmsChoices />}>
        <ConnectedPreferences />
      </Live>
      <p>
        <a href="/members">Continue to membership and other services</a>
      </p>
    </div>
  );
}
