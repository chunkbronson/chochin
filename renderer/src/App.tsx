import { useEffect, useState } from 'react';
import { bridge } from './bridge';
import type { Base16Palette, BorderColours, KomorebiTheme, KomorebiConfig, AppsConfig, KomorebiState, Paths, MatchingRule, MasirStatus } from './types';
import { RULE_FIELDS } from './types';
import { ToastMsg, ToastStack, Button, Toggle } from './ui';
import RuleEditor from './components/RuleEditor';
import GeneralConfig from './components/GeneralConfig';
import AppearanceConfig from './components/AppearanceConfig';
import MonitorsConfig from './components/MonitorsConfig';
import AppsConfigTab from './components/AppsConfig';
import RuntimePanel from './components/RuntimePanel';
import RawJson from './components/RawJson';
import Settings from './components/Settings';
import ErrorBoundary from './ErrorBoundary';
import brandIcon from './assets/icon.png';

type Tab = 'rules' | 'general' | 'appearance' | 'monitors' | 'apps' | 'runtime' | 'raw' | 'settings';

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

const FOCUSED_KEYS = ['single', 'stack', 'monocle', 'floating'] as const;
const UNFOCUSED_KEYS = ['unfocused', 'unfocused_locked'] as const;

/** Converts a legacy (pre-0.1.3x) object-form `border` into the 0.1.4x shape komorebi understands. */
function normalizeConfig(c: KomorebiConfig): KomorebiConfig | null {
  const b = c.border;
  if (!b || typeof b === 'boolean') return null;
  const next = { ...c } as KomorebiConfig;
  const colours: Record<string, string> = {};
  if (b.active_colour) for (const k of FOCUSED_KEYS) colours[k] = b.active_colour;
  if (b.inactive_colour) for (const k of UNFOCUSED_KEYS) colours[k] = b.inactive_colour;
  if (Object.keys(colours).length) next.border_colours = { ...(c.border_colours ?? {}), ...colours };
  if (b.width != null && c.border_width == null) next.border_width = b.width;
  if (b.offset != null && c.border_offset == null) next.border_offset = b.offset;
  if (b.style && c.border_style == null) next.border_style = b.style;
  next.border = b.enabled !== false;
  return next;
}

const LEGACY_ANIMATION_STYLE: Record<string, string> = {
  EaseIn: 'EaseInSine',
  EaseOut: 'EaseOutSine',
  EaseInOut: 'EaseInOutSine'
};

const fixColourPrefix = (v: string) => (/^0[xX]/.test(v) ? '#' + v.slice(2).toUpperCase() : v);

/**
 * Upgrades stale config fields so komorebi 0.1.41 accepts the file.
 * komorebi silently ignores invalid configs on replace-configuration, so any
 * leftover 0x-prefixed colours or pre-0.1.40 animation style names would make
 * every apply a silent no-op.
 */
