/** @type {import('@capacitor/cli').CapacitorConfig} */

// QR Scout Online — mobile shell (Android + iOS).
// Loads the hosted site so every install always has the latest version,
// exactly like the Electron desktop shell in app/main.js.
const config = {
  appId: 'com.homegrowncode.qrscout',
  appName: 'QR Scout',
  webDir: 'mobile/www',
  // The bundled shell redirects to the live site on launch (see
  // mobile/www/index.html), so the app never goes stale.
  server: {
    // Allow navigation to the hosted site + backend from inside the shell.
    allowNavigation: [
      'home-grown-code.github.io',
      'qr-scout-online.onrender.com',
      'cdnjs.cloudflare.com'
    ]
  },
  android: {
    allowMixedContent: false
  },
  ios: {
    // Matches the hosted site's canonical HTTPS URLs.
    allowsLinkPreview: false
  }
};

module.exports = config;
