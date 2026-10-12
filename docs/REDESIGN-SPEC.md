# Approved redesign — execution specification

## Public journey

Reference: `exec-8e683373-b999-4fe9-8520-4818ade148f7.png` in the session's generated_images folder. Native 1536×1024. Ink-black #121513, ivory #f3eee3, gold #ba995d. Editorial serif headings; restrained sans-serif utility text. No wash over the icon. The existing saint-portrait.jpg remains unchanged. Standalone sculptural white Ethiopian textile, gold embroidery and a traveling gold thread form the backdrop, not a screenshot of the UI.

First viewport: wordmark, Faith / Community / Land & vision / Calendar / Members / EN / አማርኛ. Heading: “Faith, carried forward.” Supporting copy: “A living home of prayer, community and hope. Monastery of Abuna Hara Dengeel · Crandall, Texas.” Actions: Begin the journey / Member home. Right chapter rail: Faith, Community, Land, Future. Pause/motion and Skip journey always available. Lower edge previews the land. Text and buttons are native HTML. Responsive layout stacks artwork below the heading; readable content takes priority over exact desktop overlap.

Continuation: community/real films → existing land → explicitly conceptual future plans → participation. Shared tokens and the gold thread connect chapters. No forced audio, mandatory scroll capture or fabricated photographs of construction.

## Functional screens

Calendar reference `exec-9a129056-8d49-460c-a878-5beb419c7602.png`: ivory, two-column calendar + agenda, fine gold borders, dark green selected controls. Ethiopian/Gregorian switch, month controls, real event dates, calendar download. Google primary-calendar synchronization requires separately consented production OAuth; never relabel an export as connected sync.

Member reference `exec-f0dc7eb9-8223-4236-a47f-690ec066e6d1.png`: dark sidebar, ivory workspace, welcome, next gatherings, household dues, founding announcement and recordings. Live records replace illustrative concept balances. $20 per Gregorian month after approval; $240 rolling twelve months. Exempt records stay exempt; unknown historical coverage stays unknown.

Signup reference `exec-5e739866-d9c2-49e0-aa01-3109b9515081.png`: bilingual question/review/welcome states, household details, optional spouse, consent. Giving is optional and follows application submission.

Treasury reference `exec-0d797da4-3d30-45d5-a8d4-f71c2ccd0c19.png`: spreadsheet-friendly tables, reviewable imports, reversible allocations, immutable balanced journals and period controls. No sample financial figures in production views.

## Safety boundaries

Stripe new checkouts accept cards only. Historical ACH records and subscriptions are preserved. Chase production ACH is not activated by the mock developer project. Do not collect raw bank numbers before an enabled secure bank flow exists. Plaid Transactions is bank read access, not debit origination. Google, Plaid and Chase status must reflect actual configuration.

Additive schema changes only. Do not import private spreadsheets automatically or infer unpaid months from blank cells. Never post journal summaries as duplicate receipts. Do not publish personal roster data. Existing unrelated audio deletions and handoff document belong to the user.

## Verification

Unit tests: Ethiopian 27th, nearest Sunday, Pagume, DST; household isolation, approval start month, exemption, annual coverage; balanced posting, reversal, period close, duplicate protection; card-only checkout regression. Browser: desktop and mobile, keyboard, reduced motion, real media, month navigation and export. Compare final screenshots against accepted concepts and record at least five concrete fidelity checks. External production activation must be verified separately.