function migrateConfig(c: KomorebiConfig): { config: KomorebiConfig; changes: string[] } {
  const changes: string[] = [];
  let next = normalizeConfig(c);
  if (next) changes.push('Migrated legacy border config (object → border_colours)');
  else next = c;
  let touched = false;

  const bc = next.border_colours as BorderColours | undefined;
  if (bc) {
    const nbc: BorderColours = { ...bc };
    let colorTouched = false;
    for (const k of Object.keys(nbc) as (keyof BorderColours)[]) {
      const v = nbc[k];
      if (typeof v === 'string') {
        const fixed = fixColourPrefix(v);
        if (fixed !== v) {
          nbc[k] = fixed;
          colorTouched = true;
        }
      }
    }
    if (colorTouched) {
      next.border_colours = nbc;
      changes.push('Migrated border_colours hex (0x… → #…)');
      touched = true;
    }
  }

  const theme = next.theme as KomorebiTheme | null | undefined;
  if (theme && theme.palette === 'Custom' && theme.colours) {
    const ncols: Base16Palette = { ...theme.colours };
    let colorTouched = false;
    for (const k of Object.keys(ncols) as (keyof Base16Palette)[]) {
      const v = ncols[k];
      if (typeof v === 'string') {
        const fixed = fixColourPrefix(v);
        if (fixed !== v) {
          ncols[k] = fixed;
          colorTouched = true;
        }
      }
    }
    if (colorTouched) {
      next.theme = { ...theme, colours: ncols };
      changes.push('Migrated custom theme palette hex (0x… → #…)');
      touched = true;
    }
  }

  const anim = next.animation;
  if (anim && typeof anim === 'object' && typeof anim.style === 'string') {
    const mapped = LEGACY_ANIMATION_STYLE[anim.style];
    if (mapped) {
      next.animation = { ...anim, style: mapped };
      changes.push(`Migrated animation style (${anim.style} → ${mapped})`);
      touched = true;
    }
  }

  return { config: touched || changes.length > 0 ? next : c, changes };
}

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
  const [consoleLog, setConsoleLog] = useState<{ text: string; ok: boolean } | null>(() => {
    try {
      const raw = localStorage.getItem('chochin.console-log');
      return raw ? (JSON.parse(raw) as { text: string; ok: boolean }) : null;
    } catch {
      return null;
    }
  });
  const [masir, setMasir] = useState<MasirStatus | null>(null);
  const [masirBusy, setMasirBusy] = useState(false);
  const [komorebiBusy, setKomorebiBusy] = useState(false);

  useEffect(() => {
    try {
      if (consoleLog) localStorage.setItem('chochin.console-log', JSON.stringify(consoleLog));
      else localStorage.removeItem('chochin.console-log');
    } catch {
      /* storage unavailable */
    }
  }, [consoleLog]);
  const [showDeprecated, setShowDeprecated] = useState<boolean>(() => localStorage.getItem('chochin.show-deprecated') === '1');
  const [showEol, setShowEol] = useState<boolean>(() => localStorage.getItem('chochin.show-eol') !== '0');

  useEffect(() => {
    try {
      localStorage.setItem('chochin.show-deprecated', showDeprecated ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [showDeprecated]);

  useEffect(() => {
    try {
      localStorage.setItem('chochin.show-eol', showEol ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, [showEol]);

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

  const refreshFocused = async () => {
    const res = await bridge.focusedWindow();
    return res;
  };

  const captureFocused = async () => {
    const res = await refreshFocused();
    return { ok: res.ok, exe: res.exe ?? null, title: res.title ?? null };
  };

  const refreshMasir = async () => {
    const res = await bridge.masirStatus();
    setMasir(res.ok ? { detected: res.detected, running: res.running, exe: res.exe ?? null } : null);
  };

  const toggleMasir = async () => {
    if (masirBusy) return;
    setMasirBusy(true);
    const res = await bridge.masirToggle();
    setMasirBusy(false);
    if (res.ok) {
      setMasir({ detected: res.detected, running: res.running, exe: res.exe ?? null });
      t(res.running ? 'masir started' : 'masir stopped');
    } else {
      t(`masir toggle failed: ${res.output ?? 'unknown error'}`, 'err');
    }
  };

  const toggleKomorebi = async () => {
    if (komorebiBusy) return;
    setKomorebiBusy(true);
    const stopping = stateOk;
    const res = await run(stopping ? ['stop'] : ['start']);
    setKomorebiBusy(false);
    if (res.ok) {
      t(stopping ? 'komorebi stopped' : 'komorebi started');
      await new Promise((r) => setTimeout(r, 800));
      await refreshState();
    } else {
      t(`komorebi ${stopping ? 'stop' : 'start'} failed: ${res.output ?? 'unknown error'}`, 'err');
    }
  };

  const load = async () => {
    setBusy(true);
    const res = await bridge.readConfig();
    setPaths(res.paths);
    if (res.config.ok && res.config.value) {
      const { config: migrated, changes } = migrateConfig(res.config.value);
      setConfig(migrated);
      changes.forEach((msg) => t(msg, 'info'));
      setLoadError(null);
    } else {
      setLoadError(`komorebi.json: ${res.config.error ?? 'missing'}`);
    }
    if (res.apps.ok && res.apps.value) setApps(res.apps.value);
    await refreshState();
    await refreshMasir();
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
    setConsoleLog({ text: `${res.command}\n${res.output}`, ok: res.ok });
    if (res.ok) {
      t('Configuration applied');
    } else if (res.invalid) {
      const firstErr = (res.output.match(/Error:[^\n]*/) ?? [])[0] ?? 'config failed komorebi validation';
      t(`Config rejected by komorebi: ${firstErr}`, 'err');
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

  const applyCapturedRule = async (fieldKey: string, exe: string, title: string | null) => {
    if (!config) return;
    const rules = (config[fieldKey] as unknown as MatchingRule[] | undefined) ?? [];
    const exeId = exe.toLowerCase();
    const hasExeRef = (r: MatchingRule) =>
      r.kind === 'Exe'
        ? (r.id ?? '').toLowerCase() === exeId
        : (r.rules ?? []).some((s) => s.kind === 'Exe' && (s.id ?? '').toLowerCase() === exeId);
    if (title) {
      if (rules.some((r) => r.kind === 'Exe' && (r.id ?? '').toLowerCase() === exeId)) {
        t(`${exe} already has an exe rule in this section - remove it first`, 'err');
        return;
      }
      const dup = rules.some(
        (r) =>
          r.kind === 'Composite' &&
          (r.rules ?? []).some((s) => s.kind === 'Exe' && (s.id ?? '').toLowerCase() === exeId) &&
          (r.rules ?? []).some((s) => s.kind === 'Title' && s.id === title)
      );
      if (dup) {
        t(`${exe} already matched for "${title}" in this section`, 'err');
        return;
      }
    } else {
      if (rules.some(hasExeRef)) {
        t(`${exe} already has a rule in this section - remove it first`, 'err');
        return;
      }
    }
    const rule: MatchingRule = title
      ? {
          kind: 'Composite',
          matching_strategy: 'Equals',
          rules: [
            { kind: 'Exe', id: exe, matching_strategy: 'Equals' },
            { kind: 'Title', id: title, matching_strategy: 'Equals' }
          ]
        }
      : { kind: 'Exe', id: exe, matching_strategy: 'Equals' };
    const fieldLabel = RULE_FIELDS.find((f) => f.key === fieldKey)?.label ?? fieldKey;
    const next = { ...config, [fieldKey]: [...rules, rule] };
    setConfig(next);
    setBusy(true);
    const res = await bridge.saveConfig(next);
    setBusy(false);
    if (res.ok) {
      t(`${exe}${title ? ` ("${title}")` : ''} added to ${fieldLabel} - saved, Apply to activate`);
    } else {
      t(`Save failed: ${res.error}`, 'err');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== 'rules') return;
    refreshFocused();
    const id = setInterval(() => {
      refreshState();
      refreshFocused();
    }, 2000);
    return () => clearInterval(id);
  }, [tab]);

  return (
    <ErrorBoundary>
      <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <button className="conn-gear" onClick={() => setTab('settings')} title="Settings" aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <img className="logo" src={brandIcon} alt="" />
          chochin<small>v0.3.2</small>
        </div>
        <div className="conn">
          <div className="conn-row" title="Start or stop komorebi">
            <Toggle checked={stateOk} onChange={() => void toggleKomorebi()} />
            <span className="conn-row-label">
              <span className={`status-dot ${stateOk ? 'ok' : 'err'}`} />
              komorebi
            </span>
          </div>
          {masir && masir.detected && (
            <div className="conn-row" title={masir.exe ?? undefined}>
              <Toggle checked={masir.running} onChange={() => void toggleMasir()} />
              <span className="conn-row-label">
                <span className={`status-dot ${masir.running ? 'ok' : 'err'}`} />
                masir
              </span>
            </div>
          )}
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
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{tab === 'settings' ? 'Settings' : NAV.find((n) => n.id === tab)?.label}</h1>
            <div className="sub">
              {paths?.configPath ? <span className="mono">{paths.configPath}</span> : 'Locate komorebi.json to begin'}
            </div>
          </div>
          <div className="topbar-actions">
            {tab === 'apps' ? (
              <Button onClick={saveApps} disabled={!apps || busy}>
                Save applications.json
              </Button>
            ) : tab === 'settings' ? null : (
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
          <RuleEditor config={config} onChange={setConfig} capture={captureFocused} applyToSection={applyCapturedRule} t={t} />
        )}
        {tab === 'general' && config && (
          <GeneralConfig
            config={config}
            onChange={setConfig}
            showDeprecated={showDeprecated}
            showEol={showEol}
            onShowDeprecated={setShowDeprecated}
            onShowEol={setShowEol}
          />
        )}
        {tab === 'appearance' && config && <AppearanceConfig config={config} onChange={setConfig} showDeprecated={showDeprecated} />}
        {tab === 'monitors' && config && <MonitorsConfig config={config} onChange={setConfig} />}
        {tab === 'apps' && apps && <AppsConfigTab apps={apps} onChange={setApps} />}
        {tab === 'runtime' && <RuntimePanel state={state} run={run} t={t} consoleLog={consoleLog} onLog={setConsoleLog} />}
        {tab === 'raw' && config && <RawJson config={config} onChange={setConfig} save={save} />}
        {tab === 'settings' && (
          <Settings
            paths={paths}
            stateOk={stateOk}
            stateError={stateError}
            onPickConfig={pickConfigFile}
            onPickKomorebic={pickKomorebicFile}
            onReload={load}
          />
        )}

        </main>

      <ToastStack toasts={toasts} dismiss={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
      </div>
    </ErrorBoundary>
  );
}