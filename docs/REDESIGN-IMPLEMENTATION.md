# Redesign implementation — development milestone, 12 October 2026

The initial work was a development milestone, not a claim that every requested
feature and provider activation is complete. The additive schema was
deployed to `cautious-meadowlark-132` after exporting its data and stored files to
an ignored, owner-only local backup. Production was unchanged at that milestone.

## Authorized production-release safeguards

The owner subsequently approved publishing a production-safe release. A fresh
production data/storage snapshot was exported before deploying the additive
schema to `energetic-orca-365`; schema validation passed without index deletions.
Production frontend builds must use `https://energetic-orca-365.convex.cloud`
and its `.site` HTTP origin, never the development deployment. Stage with
production configuration before assigning the live domains.

Production currently has a Stripe test key, even though its test-mode flag is
false. A new server guard blocks that combination before any checkout or donation
record is created. `CARD_PAYMENTS_DISABLED=true` is also set in production.
Card giving requires separately verified live monastery credentials, live webhook
configuration and deliberate removal of that kill switch. Existing Stripe history
and webhook processing are preserved; no live payment was made for release QA.
Chase ACH, Plaid access and automatic Google calendar synchronization remain
inactive; the existing Zelle route remains available. The public calendar and
dated calendar download do not require a Google grant.

The existing office admin bootstrap is preserved alongside the two requested
verified admin emails. No historical roster or financial data is silently imported
or approved. The release payment-guard and usability regressions bring the suite to 51 passing
tests. This rollout does not remove the unfinished work listed below.

## Collection discoverability and photographic flight

The media page no longer has a collection accordion or mutually exclusive
category filters. All four sections are ordinary visible document sections, with
plain-language jump links at the top, full-size photo-link descriptions and
instructions for playing films. Videos retain `preload="none"`; none autoplay.
The archive link now says “Listen to meeting recordings” instead of implying that
it contains all photographs and films.

The former property animation was only a decorative line above a still image.
It is replaced by a forty-second camera flight through actual aerial/residence
photographs arranged as textured planes in Three.js. It starts on entering view,
pauses offscreen, stops at the end, and supports pause/replay, keyboard-accessible
scrubbing, previous/next and four chapters. Hidden-tab time cannot cause a large
playback jump. Missing WebGL/textures and motion-off preferences retain readable
HTML, original photographs and working chapter controls. Heavy WebGL remains
lazy; rendering resources and image textures are disposed on unmount.

This is explicitly a **photo-based 3D animation, not photogrammetry, a surveyed
terrain model or drone recording**. The source aerial is only 480×270 pixels;
we retain its real content rather than invent details through AI upscaling.
The future chapter uses the supplied conceptual campus plan, not completed
facilities. Better aerial source imagery is needed for a sharper flight, and a
literal reconstructed tour needs suitable drone/photogrammetry capture.

Design comparison: the preview-only generated concept is
`exec-81372e92-e06d-4c30-8344-38ac75988e79.png` in the session's generated images.
The implemented dark-olive/ivory/gold palette, centered serif heading, open photo
canvas, playback rail, four underlined chapters and budget band follow that
direction. Intentional factual deviations: original low-resolution aerial replaces
the concept's reimagined aerial; photo positions evolve with the actual camera
path rather than being a fixed right-hand mockup; no invented vegetation glyph.
Native controls, readable disclaimers, 48px targets and two-column phone chapters
take precedence over raster UI details. Core new labels/captions have Amharic
catalog entries; fluent human review remains required.

Browser checks use the in-app browser: 1536×1024 desktop and 390×844 phone;
real camera progress, pause, chapter transitions, End-key scrubbing and motion-off
fallback were exercised. All collection sections render without disclosure and
the property jump link reaches the photo section. No horizontal overflow or
relevant browser warnings/errors were observed. Production-style Vite preview is
used for collection QA because the development server can serve a preserved
legacy `gallery/index.html`; the release prerender replaces that entry correctly.

## Working implementation

- Original sacred portrait, generated textile/gold-thread hero, motion controls,
  real-film media procession, archival collection, and conceptual property view.
  WebGL and spreadsheet libraries are lazy-loaded. No automatic audio.
- Shared Ethiopian/Gregorian calendar: Ethiopian 27th at 7–8 p.m. Texas time;
  nearest Sunday Ziker at 11 a.m.–noon at the verified Garland church. Pagume
  has no 27th. Calendar download is an attachment from `/calendar.ics` on the
  selected Convex HTTP deployment. Office changes retain stable occurrence IDs.
- Separately consented Google primary-calendar OAuth, PKCE/state expiry,
  encrypted refresh grants, duplicate-safe event IDs, changes/cancellations,
  daily rolling synchronization, manual refresh and disconnect/revocation.
