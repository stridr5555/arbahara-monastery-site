# Hara Monastery Website

This static site now centers the monastery's new reality: land has been purchased in Texas, and the website should lead with the construction campaign needed to build on that property.

## Current direction
- Homepage should foreground: purchased land, prominent property map, and construction fundraising.
- Donation pages should speak plainly about build-stage needs: site prep, permitting, engineering, utilities, and first construction phases.
- Construction pages should read like a real build-vision document, not speculative future moodboarding.
- Gallery should increasingly prioritize purchased-land visuals, site plans, and property media over generic inspiration imagery.
- Meeting recordings system remains available:
  - Public listening page: `/meeting-recordings`
  - Admin upload page with login: `/admin-recordings`
  - Raw uploads land in Google Drive (resumable)
  - Drive sync downloads to `assets/audio/raw/`
  - Processed stitched output + manifest: `assets/audio/processed/`
  - Admin can rename playback titles (saved in `assets/audio/processed/titles.json`)

## Deployment
1. Use the Vercel project connected to `github.com/stridr5555/arbahara-monastery-site`.
2. No build step is required for static pages + serverless API under `/api`.
3. Production domain is `https://www.haramonastery.org`.
4. After major content or env updates, verify the live site instead of assuming deploy success.

## Environment variables (Vercel)
Set these in Vercel project settings:

- `RECORDINGS_ADMIN_PASSWORD` — password used on `/admin-recordings`.
- `RECORDINGS_SESSION_SECRET` — long random secret to sign admin session tokens.
- `GOOGLE_DRIVE_FOLDER_ID` — destination folder for uploaded MP3 files.
- `GOOGLE_OAUTH_CLIENT_ID` — Google OAuth web client id.
- `GOOGLE_OAUTH_CLIENT_SECRET` — Google OAuth web client secret.
- `GOOGLE_OAUTH_REDIRECT_URI` — set to `https://www.haramonastery.org/api/google-oauth-callback`.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — optional fallback path (not required for user OAuth uploads).
- `GITHUB_TOKEN` — GitHub PAT with `repo` scope for this repo.
- `GITHUB_OWNER` — default `stridr5555`.
- `GITHUB_REPO` — default `arbahara-monastery-site`.
- `GITHUB_BRANCH` — default `main`.
- `GOOGLE_TRANSLATE_API_KEY` — production translation API key.

## Meeting recording processing
### Upload raw files
1. Open `/admin-recordings`.
2. Login with `RECORDINGS_ADMIN_PASSWORD`.
3. Upload MP3 files directly to Google Drive folder (`GOOGLE_DRIVE_FOLDER_ID`).
4. Naming convention:
   - `YYYY-MM-DD #1.mp3`
   - `YYYY-MM-DD #2.mp3`
   - `YYYYMMDD #1.mp3` (also supported)

### Sync Drive → process → publish to GitHub
Run locally in the repo root:

```bash
npm run sync:drive
```

To auto-commit and push after processing:

```bash
npm run sync:drive:publish
```

The pipeline will:
- download MP3 files from Drive folder into `assets/audio/raw/`
- trim leading/trailing silence for each clip
- skip near-empty clips (<20s after trim)
- group clips by parsed date
- stitch all clips from the same date together using `#` number as file order (fallback: modified time)
- output one file per date in `assets/audio/processed/`
- write `assets/audio/processed/manifest.json` used by `/meeting-recordings`

## Notes
- Share your Drive folder with the service account email so uploads and sync can access files.
- Keep this repo separate from the `addis-digital-y0` site and the `ethiomarketplace` project.
- Zillow strongly blocks automated scraping from this environment; for property-listing photos, expect to provide manual screenshots/uploads or another approved media source.
