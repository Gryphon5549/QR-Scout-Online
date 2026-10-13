// QR Scout Online — desktop shell.
// Loads the hosted site so every install always has the latest version.
const { app, BrowserWindow, shell } = require('electron');

const SITE_URL = 'https://home-grown-code.github.io/QR-Scout-Online/';

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 420,
    minHeight: 500,
    autoHideMenuBar: true,
    backgroundColor: '#0d1320',
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

  win.loadURL(SITE_URL);
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
