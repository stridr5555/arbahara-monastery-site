# Arbahara Monastery of Abuna Hara Dengeel

This static site previews the Arbahara Dallas initiative: a frosted-glass hero, donation/membership forms, community storytelling, and meeting recordings.

## Highlights
- Hero with Zelle donation CTA, membership links, and WhatsApp call buttons.
- Four-section grid covering hero design, donation journey, membership tracker, and timeline.
- Membership and reminder cards with Twilio placeholders.
- Meeting recordings system:
  - Public listening page: `/meeting-recordings`
  - Admin upload page with login: `/admin-recordings`
  - Raw uploads land in Google Drive (resumable)
  - Drive sync downloads to `assets/audio/raw/`
  - Processed stitched output + manifest: `assets/audio/processed/`

## Deployment
1. Use the Vercel project connected to `github.com/stridr5555/arbahara-monastery-site`.
2. No build step is required for static pages + serverless API under `/api`.
3. Map your Arbahara custom domain after deployment.

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
- `GOOGLE_TRANSLATE_API_KEY` — existing translation API key.

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
- stitch all clips from the same date together (ignores `#` numbering)
- output one file per date in `assets/audio/processed/`
- write `assets/audio/processed/manifest.json` used by `/meeting-recordings`

## Notes
- Share your Drive folder with the service account email so uploads and sync can access files.
- Keep this repo separate from the `addis-digital-y0` site and the `ethiomarketplace` project.
