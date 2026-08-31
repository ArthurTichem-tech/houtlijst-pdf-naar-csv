import { app, BrowserWindow, dialog, net, protocol, shell } from 'electron';
import electronUpdater from 'electron-updater';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { autoUpdater } = electronUpdater;

const APP_ID = 'nl.terharmsel.houtlijstconverter';
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
let mainWindow;

protocol.registerSchemesAsPrivileged([{
  scheme: 'houtlijst',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    codeCache: true,
  },
}]);

function webRoot() {
  return path.join(app.getAppPath(), 'out');
}

function registerLocalAppProtocol() {
  const root = webRoot();
  protocol.handle('houtlijst', (request) => {
    const requestUrl = new URL(request.url);
    let relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';

    const target = path.resolve(root, relativePath);
    const staysInsideApp = target === root || target.startsWith(`${root}${path.sep}`);
    if (!staysInsideApp) return new Response('Niet toegestaan', { status: 403 });

    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(app.getAppPath(), 'out', 'icon-512.png'),
    backgroundColor: '#f5f2ec',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('houtlijst://app/')) event.preventDefault();
  });
  mainWindow.loadURL('houtlijst://app/');
}

function configureUpdates() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (error) => console.error('Updatecontrole mislukt:', error));
  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update gereed',
      message: `Versie ${info.version} is gedownload.`,
      detail: 'Start de toepassing opnieuw om de update te installeren.',
      buttons: ['Nu opnieuw starten', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  });

  const check = () => autoUpdater.checkForUpdates().catch((error) => {
    console.error('Updatecontrole mislukt:', error);
  });
  setTimeout(check, 5000);
  setInterval(check, UPDATE_INTERVAL_MS).unref();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  app.whenReady().then(() => {
    registerLocalAppProtocol();
    createWindow();
    configureUpdates();
  });

  app.on('window-all-closed', () => app.quit());
}
