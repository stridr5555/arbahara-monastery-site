# SMS production release

The owner approved monitored support, mobile opt-in privacy, restricted allow/deny access, code publication and the exact HELP reply using 469-212-6370. Website opt-in choices remain independent, optional and unchecked. No existing consent record was backfilled, changed or revoked.

## Support contact correction

Only the shared SMS disclosure contact in `convex/smsProgram.ts` and the SMS-specific terms contact in `src/pages/Information.tsx` change to 469-212-6370. General visit/footer contacts remain unchanged. Contact revision `2026-10-25-contact-2` records the exact new displayed copy; the restricted eligibility query also accepts the prior exact v1 copy with the old support contact. This preserves existing explicit consent without rewriting evidence.

## Restricted eligibility and readiness

`POST /sms/eligibility` authenticates a dedicated production-only shared key and returns only `{allowed: boolean}` for a phone/category/disclosure version. It reads current SMS consent and STOP suppression, not member profiles/payments, and never creates consent. Membership alone does not grant SMS consent. The broadcaster checks each candidate immediately before requesting SMS; no cached export can substitute for that check.

`internal.smsReadiness.inspect` uses the saved Twilio token inside Convex and returns sanitized account/number/callback readiness only. `inspectEligibility` performs a fixed synthetic-destination read-only self-check. Neither sends messages or writes member/consent records. Production checks confirmed successful Twilio authentication and ownership, a matching POST callback, and a Boolean-only authenticated eligibility response.

## Runtime configuration

The approved HELP text is: Monastery of Abuna Hara Dengeel: For help, email support@haramonastery.org or call 469-212-6370. Reply STOP to cancel. Message and data rates may apply.

Inbound and custom HELP flags are enabled. Invalid signatures are rejected without a reply. Carrier STOP protection remains independent; START/UNSTOP does not create website consent. Advanced Opt-Out events do not receive duplicate application replies. No campaign or test text was sent during this release, and no genuine signed member webhook was manufactured for testing. Provider verification/delivery status must be assessed separately.

## Validation

188 automated website/backend tests, TypeScript, translation coverage, media integrity and the production build passed. Restricted endpoint tests cover authentication, Boolean-only output, category/version isolation, withdrawal/STOP, shared-phone ambiguity, no membership inference and contact-version compatibility. Real SMS/call delivery and payment transactions were not tested. Preserve unrelated raw-audio deletions and the private handoff file.
