import { useEffect, useState } from 'react';
import { bridge } from './bridge';
import type { KomorebiConfig, AppsConfig, KomorebiState, Paths } from './types';
import { ToastMsg, ToastStack, Button } from './ui';
import RuleEditor from './components/RuleEditor';
import GeneralConfig from './components/GeneralConfig';
import AppearanceConfig from './components/AppearanceConfig';
import MonitorsConfig from './components/MonitorsConfig';
import AppsConfigTab from './components/AppsConfig';
import RuntimePanel from './components/RuntimePanel';
import RawJson from './components/RawJson';
import ErrorBoundary from './ErrorBoundary';
import brandIcon from './assets/icon.png';

type Tab = 'rules' | 'general' | 'appearance' | 'monitors' | 'apps' | 'runtime' | 'raw';

const NAV: { id: Tab; label: string; glyph: string; group: string }[] = [
  { id: 'rules', label: 'Rules', glyph: '◈', group: 'Configure' },
  { id: 'general', label: 'General', glyph: '▤', group: 'Configure' },
  { id: 'appearance', label: 'Appearance', glyph: '◐', group: 'Configure' },
  { id: 'monitors', label: 'Monitors', glyph: '▦', group: 'Configure' },
  { id: 'apps', label: 'App-specific', glyph: '⧉', group: 'Configure' },
  { id: 'runtime', label: 'Runtime', glyph: '⏯', group: 'Control' },
  { id: 'raw', label: 'Raw JSON', glyph: '{ }', group: 'Control' }
];

let toastSeq = 0;

