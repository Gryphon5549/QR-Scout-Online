// QR Scout Online — desktop shell.
// Preloads a fully offline, self-contained scouting page bundled next to this
// file (see index.html). It uses only QR codes — no network access — so the app
// works with no Wi-Fi at competitions.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Shared logo — the same artwork the website uses (assets/images).
const APP_ICON = path.join(__dirname, 'assets', 'images', 'millerbot-orange.png');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 420,
    minHeight: 500,
    autoHideMenuBar: true,
    backgroundColor: '#0d1320',
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setMenuBarVisibility(false);

  // Links that target a new window (e.g. external pages) open in the
  // user's default browser instead of a second app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load the preloaded app HTML (local file, works offline)
  const appHtmlPath = path.join(__dirname, 'index.html');
  win.loadFile(appHtmlPath);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    // macOS: re-open a window when the dock icon is clicked.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
