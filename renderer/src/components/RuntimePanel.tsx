import { useState } from 'react';
import type { ReactNode } from 'react';
import type { KomorebiState, KomorebiStateWorkspace } from '../types';
import { Card, Field, SelectInput, Button, Badge, EmptyState } from '../ui';

interface Props {
  state?: KomorebiState;
  run: (args: string[]) => Promise<{ ok: boolean; output: string; command: string }>;
  t: (msg: string, kind?: 'ok' | 'err' | 'info') => void;
  consoleLog: { text: string; ok: boolean } | null;
  onLog: (v: { text: string; ok: boolean }) => void;
}

const ENUM_LAYOUT = ['BSP', 'Columns', 'Rows', 'VerticalStack', 'HorizontalStack', 'Ultrawide', 'Custom', 'Grid', 'RightMainVerticalStack', 'UltrawideVerticalStack'];

function wsLayoutName(ws: KomorebiStateWorkspace): string {
  const lay = ws.layout;
  if (!lay) return 'BSP';
  const vals = Object.values(lay);
  return vals[0] ?? 'BSP';
}

export default function RuntimePanel({ state, run, t, consoleLog, onLog }: Props) {
  const [layout, setLayout] = useState<string>('BSP');
  const [busy, setBusy] = useState<string>('');

  const doRun = async (args: string[], okMsg: string) => {
    const key = args.join(' ');
    setBusy(key);
    const res = await run(args);
    setBusy('');
    onLog({ text: `${res.command}\n${res.output}\n`, ok: res.ok });
    t(res.ok ? okMsg : `${okMsg} failed`, res.ok ? 'ok' : 'err');
  };

  const monitors = state?.monitors?.elements ?? [];
  const isPaused = !!state?.is_paused;
  const workspaceCount = monitors.reduce((acc, m) => acc + (m.workspaces?.elements?.length ?? 0), 0);
  const windowCount = monitors.reduce((acc, m) => {
    return acc + (m.workspaces?.elements ?? []).reduce((wa, ws) => {
      return wa + (ws.containers?.elements ?? []).reduce((ca, c) => ca + (c.windows?.elements?.length ?? 0), 0);
    }, 0);
  }, 0);
  const running = monitors.length > 0 && state !== undefined;

  const kpi = (num: number, lbl: string, badge?: ReactNode) => (
    <div className="kpi" style={{ flex: 1 }}>
      <div className="num">{num}</div>
      <div className="lbl">
        {lbl} {badge}
      </div>
    </div>
  );

  const cmd = (label: string, args: string[]) => {
    const key = args.join(' ');
    return (
      <Button variant="ghost" disabled={busy === key} onClick={() => doRun(args, label)}>
        {busy === key ? '…' : label}
      </Button>
    );
  };

  return (
    <div className="stack">
      <div className="row">
        {kpi(monitors.length, 'Monitors in state', !running && <Badge tone="red">offline</Badge>)}
        {kpi(workspaceCount, 'Workspaces')}
        {kpi(windowCount, 'Tiled windows')}
        {kpi(isPaused ? 1 : 0, isPaused ? 'Paused' : 'Unpaused', isPaused && <Badge tone="amber">paused</Badge>)}
      </div>

      <Card title="Quick controls">
        <div className="row wrap" style={{ gap: 8 }}>
          {cmd('Toggle pause', ['toggle-pause'])}
          {cmd('Toggle float', ['toggle-float'])}
          {cmd('Retile all', ['retile'])}
          {cmd('Reset', ['reset'])}
        </div>
        <div className="row" style={{ marginTop: 14, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Field label="Apply layout to focused workspace">
            <SelectInput value={layout} onChange={setLayout} options={ENUM_LAYOUT} />
          </Field>
          <Button onClick={() => doRun(['change-layout', layout], 'Layout applied')}>Apply</Button>
          <Button variant="ghost" onClick={() => doRun(['toggle-layout-flip'], 'Layout flipped')}>Flip layout</Button>
          <Button variant="ghost" onClick={() => doRun(['cycle-layout'], 'Cycle layout')}>Cycle layout</Button>
        </div>
      </Card>

      <Card title="Workspaces" subtitle="Click a workspace chip to move focus there.">
        {!running ? (
          <EmptyState title="No state" hint="States Unknown — is komorebi running?" />
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {monitors.map((m, mi) => {
              const wses = m.workspaces?.elements ?? [];
              const names = m.workspace_names ?? [];
              return (
                <div key={mi}>
                  <div className="field-label" style={{ marginBottom: 8 }}>
                    Monitor {mi + 1} <span className="faint mono">{m.device ?? ''}</span> · focus: ws {(m.last_focused_workspace ?? 0) + 1}
                  </div>
                  <div className="row wrap" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {wses.map((ws, wi) => (
                      <button
                        key={wi}
                        className={wi === m.last_focused_workspace ? 'workspace-chip focused' : 'workspace-chip'}
                        onClick={() => doRun(['focus-workspace', String(mi), String(wi)], 'Workspace focused')}
                      >
                        {ws.name ?? names[wi] ?? `WS ${wi + 1}`}
                        <span className="faint">· {wsLayoutName(ws)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Komorebi output" subtitle="Output of the last komorebi command run from this app.">
        {consoleLog ? (
          <div className={consoleLog.ok ? 'console ok' : 'console err'}>{consoleLog.text}</div>
        ) : (
          <EmptyState title="No output yet" hint="Save & apply, or run a command above - the komorebi output will appear here." />
        )}
      </Card>
    </div>
  );
}