export default function App() {
  const [paths, setPaths] = useState<Paths | null>(null);
  const [tab, setTab] = useState<Tab>('rules');
  const [config, setConfig] = useState<KomorebiConfig | null>(null);
  const [apps, setApps] = useState<AppsConfig | null>(null);
  const [state, setState] = useState<KomorebiState | undefined>(undefined);
  const [stateOk, setStateOk] = useState(false);
  const [stateError, setStateError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [consoleText, setConsoleText] = useState('');

  const t = (text: string, kind: 'ok' | 'err' | 'info' = 'ok') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-4), { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), kind === 'err' ? 8000 : 4000);
  };

  const refreshState = async () => {
    const res = await bridge.state();
    if (res.ok && res.state) {
      setState(res.state);
      setStateOk(true);
      setStateError('');
    } else {
      setState(undefined);
      setStateOk(false);
      setStateError(res.output ?? '');
    }
  };

  const load = async () => {
    setBusy(true);
    const res = await bridge.readConfig();
    setPaths(res.paths);
    if (res.config.ok && res.config.value) {
      setConfig(res.config.value);
      setLoadError(null);
    } else {
      setLoadError(`komorebi.json: ${res.config.error ?? 'missing'}`);
    }
    if (res.apps.ok && res.apps.value) setApps(res.apps.value);
    await refreshState();
    setBusy(false);
  };

  const save = async () => {
    if (!config) return;
    setBusy(true);
    const res = await bridge.saveConfig(config);
    setBusy(false);
    if (res.ok) {
      t('Saved to komorebi.json');
    } else {
      t(`Save failed: ${res.error}`, 'err');
    }
  };

  const saveApps = async () => {
    if (!apps) return;
    setBusy(true);
    const res = await bridge.saveAppsConfig(apps);
    setBusy(false);
    t(res.ok ? 'Saved applications.json' : `Save failed: ${res.error}`, res.ok ? 'ok' : 'err');
  };

  const apply = async () => {
    setBusy(true);
    const res = await bridge.applyConfig();
    setBusy(false);
    setConsoleText(`${res.command}\n${res.output}`);
    if (res.ok) {
      t('Configuration applied');
    } else {
      t('Configuration rejected by komorebi — check Raw JSON', 'err');
    }
    await refreshState();
  };

  const run = async (args: string[]) => bridge.run(args);

  const pickConfigFile = async () => {
    const res = await bridge.pickConfig();
    if (res.ok && res.configPath) {
      t(`Using ${res.configPath}`);
      await load();
    }
  };

  const pickKomorebicFile = async () => {
    const res = await bridge.pickKomorebic();
    if (res.ok && res.komorebicPath) {
      t(`komorebic: ${res.komorebicPath}`);
      await load();
    }
  };

  const saveAndApply = async () => {
    await save();
    await apply();
  };

  const floatApp = async (exe: string) => {
    if (!config) return;
    const existing = (config.floating_applications ?? []).filter(
      (r) => r.kind === 'Exe' && r.id.toLowerCase() === exe.toLowerCase()
    );
    setConfig({
      ...config,
      floating_applications: existing.length
        ? config.floating_applications
        : [...(config.floating_applications ?? []), { kind: 'Exe', id: exe, matching_strategy: 'Equals' }]
    });
    t(`${exe} floated ~ remember to Apply`);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ErrorBoundary>
      <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img className="logo" src={brandIcon} alt="" />
          chochin<small>v0.1</small>
        </div>
        {['Configure', 'Control'].map((group) => (
          <div key={group}>
            <div className="nav-label">{group}</div>
            {NAV.filter((n) => n.group === group).map((n) => (
              <button key={n.id} className={tab === n.id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(n.id)}>
                <span className="glyph">{n.glyph}</span>
                {n.label}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          <div>
            <span className="status-dot ok" />
            {stateOk ? 'komorebi connected' : 'komorebi offline'}
          </div>
          {stateError && <div className="faint" style={{ wordBreak: 'break-word' }}>{stateError}</div>}
          <div className="path-block">
            <span className="path-label">komorebi.json</span>
            <div className="path-value mono" title={paths?.configPath}>{paths?.configPath ?? '—'}</div>
          </div>
          <div className="path-block">
            <span className="path-label">komorebic.exe</span>
            <div className="path-value mono" title={paths?.komorebicPath}>{paths?.komorebicPath ?? '—'}</div>
          </div>
          <div className="pick-grid">
            <div className="btn ghost" onClick={pickConfigFile} role="button">
              ☲ Locate komorebi.json…
            </div>
            <div className="btn ghost" onClick={pickKomorebicFile} role="button">
              ⌗ Locate komorebic.exe…
            </div>
            <div className="btn ghost" onClick={load} role="button">
              ↻ Reload files
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{NAV.find((n) => n.id === tab)?.label}</h1>
            <div className="sub">
              {paths?.configPath ? <span className="mono">{paths.configPath}</span> : 'Locate komorebi.json to begin'}
            </div>
          </div>
          <div className="topbar-actions">
            {tab === 'apps' ? (
              <Button onClick={saveApps} disabled={!apps || busy}>
                Save applications.json
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={save} disabled={!config || busy}>
                  Save file
                </Button>
                <Button onClick={saveAndApply} disabled={!config || busy}>
                  Save & apply
                </Button>
              </>
            )}
          </div>
        </div>

        {loadError && <div className="warn" style={{ marginBottom: 16 }}>{loadError} — use Raw JSON to author it, or pick a different file.</div>}

        {tab === 'rules' && config && (
          <RuleEditor config={config} onChange={setConfig} state={state} onFloatApp={floatApp} />
        )}
        {tab === 'general' && config && <GeneralConfig config={config} onChange={setConfig} />}
        {tab === 'appearance' && config && <AppearanceConfig config={config} onChange={setConfig} />}
        {tab === 'monitors' && config && <MonitorsConfig config={config} onChange={setConfig} />}
        {tab === 'apps' && apps && <AppsConfigTab apps={apps} onChange={setApps} />}
        {tab === 'runtime' && <RuntimePanel state={state} run={run} t={t} />}
        {tab === 'raw' && config && <RawJson config={config} onChange={setConfig} save={save} />}

        {consoleText && tab === 'rules' && (
          <div className={consoleText.includes('Unknown') ? 'console err' : 'console ok'} style={{ marginTop: 14 }}>
            {consoleText}
          </div>
        )}
      </main>

      <ToastStack toasts={toasts} dismiss={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
      </div>
    </ErrorBoundary>
  );
}