const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

let sheetsClientPromise = null;

async function getSheetsClient() {
  // Build the auth client once and reuse it. GoogleAuth auto-refreshes its
  // access token, so one client is safe across requests and avoids re-parsing
  // the key + resolving a token on every sync. Config/auth errors throw before
  // assignment below, so failures are never cached and the next request retries.
  if (sheetsClientPromise) return sheetsClientPromise;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountEmail || !privateKey || !sheetId) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, or GOOGLE_SHEET_ID in environment variables.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: privateKey.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  sheetsClientPromise = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClientPromise;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'backend running' });
});

app.post('/api/sync-sheet', async (req, res) => {
  try {
    const payload = req.body || {};
    const row = Array.isArray(payload.row)
      ? payload.row
      : Object.values(payload.data || {});

    if (!row.length) {
      return res.status(400).json({ ok: false, error: 'Missing row data.' });
    }

    const sheetId = payload.sheetId || process.env.GOOGLE_SHEET_ID;
    const sheetName = payload.sheetName || process.env.SHEET_NAME || 'Scouting';

    if (!sheetId) {
      return res.status(400).json({ ok: false, error: 'Missing sheetId.' });
    }

    const sheets = await getSheetsClient();
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const exists = (metadata.data.sheets || []).some((sheet) => sheet.properties && sheet.properties.title === sheetName);

    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                sheetType: 'GRID',
                gridProperties: { rowCount: 1000, columnCount: 50 }
              }
            }
          }]
        }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });

    return res.json({
      ok: true,
      status: 'Row appended successfully.',
      sheetId,
      sheetName,
      rowsAppended: row.length
    });
  } catch (error) {
    console.error('sync-sheet failed:', error);
    return res.status(500).json({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 100) : '';
    const teamNumber = typeof payload.teamNumber === 'string' ? payload.teamNumber.trim().slice(0, 20) : '';
    const email = typeof payload.email === 'string' ? payload.email.trim().slice(0, 200) : '';
    const feedback = typeof payload.feedback === 'string' ? payload.feedback.trim() : '';

    // Honeypot: humans never see this field. If it's filled, it's a bot —
    // pretend success so the bot doesn't learn, but send nothing.
    if (typeof payload.website === 'string' && payload.website.trim() !== '') {
      return res.json({ ok: true, status: 'Feedback received. Thank you!' });
    }

    if (!feedback) {
      return res.status(400).json({ ok: false, error: 'Feedback text is required.' });
    }
    if (feedback.length > 5000) {
      return res.status(400).json({ ok: false, error: 'Feedback is too long (max 5000 characters).' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Email address looks invalid.' });
    }

    const toEmail = process.env.FEEDBACK_TO_EMAIL;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!toEmail || !smtpHost || !smtpUser || !smtpPass) {
      return res.status(503).json({
        ok: false,
        error: 'Feedback email is not configured on the server yet (set FEEDBACK_TO_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).'
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const subject = `QR Scout feedback${teamNumber ? ` — team ${teamNumber}` : ''}${name ? ` from ${name}` : ''}`;
    const text = [
      `Name: ${name || '(not provided)'}`,
      `Team number: ${teamNumber || '(not provided)'}`,
      `Email: ${email || '(not provided)'}`,
      '',
      'Feedback:',
      feedback
    ].join('\n');

    await transporter.sendMail({
      from: `"QR Scout Feedback" <${smtpUser}>`,
      to: toEmail,
      replyTo: email || undefined,
      subject,
      text
    });

    return res.json({ ok: true, status: 'Feedback received. Thank you!' });
  } catch (error) {
    console.error('feedback failed:', error);
    return res.status(500).json({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`QR Scout backend listening on http://localhost:${PORT}`);
});