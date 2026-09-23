# Release verification

The build covers the public monastery site, Convex member portal, administration,
ACH integration, manual Zelle reconciliation, free event QR reservations, and archive
preservation. Account activation and any real-money test remain separate from code QA.

## Verified during the build

- Fifteen backend tests: anonymous/other-member isolation; verified identity;
  admin export and role boundaries; membership review; Zelle deduplication, amount
  and date validation, independent reconciliation; ticket capacity, cancellation,
  event-scoped one-time check-in; archive visibility and version history; protected
  downloads; ACH delayed confirmation, duplicate webhooks, recurring invoices, and
  reversal handling.
- Real email-code sign-in in the browser using the development backend, followed
  by a labeled development membership application and administrator approval.
- Browser event publication, member reservation, and QR-ticket rendering; deployed
  server check-in accepted once and identified a second scan as already admitted.
- Actual Stripe sandbox Checkout creation, ACH-only method selection, owner metadata,
  and amount validation. A signed synthetic sandbox success event updated the deployed
  ledger once; replay caused no duplicate, and an invalid signature returned 400.
  No funds moved. This is not evidence of a real bank settlement.
- Encrypted Convex snapshot round trip matched the original SHA-256. Import into
  temporary deployment `stoic-axolotl-438` restored members, donations, tickets,
  events, and audit records. The temporary deployment expires automatically.
- Public homepage, mobile navigation, archive search, login, membership form,
  administrator controls, event form, and ticket screen were checked in the in-app
  browser. Desktop reference viewport: 1536 × 1024. Phone viewport: 390 × 844.
- Production dependency audit reported zero known vulnerabilities after updating
  the authentication dependency and Nodemailer to patched versions.

## Design comparison

References: generated home, giving, portal, and archive concepts in the task's
generated-images directory. Implemented the ivory/terracotta/ink palette, literary
serif hierarchy, quiet navigation, fine rules, square controls, editorial archive
rows, and portal panels. The user's later request superseded the initial home
concept: the final home restores the old sacred-image hero and original gallery,
with hero fades, scroll storytelling, microinteractions, and 3D depth effects.

Intentional differences from generated concepts: the confirmed official monastery
name replaces the draft name; the home hero restores the original sacred artwork;
the headline accent and action text use darker terracotta for contrast; generated
decorative landscape/cross imagery is omitted from the donation page; the portal
contains only actual records; unrequested generated slogans are omitted. The user’s
pastoral appeal takes precedence over generated concept copy.

Comparison points checked: first-viewport hierarchy, navigation and CTA labels,
palette and contrast, type sizes and wrapping, real image crop, section spacing,
form-control consistency, responsive menu, and reduced-motion styling. Public
hero copy now leads with the official monastery name, faith, and worship-focused
invitation requested by the user. No promotional metric was invented.

Live Stripe checks passed for the separate monastery account: charges enabled,
payouts enabled, ACH active, no current requirements. One-time and monthly live
Checkout sessions were created with the restricted key, then expired without
submitting payment. The live webhook and subscription-management configuration
are enabled. This verifies setup, not real-money settlement.

## Release gates

The English/Amharic selector was restored at the user's request and verified for
forward/reverse switching. A static catalog uses the existing Google Translate
service; no private member records are sent to it. Original gallery images and the
four-image sacred hero are restored. The seven old film URLs failed with 403; local
masters were found and web copies were generated with matching duration, original
audio, and recorded checksums. They now use same-site paths.

Run tests/build after final changes; deploy Convex production; commit and push only
task changes; verify the resulting Vercel production deployment and live routes.
Run the encrypted-backup workflow and check its receipt. Confirm the monastery
Stripe account and payment-method capability before enabling live ACH. Keep any
unresolved owner-verification requirement visible in the handover.
