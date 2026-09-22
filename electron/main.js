const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { defaultPaths, resolveKomorebic } = require('./paths');
const { runKomorebic } = require('./komorebic');
const { readJsonFile, writeJsonFile } = require('./store');

const fs = require('fs');
const os = require('os');

let win = null;
const rendererLogFile = path.join(os.tmpdir(), 'komorebi-studio-renderer.log');
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  const res = readJsonFile(settingsFile());
  if (res.ok && res.value && typeof res.value === 'object') return res.value;
  return {};
}

function bootPaths() {
  const defaults = defaultPaths();
  const s = loadSettings();
  const appsConfigFallback = defaults.appsConfigPath;
  let appsConfigPath = appsConfigFallback;
  if (s.configPath && fs.existsSync(s.configPath) && path.dirname(s.configPath) !== path.dirname(defaults.configPath)) {
    const nearby = path.join(path.dirname(s.configPath), 'applications.json');
    appsConfigPath = fs.existsSync(nearby) ? nearby : appsConfigFallback;
  }
  return {
    komorebicPath: s.komorebicPath ? resolveKomorebic(s.komorebicPath) : defaults.komorebicPath,
    configPath: s.configPath && fs.existsSync(s.configPath) ? s.configPath : defaults.configPath,
    appsConfigPath,
    schemaPath: defaults.schemaPath,
    schemaAscPath: defaults.schemaAscPath
  };
}

const state = { paths: bootPaths() };

function persistSettings() {
  return writeJsonFile(settingsFile(), {
    komorebicPath: state.paths.komorebicPath,
    configPath: state.paths.configPath
  }).catch(() => {});
}

function setConfigPath(configPath, persist = true) {
  state.paths.configPath = configPath;
  const dir = path.dirname(configPath);
  const nearby = path.join(dir, 'applications.json');
  if (fs.existsSync(nearby)) state.paths.appsConfigPath = nearby;
  if (persist) persistSettings();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0f1115',
    title: 'chochin',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpc() {
  ipcMain.handle('komorebi:paths', () => ({ ok: true, ...state.paths }));

  ipcMain.handle('komorebi:setKomorebicPath', (_e, komorebicPath) => {
    state.paths.komorebicPath = komorebicPath;
    persistSettings();
    return { ok: true };
  });

  ipcMain.handle('komorebi:readConfig', async () => {
    const config = readJsonFile(state.paths.configPath);
    const apps = readJsonFile(state.paths.appsConfigPath);
    return { ok: config.ok && apps.ok, config, apps, paths: state.paths };
  });

  ipcMain.handle('komorebi:saveConfig', async (_e, payload) => {
    try {
      const res = await writeJsonFile(state.paths.configPath, payload.config);
      return { ok: true, ...res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('komorebi:saveAppsConfig', async (_e, payload) => {
    try {
      const res = await writeJsonFile(state.paths.appsConfigPath, payload.apps);
      return { ok: true, ...res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('komorebi:applyConfig', async () => {
    const res = await runKomorebic(state.paths.komorebicPath, ['replace-configuration', state.paths.configPath]);
    return { ...res, command: `komorebic replace-configuration "${state.paths.configPath}"` };
  });

  ipcMain.handle('komorebi:run', async (_e, { args }) => {
    const res = await runKomorebic(state.paths.komorebicPath, args);
    return { ...res, command: `komorebic ${args.join(' ')}` };
  });

  ipcMain.handle('komorebi:state', async () => {
    const res = await runKomorebic(state.paths.komorebicPath, ['state']);
    if (!res.ok) return { ok: false, output: res.output };
    try {
      return { ok: true, state: JSON.parse(res.output) };
    } catch {
      return { ok: false, output: 'komorebi returned non-JSON state' };
    }
  });

  ipcMain.handle('komorebi:pickKomorebic', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Locate komorebic.exe',
      filters: [{ name: 'Executable', extensions: ['exe'] }],
      properties: ['openFile']
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    state.paths.komorebicPath = res.filePaths[0];
    persistSettings();
    return { ok: true, komorebicPath: res.filePaths[0] };
  });

  ipcMain.handle('komorebi:pickConfig', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Locate komorebi.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    setConfigPath(res.filePaths[0]);
    return { ok: true, configPath: res.filePaths[0] };
  });

  ipcMain.handle('komorebi:log', (_e, text) => {
    try {
      fs.appendFileSync(rendererLogFile, `[${new Date().toISOString()}] ${text}\n`, 'utf8');
    } catch (err) {
      console.error('renderer log write failed:', err.message);
    }
    return { ok: true };
  });
}

registerIpc();