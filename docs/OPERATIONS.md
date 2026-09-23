# Monastery website operations

Official name: Monastery of Abuna Hara Dengeel. Public brand: Arbahara.
Production: https://www.haramonastery.org
Repository: https://github.com/stridr5555/arbahara-monastery-site

## Ownership and access

Use organization-controlled accounts with more than one responsible custodian.
Keep recovery methods and the handover record in the monastery's secure records.
The initial production administrator is the existing office address
`support@haramonastery.org`. Administrators must verify their email through the
normal sign-in flow. The server reads bootstrap administrator addresses from
`ADMIN_EMAILS` in Convex; no email address in client code grants access.

Administrators review members, publish events and archive records, assign staff
roles, and export records. Treasurers reconcile Zelle reports. Check-in volunteers
validate tickets. Members can read only their own profiles, gifts, and tickets.
Active members can download member-only archive files. Administration mutations
create an audit record. Remove staff roles when responsibilities change, and also
remove any bootstrap address from `ADMIN_EMAILS` if its owner no longer serves.

## Services

| Service | Resource |
|---|---|
| Vercel production project | arbahara-monastery-site |
| Convex project | arbahara-monastery, project 3053427 |
| Convex production | energetic-orca-365 |
| Convex development | cautious-meadowlark-132 |
| Stripe owner email | btekle6370@gmail.com |
| Separate Stripe live account | acct_1UIhM409auEOsI8O |
| Separate Stripe sandbox | acct_1UIhMHP8Y3azJapB |

The previous Stripe account belongs to Take Flight Merch LLC. It must not be used
for this member giving portal. The separate live account completed activation:
charges, payouts, and ACH were verified as enabled during this build. Its restricted
integration key is stored only in server secrets. No account numbers or bank
credentials are stored here, and no real-money payment was submitted during QA.

## Payments

Convex production requires `STRIPE_SECRET_KEY` for the separate live monastery
account, `APPROVED_STRIPE_ACCOUNT_ID`, and `STRIPE_WEBHOOK_SECRET`. Confirm that the
account ID is correct, charges are enabled, and `us_bank_account_ach_payments` is
active. Never enable `PAYMENTS_TEST_MODE` in production. Development uses only the
monastery sandbox and may set that variable to `true`.

Stripe webhook destination: `https://energetic-orca-365.convex.site/stripe-webhook`.
Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded,
checkout.session.async_payment_failed, checkout.session.expired, invoice.paid,
invoice.payment_failed, customer.subscription.created/updated/deleted,
charge.refunded, and charge.dispute.created/closed. Create a billing-portal
configuration supporting payment-method updates, invoice history, and cancellation
at the end of the current period. The member portal uses Stripe Checkout and does
not collect bank details itself. Confirm production behavior with an authorized
controlled payment when the account owner is ready; do not infer settlement from
the return URL.

The existing Zelle short link was resolved to Zelle's official enrollment URL,
identifying MONASTERY OF ABUNA HARA DENGEEL and arbahara27@gmail.com. The site now
uses that direct official URL to avoid dependence on the URL shortener. Members report the transfer
reference after sending through their bank. Reports remain `reported` until a
treasurer matches them to a bank record. A person cannot confirm their own gift.
Never treat a screenshot or the report alone as proof that funds arrived.

The legacy cross store now requires `MONASTERY_STRIPE_SECRET_KEY` and
`APPROVED_MONASTERY_STRIPE_ACCOUNT_ID` in Vercel. It will not fall back to the old
merchant account. Its orders remain separate from the member donation ledger.

## Authentication email

Convex Auth sends an eight-digit code with a 15-minute lifetime. Requests are
rate-limited by address. Vercel's `/api/member-mail` accepts only the shared secret
`MAIL_BRIDGE_SECRET`, which also lives in Convex. SMTP uses `SMTP_USER` and
`SMTP_PASSWORD`. At launch the verified existing Gmail sender is configured with
the Arbahara display name and support@haramonastery.org as Reply-To. Move to an
organization-controlled transactional mail service as the monastery's mail setup
matures. Do not put SMTP or authentication secrets in a VITE_ variable.

Convex requires `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL`. Rotate signing keys only
with a session recovery plan. Development preview email delivery may also use
`MAIL_BRIDGE_BYPASS` for Vercel's protected preview. Production does not need it.

## Updating content

Public text and source references: `src/content.ts` and `src/pages/`.
Visual system: `src/site.css`. Header/footer: `src/components/Layout.tsx`.
Forms and staff tools: `src/portal/`. Backend authority: `convex/`.

The public pages are rendered to HTML at build time. Search engines and visitors
without JavaScript can read the main content and founding archive. The secure
portal and newly published Convex records require JavaScript. Do not replace the
source pages by editing `dist/`.

