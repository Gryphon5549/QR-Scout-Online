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

const STARTED_AT = new Date().toISOString();

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'backend running', startedAt: STARTED_AT });
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

// The service account has no inbox, so when SMTP is not configured we deliver
// owner notifications through FormSubmit (free, no signup). The FIRST submission
// only sends the owner an activation email — clicking the link once enables
// delivery of every later submission. The address is assembled from parts so
// scrapers can't harvest it from this public repo; override via FEEDBACK_TO_EMAIL.
const DEFAULT_FEEDBACK_EMAIL = ['rileyhh2901', '@', 'gmail.com'].join('');

async function sendFeedbackViaFormSubmit(toEmail, subject, fields) {
  // FormSubmit rejects server-side requests without a Referer header
  // ("open this page through a web server"), so send the site's own URL.
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Referer: 'https://home-grown-code.github.io/QR-Scout-Online/'
    },
    body: JSON.stringify({
      _subject: subject,
      _captcha: 'false',
      _template: 'box',
      _replyto: fields.email && fields.email !== '(not provided)' ? fields.email : undefined,
      name: fields.name,
      teamNumber: fields.teamNumber,
      email: fields.email,
      message: fields.feedback
    })
  });

  let data = {};
  try {
    data = await response.json();
  } catch (parseError) {
    // Non-JSON response — fall through and judge by status code.
  }

  const rejected = data.success === 'false' || data.success === false;
  if (!response.ok || rejected) {
    const message = data.message || `FormSubmit request failed (HTTP ${response.status}).`;
    if (/activ/i.test(message)) {
      // One-time activation: FormSubmit emailed the owner an "Activate Form"
      // link. Count as accepted — delivery starts once the link is clicked.
      console.warn(`FormSubmit: waiting for one-time activation — click the "Activate Form" email sent to ${toEmail}.`);
      return { pendingActivation: true };
    }
    throw new Error(message);
  }
  return data;
}

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

    // Two delivery paths. The sheet path uses the service account that is
    // already configured for scouting sync, so feedback works with no extra
    // setup. The email path is optional and only runs when SMTP is set up.
    let savedToSheet = false;
    let emailed = false;
    const problems = [];

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.FEEDBACK_SHEET_NAME || 'Feedback';
    if (sheetId) {
      try {
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
                    gridProperties: { rowCount: 1000, columnCount: 10 }
                  }
                }
              }]
            }
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [['Timestamp', 'Name', 'Team number', 'Email', 'Feedback']]
            }
          });
        }

        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [[new Date().toISOString(), name, teamNumber, email, feedback]]
          }
        });
        savedToSheet = true;
      } catch (sheetError) {
        console.error('feedback sheet append failed:', sheetError);
        problems.push(`sheet: ${sheetError && sheetError.message ? sheetError.message : String(sheetError)}`);
      }
    }

    const toEmail = process.env.FEEDBACK_TO_EMAIL || DEFAULT_FEEDBACK_EMAIL;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const emailSubject = `QR Scout feedback${teamNumber ? ` — team ${teamNumber}` : ''}${name ? ` from ${name}` : ''}`;
    const emailFields = {
      name: name || '(not provided)',
      teamNumber: teamNumber || '(not provided)',
      email: email || '(not provided)',
      feedback
    };

    try {
      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const text = [
          `Name: ${emailFields.name}`,
          `Team number: ${emailFields.teamNumber}`,
          `Email: ${emailFields.email}`,
          '',
          'Feedback:',
          feedback
        ].join('\n');

        await transporter.sendMail({
          from: `"QR Scout Feedback" <${smtpUser}>`,
          to: toEmail,
          replyTo: email || undefined,
          subject: emailSubject,
          text
        });
      } else {
        await sendFeedbackViaFormSubmit(toEmail, emailSubject, emailFields);
      }
      emailed = true;
    } catch (mailError) {
      console.error('feedback email failed:', mailError);
      problems.push(`email: ${mailError && mailError.message ? mailError.message : String(mailError)}`);
    }

    if (savedToSheet || emailed) {
      const how = emailed ? 'emailed to the site owner' : 'saved to the Feedback tab in your Google Sheet';
      const responseBody = { ok: true, status: `Feedback received (${how}). Thank you!` };
      // Diagnostic only (the form UI ignores extra fields): tells the caller
      // why a delivery path failed, since Render logs aren't always at hand.
      if (problems.length) responseBody.note = problems.join('; ');
      return res.json(responseBody);
    }

    return res.status(500).json({
      ok: false,
      error: problems.length
        ? `Could not deliver feedback — ${problems.join('; ')}`
        : 'Feedback is not configured on the server yet: set GOOGLE_SHEET_ID (saves to a Feedback tab) and/or the SMTP_* variables (sends an email).'
    });
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