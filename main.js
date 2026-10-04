// KLINIKA – aplikacioni për Windows (Electron).
// Hap panelin web të KLINIKA-s në një dritare të veçantë, me ikonë, menu në shqip dhe përditësim automatik nga GitHub.
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('./package.json');

let win = null;
const configPath = () => path.join(app.getPath('userData'), 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; }
}
function writeConfig(cfg) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}
/** Adresa e serverit: e ruajtur nga përdoruesi → ose e vendosur në package.json ("klinika.serverUrl"). */
function serverUrl() {
  return readConfig().serverUrl || process.env.KLINIKA_URL || (pkg.klinika && pkg.klinika.serverUrl) || '';
}
function normalize(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u.replace(/\/+$/, '');
}

function showSetup(error) {
  win.loadFile(path.join(__dirname, 'setup.html'), { query: { current: serverUrl(), error: error || '' } });
}
function openApp() {
  const url = serverUrl();
  if (!url) return showSetup();
  win.loadURL(url);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1000, minHeight: 640,
    title: 'KLINIKA',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  // Lidhjet e jashtme (WhatsApp, Viber, SMS, email, faqe të tjera) hapen në aplikacionet e Windows-it.
  const isInternal = (url) => {
    const base = serverUrl();
    return url.startsWith('file://') || (base && url.startsWith(base));
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternal(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!isInternal(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // Nëse serveri nuk përgjigjet, shfaq faqen e konfigurimit me mesazh.
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = navigim i anuluar
    showSetup(`Nuk u lidh me serverin (${desc}). Kontrolloni adresën ose internetin.`);
  });

  openApp();
}

function buildMenu() {
  const template = [
    {
      label: 'KLINIKA',
      submenu: [
        { label: 'Faqja kryesore', accelerator: 'Alt+Home', click: () => openApp() },
        { label: 'Rifresko', accelerator: 'F5', click: () => win && win.webContents.reload() },
        { type: 'separator' },
        { label: 'Ndrysho adresën e serverit…', click: () => showSetup() },
        { type: 'separator' },
        { label: 'Printo…', accelerator: 'Ctrl+P', click: () => win && win.webContents.print() },
        { type: 'separator' },
        { label: 'Dil', accelerator: 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Pamja',
      submenu: [
        { label: 'Zmadho', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: 'Zvogëlo', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: 'Madhësia normale', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Ekran i plotë', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'Mjetet e zhvilluesit', accelerator: 'Ctrl+Shift+I', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Ndihmë',
      submenu: [
        { label: 'Kontrollo për përditësime', click: () => checkUpdates(true) },
        {
          label: 'Rreth KLINIKA',
          click: () => dialog.showMessageBox(win, {
            type: 'info', title: 'KLINIKA', message: `KLINIKA ${app.getVersion()}`,
            detail: `Menaxhimi i klinikës.\nServeri: ${serverUrl() || '—'}`,
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- Përditësimi automatik nga GitHub Releases ----------
function checkUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox(win, { message: 'Përditësimet funksionojnë vetëm në versionin e instaluar.' });
    return;
  }
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.removeAllListeners();
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(win, {
      type: 'info', buttons: ['Rinis tani', 'Më vonë'], defaultId: 0,
      title: 'Përditësim i ri', message: `Versioni ${info.version} u shkarkua.`,
      detail: 'Aplikacioni do të rinisë për ta instaluar.',
    }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
  });
  if (manual) {
    autoUpdater.once('update-not-available', () => dialog.showMessageBox(win, { message: 'Keni versionin më të ri.' }));
    autoUpdater.once('error', (e) => dialog.showMessageBox(win, { type: 'warning', message: 'Kontrolli i përditësimeve dështoi.', detail: String(e && e.message || e) }));
  }
  autoUpdater.checkForUpdates().catch(() => {});
}

// ---------- Komunikimi me faqen e konfigurimit ----------
ipcMain.handle('klinika:getServer', () => serverUrl());
ipcMain.handle('klinika:saveServer', (_e, url) => {
  const u = normalize(url);
  if (!u) return { ok: false, error: 'Shkruani adresën e serverit.' };
  writeConfig({ ...readConfig(), serverUrl: u });
  openApp();
  return { ok: true };
});

// Vetëm një dritare e hapur njëherësh
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    app.setAppUserModelId('al.klinika.desktop');
    buildMenu();
    createWindow();
    setTimeout(() => checkUpdates(false), 5000);
  });
  app.on('window-all-closed', () => app.quit());
}
