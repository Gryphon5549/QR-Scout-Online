# QR Scout Online

QR Scout Online is a browser-based scouting app for FIRST Robotics Competition (FRC) teams. Fill out a match scouting form on any phone, tablet, or desktop, then save each entry as a QR-code backup or sync it straight into your own Google Sheet. It also includes a feedback page and installable desktop and mobile app shells.

## Using the hosted site (no setup)

The easiest way to use QR Scout Online is the deployed site. You do not need to run or host anything yourself.

1. Create a new Google Sheet (open `sheets.new`).
2. **Share** that sheet with the app's service account email as an **Editor**. The email is shown on the site's **Start guide** tab. This is the only permission step, and it is what lets the site write rows into your sheet.
3. On the **Home** tab, import a scouting config (upload your own JSON or click **Load sample**).
4. On the **Scout** tab, click **Show sync**, paste your **Google Sheet ID** (the part of the sheet URL between `/d/` and `/edit`), optionally set a tab name, and click **Save sheet**.
5. Fill out the form, click **Commit**, then choose **Sync to Sheet**. Each committed entry is appended as a new row in **your own** spreadsheet. Choose **QR Code** instead to turn the entry into a scannable offline backup.

Entries committed while offline are queued on the device and synced automatically when it reconnects. Feedback sent from the **Feedback** tab goes to the site owner (a `Feedback` tab and, when configured, an email), not to your scouting sheet.

## How it works

- The website (the scouting form) is a static site. The deployed copy runs on GitHub Pages; the desktop and mobile apps just load that same hosted site.
- A small Node.js backend receives scouting entries and feedback. The deployed copy runs on Render.
- **Scouting:** each scout enters the ID of their own Google Sheet and shares it with the backend's service account (as an Editor). The backend appends one row per entry to that sheet, so nobody ever shares a Google password with the app.
- **Feedback:** submissions are saved to a `Feedback` tab in the site owner's sheet and can be emailed when SMTP is configured.
- QR codes and the offline outbox let you keep or transfer entries when you have no connection.

The website and the backend are separate deployments. Hosting the website does not start the backend. The sync and feedback URLs used by the site are set once as constants at the top of `assets/js/app.js`.

## Run the backend locally (self-hosting)

You need Node.js and npm installed.

1. Install the project dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the Google Sheets settings described below.

3. Start the backend:

   ```bash
   npm start
   ```

By default, the API listens at `http://localhost:3001`. Check that it is running at `http://localhost:3001/health`.

### Google Sheets setup

1. In Google Cloud, create or choose a project and enable the Google Sheets API.
2. Create a service account and a JSON key for it.
3. Share the spreadsheet with the service account email and give it Editor access.
4. Put the spreadsheet ID and service account credentials in the root `.env` file:

   ```env
   PORT=3001
   GOOGLE_SHEET_ID=your_google_sheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   SHEET_NAME=Scouting
   ```

Keep `.env` and the service-account key private. Do not commit credentials to the repository. The backend creates the scouting tab if it does not already exist. The tab name defaults to `Scouting` and can be changed with `SHEET_NAME`. See `.env.example` for the optional feedback settings (`FEEDBACK_SHEET_NAME`, `FEEDBACK_TO_EMAIL`, and the `SMTP_*` values).

## Run the website locally

The site is a static website. Serve the repository root with a local web server and open the address it provides. Do not open `index.html` directly as a `file://` URL; browser requests and app features need an HTTP or HTTPS origin.

To point the site at your local backend, edit the two constants near the top of `assets/js/app.js` (they default to the hosted Render URLs):

```js
const BACKEND_URL = "http://localhost:3001/api/sync-sheet";
const FEEDBACK_URL = "http://localhost:3001/api/feedback";
```

## Deploy

1. Publish the repository root (including `index.html` and `assets/`) to a static host such as GitHub Pages.
2. Deploy the Node.js backend separately using a host that supports Node.js.
3. Configure the backend environment variables on that host and make sure its service account can edit the target spreadsheet.
4. Set `BACKEND_URL` and `FEEDBACK_URL` in `assets/js/app.js` to your deployed backend URLs. The current hosted endpoints are `https://qr-scout-online.onrender.com/api/sync-sheet` and `https://qr-scout-online.onrender.com/api/feedback`.

The backend provides `GET /health`, `POST /api/sync-sheet`, and `POST /api/feedback` routes. The feedback route writes to a `Feedback` tab by default and can send email directly when the `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` settings are present. The feedback page also has a browser-based email fallback; the server's sheet and SMTP delivery behavior does not depend on that fallback.

## Desktop and mobile apps

The repository includes installable app shells that load the hosted website:

- **Desktop:** The Electron app is in `app/`. Run it locally with `cd app`, `npm install`, and `npm start`.
- **Android and iOS:** Capacitor project files are in `android/` and `ios/`. The top-level npm scripts include `npm run mobile:android` and `npm run mobile:ios` to sync the web assets into those projects; you still need the platform's development tools to build them.
- **Release builds:** `.github/workflows/build-apps.yml` builds desktop and mobile packages when run manually or when a `v*` tag is pushed. Builds are unsigned, so operating systems may show a security warning and mobile installs may require sideloading.

## Useful files

- `index.html` and `assets/` — website and its frontend code
- `assets/js/app.js` — frontend logic; also holds `BACKEND_URL` and `FEEDBACK_URL`
- `backend/server.js` — API server and Google Sheets integration
- `.env.example` — example backend configuration (no real credentials)
- `app/` — Electron desktop app
- `android/`, `ios/`, `mobile/`, and `capacitor.config.js` — Capacitor mobile app shells
- `.github/workflows/build-apps.yml` — app build workflow