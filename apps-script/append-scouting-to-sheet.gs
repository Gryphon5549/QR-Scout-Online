const FIXED_SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const DEFAULT_SHEET_NAME = 'Scouting';

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      status: 'QR Scout backend is running.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(rawBody || '{}');
    const sheetUrl = String(payload.sheetUrl || '').trim();
    const sheetIdFromPayload = String(payload.sheetId || '').trim();
    const tabName = String(payload.sheetTab || DEFAULT_SHEET_NAME || 'Sheet1').trim() || 'Sheet1';
    const row = Array.isArray(payload.row)
      ? payload.row
      : Array.isArray(payload.data)
        ? payload.data
        : Object.values(payload.data || {});

    if (!row.length) {
      throw new Error('Missing row data in request payload.');
    }

    const spreadsheetId = sheetIdFromPayload || extractSheetId(sheetUrl) || FIXED_SPREADSHEET_ID;

    if (!spreadsheetId || spreadsheetId === 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
      throw new Error('Set FIXED_SPREADSHEET_ID in the Apps Script file to your Google Sheet ID.');
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const targetSheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);

    targetSheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        spreadsheetId,
        tabName,
        rowsAppended: row.length,
        status: 'Row appended successfully.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: error && error.message ? error.message : String(error),
        status: 'Failed to append row.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extractSheetId(urlString) {
  if (!urlString) return null;
  const url = new URL(urlString);
  const matches = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);

  if (!matches || !matches[1]) {
    return null;
  }

  return matches[1];
}
