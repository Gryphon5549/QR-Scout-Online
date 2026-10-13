# QR Scout Online — 2549 Millerbots Scouting, QR Sheets & Google Sheets

**2549 Millerbots scouting** workflow — a free **QR scout** / **FRC scouting** app that collects match scouting data on any device, backs it up as **QR sheets**, and syncs scouting data straight into **your own Google Sheets**.

This project is the simplified Team 2549 (Millerbots) scouting workflow — also searchable as *2549 scouting*, *Millerbots 2549*, *QR scout online*, *FRC match scouting*, and *scouting to Google Sheets*.

## New architecture

- Frontend: GitHub Pages or localhost
- Backend: lightweight Node/Express API
- Data destination: Google Sheets via Google Sheets API with a service account

This is the final flow:

1. The website is served from GitHub Pages or localhost.
2. The user fills out a scouting form.
3. The browser sends a POST request to the backend API URL.
4. The backend authenticates to Google Sheets with a service account.
5. The backend appends the row to the target sheet/tab.

This avoids Google Apps Script and removes the browser-side fetch issues caused by static-site restrictions.

## Setup steps

### 1) Host the website
Push this repo to GitHub and enable GitHub Pages, or run the page locally with a local server.

### 2) Create the Google Cloud service account
1. Open Google Cloud Console.
2. Create a new project or use an existing project.
3. Enable the Google Sheets API.
4. Create a service account.
5. Create a private key JSON file.
6. Share the target Google Sheet with the service account email address as an Editor.

### 3) Configure the backend
Copy `.env.example` to `.env` and fill in the values:

```env
PORT=3001
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=frc-scout@frc-scout-511222.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_NAME=Scouting
```

Then install dependencies:

```bash
npm install
```

Then start the server:

```bash
npm start
```

### 4) Deploy the frontend and backend
Use the repo as follows:

- GitHub Pages hosts the frontend from the repo root (`index.html` and the `assets/` folder).
- A hosted backend such as Render, Railway, or a small VPS runs the Node API.
- The frontend saves the backend API URL in the browser and sends full JSON payloads there.

For example:

- Frontend URL: https://home-grown-code.github.io/QR-Scout-Online/
- Backend URL: https://qr-scout-online.onrender.com/api/sync-sheet

### 5) Use the website
Open the site over HTTP, not as a file path.

Use the backend URL in the sync panel:

- http://localhost:3001/api/sync-sheet

When deployed, use your hosted backend URL instead.

### 6) Test one real sync
Fill out a form, click Commit, and then click Sync to Sheet.

If the backend works, a new row should appear in the target Google Sheet.

### 7) How feedback is delivered
Every feedback submission is delivered two ways:

1. **Google Sheet** — the backend appends it to a **Feedback** tab in the Google Sheet behind `GOOGLE_SHEET_ID` (created automatically with headers), using the same service account as scouting sync.
2. **Email to the site owner** — the browser sends it through [FormSubmit](https://formsubmit.co) (free, no signup). This happens client-side because FormSubmit and similar free relays block server-side calls from cloud hosts — but browser posts are their supported, intended usage. **The first-ever submission triggers an activation email** to the owner — click the confirmation link in it once and every later submission is delivered straight to their inbox.

Optional overrides in `backend/.env` (and on your host, e.g. Render) — if SMTP is configured, the backend ALSO emails directly:

```env
# FormSubmit recipient (defaults to the project owner):
FEEDBACK_TO_EMAIL=your_email_here
# Optional direct SMTP from the backend:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_smtp_username_here
SMTP_PASS=your_smtp_password_here
# Sheet tab name used for delivery (default Feedback):
FEEDBACK_SHEET_NAME=Feedback
```

For Gmail SMTP, create an **App Password** (Google Account → Security → 2-Step Verification → App passwords) and use it as `SMTP_PASS` — the normal login password will not work.

### 8) The App tab & desktop builds
The **App** tab (`#/app`) offers downloadable desktop versions of QR Scout Online plus installable web-app (PWA) support for Chrome/Edge.

- **Desktop apps** live in `app/` — a tiny [Electron](https://electronjs.org) shell that loads the hosted site, so every install always runs the latest version.
- **CI builds them** (`.github/workflows/build-apps.yml`) for Windows x64/ARM, macOS Intel/Apple Silicon, and Linux x64/ARM (AppImage + deb). Push a tag like `v1.0.0` (or run the workflow manually) — installers are attached to the GitHub Release with **stable file names** (`QRScout-win-x64.exe`, `QRScout-mac-arm64.dmg`, …) so the App tab's `releases/latest/download/...` links always point at the newest build.
- **Chrome install**: the site ships a `manifest.webmanifest`, so Chrome shows “Install QR Scout” (menu ⋮ → Install, or the button on the App tab).
- Local dev: `cd app && npm install && npm start`.

The installers are not code-signed (no certificates in this repo): on macOS right-click → **Open** the first time; on Windows choose **More info → Run anyway** if SmartScreen warns.

## Important

Do not open the site as a local HTML file. The browser fetch will fail from a file:// page.

Always use:

- http://localhost:8000 for the site frontend, and
- http://localhost:3001 for the backend API while testing locally

## Important files

- `index.html` — frontend page and UI
- `assets/js/app.js` — form logic and sync logic
- `server.js` — Express API backend
- `.env.example` — backend environment variables