Admin > Archive supports drafts, visibility, source/rights notes, file uploads,
and revision preservation. Member-only uploaded files require an authenticated
download. External URLs keep the source site's access rules, so do not use a public
external link for a confidential document. Preserve original documents and obtain
permission for photographs, recordings, and identifiable children.

Admin > Events supports publishing, editing, cancellation, and capacity limits.
Use confirmed dates, real locations, and access details. Members see Central time.
Tickets are free reservations, one per account per event. They are not paid ticket
sales. Contact the office for household admission arrangements. Check-in requires
an admin or check-in role, verifies the selected event, and consumes a ticket once.

Only Ethiopian Orthodox Tewahedo sources belong in the faith library. Have clergy
review new doctrinal writing and translations. The English/Amharic selector persists
across pages and covers the public site and static portal interface. The existing
Google Translate service builds a cached catalog from public source-code strings;
private member records are never sent for translation. Names, amounts, references,
and newly entered records stay as entered. Regenerate the catalog after copy edits
with `npm run translations`, supplying the existing Google Translate key securely.
The common Trinitarian invocation and church-name translations have explicit
overrides. Other translations remain machine-assisted and need clergy/language review.

## Build and deployment

Use Node 24 and `npm ci`. Run `npm test`, `npm run build`, and a browser check of
the affected flow. `VITE_CONVEX_URL` selects the correct backend at build time.
Deploy backend changes with a deployment-specific Convex key before releasing a
frontend that calls new functions. Keep generated Convex bindings committed.

Commit only task source files. Main pushes deploy through the existing Vercel
Git integration. Check the deployment receipt, the live domain, member sign-in,
and the changed flow. A successful build alone does not prove production health.
Use a Vercel rollback for a broken frontend; do not overwrite production data to
undo a visual change. Review schema migrations before applying them.

Legacy links `/future-construction` and `/meeting-recordings` redirect to the new
pages. Existing Drive upload tools remain at `/admin-recordings`; original audio
processing scripts remain available through the existing npm commands.

## Backup and restore

The GitHub workflow `Encrypted monastery records backup` runs weekly and on manual
dispatch. Its Convex key permits only backup creation/download and data viewing,
not code deployment, data changes, or environment-secret access. It exports data
and uploaded files, encrypts the snapshot with AES-256-GCM and RSA-OAEP-SHA256, then
uploads only the encrypted `.arb` file as a GitHub artifact. Plaintext remains on
the temporary runner and is removed at the end. Artifacts expire after 14 days.

The public encryption key is in `docs/backup-public-key.pem`. The corresponding
private key is the encrypted Vercel production environment variable
`ARBAHARA_BACKUP_PRIVATE_KEY`. Authorized custodians must also keep an independent
secure recovery copy: loss of that key makes encrypted snapshots unrecoverable.
Do not rotate it without retaining keys for older snapshots.

The job refuses snapshots larger than 100 MB to bound artifact storage. Monitor
workflow failures and arrange approved archival storage before raising the limit.
Weekly snapshots and two-week retention are operational recovery, not a permanent
historical archive. Preserve selected monthly/year-end encrypted snapshots in the
monastery's approved long-term storage and test a restore at least quarterly.
The original photographs, public plans, and processed audio also live in Git;
maintain a separate repository mirror under monastery custody.

The seven original gallery films were recovered from their local originals after
the former S3 links returned 403 and the stored AWS key proved invalid. Web copies
now live in `assets/videos/`, with full duration/audio and SHA-256 provenance in
`assets/videos/manifest.json`. Preserve the owner's original `.mp4.mov` masters
in long-term archival storage too. These public web copies are versioned in Git,
not the private Convex snapshot. They are H.264/AAC with fast-start metadata.
Use Git-connected Vercel deployment for this media-bearing repository; its size
exceeds the Hobby CLI source-upload limit. No plan or spending limit was increased.

To restore, download an encrypted artifact and securely set the private-key
environment variable in a trusted terminal. Run:

```
node scripts/decrypt-backup.mjs arbahara.arb restored.zip
```

Import into an isolated Convex deployment first, using its key:

```
npx convex import --replace-all restored.zip
```

Compare table counts, sample member/donation records, file downloads, and login.
Do not run a destructive import against production without an approved recovery
decision and a fresh backup of its current state. Remove the local plaintext zip
after validation. Keep a dated recovery record with the encrypted snapshot ID,
schema revision, key version, restore target, and results.

## Regular stewardship

Review pending members and Zelle reports; check webhook failures and failed ACH;
review event changes and archive permissions. Check the backup workflow each week.
Quarterly, review staff access, software updates, broken source links, accessibility,
mail delivery, Stripe ownership, and the restore drill. Update visiting information
and construction progress only from confirmed monastery records.
