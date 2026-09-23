# Arbahara Monastery

Website and member portal for the **Monastery of Abuna Hara Dengeel**,
Ethiopian Orthodox Tewahedo Church, Crandall, Texas.

Production: https://www.haramonastery.org

## Development

Node 24 is required. Install dependencies with `npm ci`. Set `VITE_CONVEX_URL`
to the appropriate Convex deployment in a local environment file or process
environment. Never put a secret in a `VITE_` variable.

```
npm run dev
npm test
npm run build
npm run preview
```

The build prerenders public content into HTML and preserves the original media
collection. Authentication, new archive records, and member workflows use Convex.
Vercel builds the frontend and the retained serverless recording tools.

## Features

- Responsive public pages for the monastery, development plans, giving, visitors,
  Ethiopian Orthodox Tewahedo learning resources, archive, and gallery.
- A persistent English/Amharic translation switch, plus an Amharic welcome page.
- Convex Auth email-code sign-in, membership applications and approval, member
  profiles, and role-based administration.
- One-time/monthly ACH Checkout integration for the separate monastery Stripe
  account, signed webhooks, private giving history, and recurring-giving management.
- Zelle transfer reporting and independent treasury reconciliation.
- Free event reservations with QR tickets, capacity enforcement, cancellation,
  calendar downloads, and one-time staff check-in.
- Public, active-member, and administrator-only archive records, protected file
  downloads, source/rights notes, revision history, and portable exports.
- CI checks and encrypted weekly backup workflow with a tested restore procedure.

ACH uses the separate verified monastery Stripe account. Each checkout checks its
identity and payment capability; the portal never falls back to the previous
merchant account. No live payment was submitted during release verification.

## Source map

| Path | Purpose |
|---|---|
| `src/content.ts` | Official name, appeal, plans, contact details, learning sources |
| `src/pages/` | Public page content and interactions |
| `src/portal/` | Member and staff screens |
| `src/site.css` | Shared palette, typography, responsive layout, motion |
| `convex/` | Authentication, authorization, database, payments, events, archive |
| `api/` | Vercel email bridge and retained recording/store endpoints |
| `assets/` | Original photographs, plans, recordings, and store media |
| `scripts/build-static.mjs` | Static HTML generation and asset preservation |
| `scripts/*backup.mjs` | Encrypted snapshot handling |
| `tests/` | Permission, accounting, archive, and ticket regression tests |

The root `index.html` is the Vite entry. Other original root HTML pages are retained
as historical source references; the build uses `src/pages/` for their replacements.
`admin-recordings.html` remains active for the existing Drive upload workflow.
Do not edit `dist/` as source.

## Existing meeting recording workflow

The original processing commands remain available:

```
npm run process:recordings
npm run sync:drive
npm run sync:drive:publish
```

Raw inputs stay in `assets/audio/raw/`; public stitched recordings and the manifest
stay in `assets/audio/processed/`. The public archive reads that manifest during
build. The original Drive/GitHub credential configuration remains unchanged.
Never run the publish variant without reviewing its intended media changes.

## Handover and stewardship

Read [operations and recovery](docs/OPERATIONS.md), [content sources](docs/SOURCES.md),
and [release verification](docs/RELEASE-CHECKLIST.md). Keep monastery-owned account
recovery methods and an independent copy of the backup decryption key under the
custody of authorized successors. Backups and active maintenance, rather than a
one-time redesign, preserve access across generations.
