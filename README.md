# QR Scout Online

This project is the simplified Team 2549 scouting workflow.

## New architecture

- Frontend: GitHub Pages
- Backend: Google Apps Script Web App
- Data destination: Google Sheet

This is the final flow:

1. The website is served from GitHub Pages.
2. The user fills out a scouting form.
3. The browser sends a POST request to the Apps Script URL.
4. The script extracts the spreadsheet ID from the shared Google Sheet link.
5. The script appends the row to the target tab.

## Setup steps

### 1) Host the website
Push this repo to GitHub and enable GitHub Pages.

### 2) Create the Google Apps Script backend
Open Google Apps Script, create a new project, and paste in the code from `apps-script/append-scouting-to-sheet.gs`.

Use this script and deploy it as a Web App:

- Execute as: Me
- Who has access: Anyone

Copy the deployed URL. It should end with `/exec`.

### 3) Share the Google Sheet
Create a sheet and share it with Anyone with the link.

Copy the share link.

### 4) Use the website
Open the live GitHub Pages site.

In the sync panel, enter:

- Apps Script Web App URL
- Shared Google Sheet link
- Optional tab name like `Scouting` or leave blank for `Sheet1`

Then click Save Sheet sync.

### 5) Test one real sync
Fill out a form, click Commit, and then click Sync to Sheet.

If the script works, a new row should appear in the Google Sheet.

## Important

Do not open the site as a local HTML file. The browser fetch will fail from a file:// page.

Always use:

- http://localhost:8000 while testing locally, or
- the GitHub Pages live URL when the site is published

## Important files

- `index.html` — frontend page and UI
- `assets/js/app.js` — form logic and sync logic
- `apps-script/append-scouting-to-sheet.gs` — backend Google Apps Script
