function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheetUrl = String(payload.sheetUrl || '').trim();
    const tabName = String(payload.sheetTab || 'Sheet1').trim() || 'Sheet1';
    const row = Array.isArray(payload.row) ? payload.row : Object.values(payload.data || {});

    if (!sheetUrl) {
      throw new Error('Missing sheetUrl in request payload.');
    }

    const sheetId = extractSheetId(sheetUrl);
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const targetSheet = spreadsheet.getSheetByName(tabName) || spreadsheet.insertSheet(tabName);
    targetSheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sheetId, tabName, rows: row.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extractSheetId(urlString) {
  const url = new URL(urlString);
  const matches = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (!matches || !matches[1]) {
    throw new Error('The sheet URL is not a valid Google Sheets URL.');
  }
  return matches[1];
}
