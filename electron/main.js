const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { defaultPaths, resolveKomorebic } = require('./paths');
const { runKomorebic } = require('./komorebic');
const { readJsonFile, writeJsonFile } = require('./store');

const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');

let win = null;
const rendererLogFile = path.join(os.tmpdir(), 'komorebi-studio-renderer.log');
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function waitForSocket(kb, attempts = 50) {
  return new Promise((resolve) => {
    let n = 0;
    const tryOnce = async () => {
      const res = await runKomorebic(kb, ['state']);
      if (res.ok) return resolve({ ok: true, output: `komorebi ready after ${n || 1} poll${n === 1 ? '' : 's'}` });
      n += 1;
      if (n >= attempts) return resolve({ ok: false, output: 'komorebi did not start within timeout' });
      setTimeout(tryOnce, 200);
    };
    tryOnce();
  });
}

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

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current && /^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

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

  const RULE_LIST_KEYS = [
    'ignore_rules',
    'floating_applications',
    'manage_rules',
    'transparency_ignore_rules',
    'tray_and_multi_window_applications',
    'layered_applications',
    'object_name_change_applications',
    'slow_application_identifiers'
  ];

  // komorebi persists composite rules as nested arrays: [ {kind,id,strategy}, {kind,id,strategy} ].
  // The UI works with { kind:"Composite", rules:[...] }. Normalize on read, flatten on write.
  const compositeToObject = (entry) => (Array.isArray(entry) ? { kind: 'Composite', matching_strategy: 'Equals', rules: entry } : entry);
  const compositeToArray = (rule) => {
    if (rule && rule.kind === 'Composite' && Array.isArray(rule.rules)) return rule.rules.map((r) => ({ kind: r.kind, id: r.id ?? '', matching_strategy: r.matching_strategy ?? 'Equals' }));
    return rule;
  };

  ipcMain.handle('komorebi:readConfig', async () => {
    const config = readJsonFile(state.paths.configPath);
    if (config.ok && config.value) {
      for (const k of RULE_LIST_KEYS) {
        if (Array.isArray(config.value[k])) config.value[k] = config.value[k].map(compositeToObject);
      }
    }
    const apps = readJsonFile(state.paths.appsConfigPath);
    return { ok: config.ok && apps.ok, config, apps, paths: state.paths };
  });

  ipcMain.handle('komorebi:saveConfig', async (_e, payload) => {
    try {
      const config = payload.config;
      for (const k of RULE_LIST_KEYS) {
        if (Array.isArray(config[k])) config[k] = config[k].map(compositeToArray);
      }
      const res = await writeJsonFile(state.paths.configPath, config);
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
    const kb = state.paths.komorebicPath;
    const check = await runKomorebic(kb, ['check', '--komorebi-config', state.paths.configPath]);
    if (!check.ok) {
      return { ...check, command: 'komorebic check --komorebi-config "<config>"', invalid: true };
    }

    const stop = await runKomorebic(kb, ['stop']);
    if (!stop.ok) {
      return { ...stop, command: 'komorebic stop' };
    }

    const resolvedKb = resolveKomorebic(kb);
    const defaultConfig = defaultPaths().configPath;
    const onDefaultConfig =
      path.resolve(state.paths.configPath).toLowerCase() === path.resolve(defaultConfig).toLowerCase();

    let startResult;
    let startCommand;
    if (onDefaultConfig) {
      startResult = await runKomorebic(kb, ['start']);
      startCommand = 'komorebic start';
    } else {
      const komorebiExe = resolvedKb.endsWith('komorebic.exe')
        ? resolvedKb.slice(0, -'komorebic.exe'.length) + 'komorebi.exe'
        : 'komorebi.exe';
      const child = spawn(komorebiExe, [state.paths.configPath], { detached: true, stdio: 'ignore' });
      child.unref();
      startCommand = `"${komorebiExe}" "${state.paths.configPath}"`;
      startResult = await waitForSocket(kb);
    }

    if (!startResult.ok) {
      return { ...startResult, command: startCommand };
    }
    return {
      ok: true,
      command: `komorebic stop && ${startCommand}`,
      output: `${stop.output}\n${startResult.output}`.trim()
    };
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

  ipcMain.handle('komorebi:focusedWindow', async () => {
    const fwScript = [
      `Add-Type 'using System;using System.Text;using System.Runtime.InteropServices;public class FW{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll")]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);}'`,
      '$h = [FW]::GetForegroundWindow()',
      '[uint32]$p = 0',
      '[void][FW]::GetWindowThreadProcessId($h, [ref]$p)',
      '$exe = (Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName',
      '$t = New-Object System.Text.StringBuilder 512',
      '[void][FW]::GetWindowText($h, $t, 512)',
      '[PSCustomObject]@{ exe = $exe; title = $t.ToString() } | ConvertTo-Json -Compress'
    ].join('; ');
    return new Promise((resolve) => {
      execFile('powershell.exe', ['-NoProfile', '-Command', fwScript], { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) return resolve({ ok: false, output: String(stderr || '').trim() || error.message });
        try {
          const parsed = JSON.parse(String(stdout || '').trim());
          const title = typeof parsed.title === 'string' ? parsed.title : null;
          return resolve({
            ok: true,
            exe: parsed.exe ? parsed.exe + '.exe' : null,
            title: title && title.trim() ? title.trim() : null
          });
        } catch (e) {
          return resolve({ ok: false, output: String(stdout || '').trim() });
        }
      });
    });
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