- Bilingual household application/review/welcome, optional spouse details,
  approval independent of payment, next-Gregorian-month dues, $20 monthly charges,
  annual/partial collections, explicit exemptions, reviewed account linking,
  unapplied balances and auditable reversals. A daily job extends the next
  twelve months for already approved active non-exempt households.
- Staff CSV/XLSX roster preview, column mapping, excluded-row review, duplicate
  checks, staged/confirmed batches, source provenance and guarded recovery.
  No historical money is inferred or imported by this roster workflow.
- Integer-cent, balanced-by-fund journals; receivables, collections, transfers,
  manual expenses/adjustments, trial balance, balance sheet, CSV exports and
  closed-period protection. Bank/cash/Stripe clearing are distinct accounts.
- Admin-only Plaid Transactions connection, encrypted grants, atomic paginated
  cursor sync, six-hour refresh, CSV review, matching/unmatching, and match
  invalidation when bank activity changes or its journal is reversed. This is
  read access, never ACH origination. Sandbox is visibly labelled.
- New Stripe checkouts explicitly use cards, while legacy ACH history remains.

## External gates before enabling real integrations

Google calendar sync requires a Calendar-enabled OAuth application, the exact
development/production callback registered, consent-screen/testing/verification
requirements satisfied, and separate server variables:
`CALENDAR_GOOGLE_CLIENT_ID`, `CALENDAR_GOOGLE_CLIENT_SECRET`,
`CALENDAR_GOOGLE_REDIRECT_URI`. Callback path is `/calendar/google/callback` on
the intended Convex `.site` domain. Basic sign-in grants do not substitute for
calendar consent. Scope is `calendar.events.owned`; the code writes only its own
namespaced events on `primary`. Disconnect stops future access and attempts
Google revocation; existing written events remain in the member's calendar.

Plaid requires approved Transactions access and `PLAID_CLIENT_ID`, `PLAID_SECRET`,
`PLAID_ENV` (`sandbox` or `production`), plus institution/OAuth redirect eligibility
when applicable. It requests Transactions only. No bank has been connected in this
milestone. Staff must confirm authority and complete secure Link themselves.

Both grant stores require a unique `INTEGRATION_TOKEN_KEY`: 32 random bytes as
64 hexadecimal characters. Keep it in the server environment only. Rotation needs
a deliberate decrypt/re-encrypt migration or reconnection; replacing it blindly
makes existing grants unreadable. Grants use AES-256-GCM and context-bound AAD.

Chase debit activation is not complete. The JPMorgan developer project is mock,
not production approval. The prepared activation form still requires the owner's
title/role and annual-revenue category, then owner review/submission and any bank
agreements. Do not collect raw routing/account numbers or signatures before the
bank-approved secure mandate flow and production origination adapter are enabled.
The membership bank form is clearly labelled a non-enrolling amount preview.

## Remaining implementation and release work

1. Complete production OAuth/Link verification and authorized end-to-end member
   and staff browser checks. Automated tests use isolated test data and mocked
   Google responses; they do not prove a live OAuth grant or bank settlement.
2. Review roster duplicates, spouse/household matches, historical exemptions and
   effective dates with the office; then stage the supplied membership sheets.
   Historical monthly cells record collections, not automatically coverage.
   Opening balances and 2023 journals require accountant-approved migration,
   source-row provenance, reconciling totals and a separate recovery rehearsal.
3. Complete processor-to-general-ledger reconciliation: Stripe gift confirmation
   remains in Giving history, not automatically in the new journal. Post payouts
   as clearing transfers, not new income; separate actual fees and reversals.
4. Complete dedicated vendor/payables/bill-payment, annual budget/actual and
   construction-project accounting workflows. Manual balanced journals are the
   present accounting foundation, not a substitute for those workflows.
5. Complete a measured or professionally validated 3D property model if a literal
   navigable 3D tour is required. The present cutaway is an AI illustration with
   guided camera emphasis and decorative WebGL, not a measured digital twin.
6. Complete Amharic human review, original-media descriptions/captions, keyboard
   and screen-reader audits, low-end-device performance checks, and final visual
   sign-off of authenticated portal/treasury screens.
7. Stage and test future production changes before promoting a frontend. Keep
   preview builds pointed at development; never point unreviewed imports at live
   data. Preserve historical Stripe ACH subscriptions until a reviewed transition
   prevents duplicate collection. No live charge was made during this milestone.

## Asset provenance and reproducibility

