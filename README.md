# QR Scout Online

This project is the simplified Team 2549 scouting workflow.

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
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
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

- Frontend URL: https://your-user.github.io/QR-Scout-Online/
- Backend URL: https://your-backend-app.onrender.com/api/sync-sheet

### 5) Use the website
Open the site over HTTP, not as a file path.

Use the backend URL in the sync panel:

- http://localhost:3001/api/sync-sheet

When deployed, use your hosted backend URL instead.

### 6) Test one real sync
Fill out a form, click Commit, and then click Sync to Sheet.

If the backend works, a new row should appear in the target Google Sheet.

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
