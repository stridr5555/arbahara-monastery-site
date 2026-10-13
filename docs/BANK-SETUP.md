# Plaid and manual Chase setup

The owner confirmed on October 13, 2026 that Chase ACH Collections is already
active. JPMorgan API approval remains separate. This release does not originate
ACH entries, schedule collections, charge fees or treat an enrollment as payment.

## Member workflow and protection

Sign in → Membership dues → Set up bank payment with the office. The verified
account must be linked to an active, non-exempt household. Enter legal account
holder, bank, matching account numbers, ACH routing number, account type,
personal/business ownership and requested $20 monthly or $240 annual dues.
Review the masked details and sharing notice, then submit. No bank password, PIN,
SSN, fee or debit date is requested. A routing checksum validates format only.

The browser encrypts with a fresh AES-256-GCM key wrapped by RSA-OAEP-SHA256.
A 15-minute challenge binds the envelope to user and household. Only ciphertext
crosses the action argument boundary. The server validates the decrypted record,
discards the repeated account number and stores it encrypted with AES-256-GCM
and context binding. Retries are idempotent; each household has at most one active
request. Bank numbers are not persisted in browser storage, URLs, lists or exports.

## Office workflow

Office tasks → Bank setup → new requests. Finance staff review masked records.
Obtain the bank-approved debit authorization separately, including ownership
verification, amount, frequency, dates and revocation procedure. Record its secure
document reference before moving to Ready for Chase. Sharing consent is not the
debit authorization. Never include bank numbers in notes or references.

Only administrators and treasurers can reveal full details after review. They
cannot review/reveal their own request. Each view is audited and rate-limited.
The UI hides it after 60 seconds, window blur, tab hiding or unmount; this is not
DRM and cannot erase an authorized person's capture or memory. Printing excludes
the reveal region. Use a private device and Chase's own secure interface.
Enter the payor in Chase yourself, then record its nickname/reference. This status
does not confirm a scheduled collection, settlement or payment. Record verified
received payments separately; matching Plaid activity never creates another receipt.

Withdrawal removes full bank details from active records and blocks future reveals.
It does not cancel any existing Chase instruction. Contact the office and cancel
that separately in Chase. Encrypted backups follow existing retention; do not
restore withdrawn bank data into active use without review.

## Convex server configuration

- `BANK_DETAILS_PRIVATE_KEY`: dedicated PKCS8 RSA PEM, at least 3072 bits. Do not
  reuse authentication, backup or Plaid keys.
- `INTEGRATION_TOKEN_KEY`: existing 32-byte AES key as 64 hexadecimal characters.
- `BANK_DETAILS_ENABLED=true`: intake-only switch, not payment activation.

Missing/invalid encryption configuration fails closed. Preserve independent,
protected recovery copies of both keys. Never rotate the AES key without migrating
all existing integration tokens and bank records. RSA rotation invalidates pending
challenges but not stored bank records. Disabling intake does not purge past records.
Never put private keys in Git, client variables, logs or member forms.

## Plaid configuration to add later

Set `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (`sandbox` or `production`) and
`PLAID_REDIRECT_URI=https://www.haramonastery.org/members` in the intended Convex
environment. Register the exact return URL in the matching Plaid Dashboard;
`SITE_URL` must have the same origin. The existing AES key is also required.
Use separate development sandbox keys first. Production linking depends on Plaid
product/bank eligibility. The office shows missing setting names, never values.

Transactions is the only requested product. It reads the monastery bank, not member
accounts. Link OAuth returns to /members and resumes Bank activity. A temporary
Link token uses session storage for at most 30 minutes; access tokens do not.
Update bank access restores the existing connection and cursor. Sync uses
`/transactions/sync`, retries pagination mutation errors and commits complete
batches atomically. Six-hour polling plus manual sync is provided; real-time
webhook updates are not claimed. Provider modifications/removals invalidate matches
without rewriting the original ledger. Connection removal retains accounting history.

Plaid Transactions is not ACH Auth, Plaid Transfer, member account verification or
automatic debiting. Direct JPMorgan API origination remains disabled; new Stripe
checkout sessions remain card-only. No provider activation, bank connection or
real-money payment is part of release QA.

## Release verification

Test permissions, tampering, expiry, retries, withdrawal and crypto with synthetic
records. Check the form in an isolated browser harness; never create production
member or financial records for QA. Verify an existing authorized staff session if
available, otherwise disclose that limit. Run tests, typecheck, translation coverage
and the production build. Deploy additive backend changes before the frontend and
verify the public domain and anonymous denials on the deployed backend.

Official references:
- https://plaid.com/docs/transactions/
- https://plaid.com/docs/link/oauth/
- https://www.chase.com/business/support/banking/collect-and-deposit