The approved design references are in the session's generated-images directory
`01a0e4f9-cccc-7ff3-a1a3-25db617df88a`: hero
`exec-8e683373-b999-4fe9-8520-4818ade148f7.png`, calendar
`exec-9a129056-8d49-460c-a878-5beb419c7602.png`, member
`exec-f0dc7eb9-8223-4236-a47f-690ec066e6d1.png`, signup
`exec-5e739866-d9c2-49e0-aa01-3109b9515081.png`, treasury
`exec-0d797da4-3d30-45d5-a8d4-f71c2ccd0c19.png`, land
`exec-f5974c8c-8aba-4c9d-aea7-88f0b65e3de4.png`, media
`exec-827401d0-056f-4c72-8944-f7faee2d60f8.png`.

Production textile asset: `assets/images/journey-textile.webp`, generated from
the approved hero by requesting standalone sculptural white Ethiopian textile,
gold embroidery and travelling gold thread on ink-black; remove all interface,
text and sacred portrait; preserve the left negative space for native HTML and
the lower-right conceptual sunset/lake reveal. This decorative landscape is not
a photograph or survey of the monastery property. Final generated source
`exec-ddb82aec-5430-4e61-972f-1b0a31a02f2d.png` supersedes the initial textile-only
`exec-cd79a910-b6bf-492d-a4a0-5488d74bc854.png`.

Property asset: `assets/images/land-illustration.webp`, generated from the accepted
land concept and original overhead property photograph; request only the cutaway
land reconstruction, without UI, text, textile, proposed buildings or overlays.
Generated source `exec-f9093a2b-e66b-425b-bb16-639df4d1715f.png`. It is explicitly
illustrative. The original photographs and sacred portrait are retained unchanged.
The standalone PNGs were converted to WebP for delivery. No generated interface
screenshot is used as functioning UI.

## Visual and interaction verification ledger

Browser captures used the Codex in-app browser against the local Vite server,
with native viewport screenshots at 1536 × 1024 and responsive checks at
390 × 844. The accepted hero/calendar/land concepts and the rendered captures
were opened with `view_image` in the same comparison passes. Proof captures are
local QA files in `/tmp/arbahara-*-final.png`, not deployed assets.

| Comparison point      | Result and intentional differences                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero hierarchy        | Large left-aligned serif heading, two native action links, dark negative space and right sacred portrait retained. Original portrait is layered unchanged rather than using its generated approximation. Responsive line sizing keeps the heading off the portrait.                                                                                                    |
| Hero art and controls | White embroidered textile, travelling gold thread and lower-edge conceptual landscape reveal restored. Native chapter links and motion/skip controls replace painted UI. Right rail contrast was strengthened.                                                                                                                                                         |
| Shared calendar       | Ivory surface, green Gregorian/Ethiopian selector, seven-column month grid and adjacent agenda retained. Every day has both dates, not only event dates. Real current month and full verified church address replace sample content; download is explicitly an export, not live sync.                                                                                  |
| Land chapter          | Large cutaway, existing/future control, chapter controls and estimated-needs panel retained. Default is existing property; no fabricated survey coordinates or completed proposed facilities. Native 19-line budget totals $1,158,250. The illustration/limited decorative WebGL are not a literal navigable 3D model.                                                 |
| Media procession      | Editorial heading, angled original-photo ribbon, framed real video and community chapter links retained. Original portrait-oriented film is letterboxed instead of cropping or inventing footage. Native playback progressed to 18 seconds and paused; audio never autoplays. Archive audio remains on its existing archive page rather than a decorative fake player. |
| Responsive behavior   | Hero text and art stack on mobile, navigation opens/closes with a visible 44-pixel control, calendar labels remain readable and full accessible dates are retained. Calendar document width equals client width (375 pixels in the 390-pixel viewport), without horizontal overflow.                                                                                   |

Above-fold hero copy matches the accepted English concept: “Faith, carried
forward.”; “A living home of prayer, community and hope.”; “Monastery of Abuna
Hara Dengeel · Crandall, Texas.”; “Begin the journey”; “Member home”. Motion
control copy reflects actual state (“Pause motion”/“Motion off”), not the
concept's ambiguous label. Calendar heading and subtitle match. Main navigation
is intentionally unified with the hero rather than changing naming between
concept screens. Newly added labels still require the Amharic human review
listed above.

Authenticated member/signup/treasury visual and live integration verification
are still outstanding: no user password, new test credential or live financial
consent was entered in browser QA. This milestone does not claim complete
seven-screen fidelity or a production-ready end-to-end financial system.

Verification: 47 automated tests passed across eight files; TypeScript and the
17-page prerender build passed; all seven full video files passed size/SHA-256
integrity checks; npm reported zero production dependency vulnerabilities.
Large lazy Three.js/ExcelJS chunks and the approximately 506 KB initial JavaScript
chunk remain performance follow-up work, not suppressed warnings.
