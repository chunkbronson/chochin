import { Card } from '../ui';
import type { Paths } from '../types';

interface SettingsProps {
  paths: Paths | null;
  stateOk: boolean;
  stateError: string;
  onPickConfig: () => void;
  onPickKomorebic: () => void;
  onReload: () => void;
}

export default function Settings({ paths, stateOk, stateError, onPickConfig, onPickKomorebic, onReload }: SettingsProps) {
  return (
    <div className="stack">
      <Card title="Connection & files" subtitle="Where chochin reads from and writes to">
        <div className="settings-status">
          <span className={`status-dot ${stateOk ? 'ok' : 'err'}`} />
          {stateOk ? 'komorebi connected' : 'komorebi offline'}
        </div>
        {stateError && <div className="faint mono settings-error">{stateError}</div>}

        <div className="settings-paths">
          <div className="path-block">
            <span className="path-label">komorebi.json</span>
            <div className="path-value mono" title={paths?.configPath}>
              {paths?.configPath ?? '—'}
            </div>
          </div>
          <div className="path-block">
            <span className="path-label">komorebic.exe</span>
            <div className="path-value mono" title={paths?.komorebicPath}>
              {paths?.komorebicPath ?? '—'}
            </div>
          </div>
        </div>

        <div className="pick-grid">
          <div className="btn ghost" onClick={onPickConfig} role="button">
            ☲ Locate komorebi.json…
          </div>
          <div className="btn ghost" onClick={onPickKomorebic} role="button">
            ⌗ Locate komorebic.exe…
          </div>
          <div className="btn ghost" onClick={onReload} role="button">
            ↻ Reload files
          </div>
        </div>
      </Card>
    </div>
  );
}