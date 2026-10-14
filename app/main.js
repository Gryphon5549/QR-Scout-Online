// QR Scout Online — desktop shell.
// Preloads the app's local HTML instead of fetching from the web,
// so the app works offline and always uses the latest bundled version.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

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
