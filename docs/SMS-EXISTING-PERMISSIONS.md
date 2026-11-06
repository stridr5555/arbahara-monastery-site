# Existing broadcaster SMS permissions

The owner confirmed on November 6, 2026 that the existing recipients had already
agreed to monastery text messages. This release recognizes that external
confirmation for informational membership, meeting and dues-update texts only.
It does not independently verify how the original permission was collected and
does not infer permission from membership or from voice-call participation.
Fundraising remains a separate category requiring its own matching permission.

## Private evidence, not invented website signup

`smsExistingPermissions` stores exact phone/category permissions with the source
`owner-confirmed-existing-sms-permission`, the snapshot digest and import time.
The import time is not represented as the original opt-in date. No website
disclosure acceptance, account, `smsConsents` or `smsConsentEvents` is manufactured.
Actual recipients stay exclusively in private backend storage, never Git.

The operator-only `smsExistingRecipients:preview` reads the monastery's existing
production broadcaster store through the existing Twilio server binding. It
checks ownership of the prepared SMS sender, validates the recipient count,
rejects pagination/invalid/duplicate numbers and returns a count and digest only.
No credential or recipient list is exported. All provider requests are reads.

`smsExistingRecipients:importConfirmed` requires explicit owner confirmation and
the reviewed digest. It re-reads the list and aborts on any change. It records
only that fixed snapshot; adding a future voice recipient does not grant SMS
permission. Imports are idempotent and never reactivate a withdrawal or STOP.
This is an internal, operator-only migration, not a public website endpoint.

## Suppression and verification

The existing authenticated Boolean-only eligibility endpoint checks global STOP,
carrier suppression, disclosure version and current website withdrawals before
recognizing the external informational permission. Fundraising checks do not use
this external informational source. Inbound STOP permanently marks matching
external permissions withdrawn; START does not restore them.

`smsExistingRecipients:verify` reports only aggregate recorded/eligible counts.
It performs no SMS, calls, Telegram writes, campaign activation or replay. A
successful eligibility check is not proof of Twilio acceptance or carrier delivery.
The owner must separately authorize any real broadcast or retry.
