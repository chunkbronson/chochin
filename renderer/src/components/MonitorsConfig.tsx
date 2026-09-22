import type { KomorebiConfig, MonitorConfig, MonitorWorkspaceConfig } from '../types';
import { Card, Field, SelectInput, TextInput, Button, Padding4, EmptyState } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
}

const ENUM_LAYOUT = ['BSP', 'Columns', 'Rows', 'VerticalStack', 'HorizontalStack', 'Ultrawide', 'Custom'];
const ENUM_SIZING = ['Size', 'Minimize', 'Maximize'];

const DEFAULT_WS = (): MonitorWorkspaceConfig => ({
  name: '',
  layout: 'BSP',
  sizing: 'Size',
  workspace_padding: { top: 0, bottom: 0, left: 0, right: 0 },
  container_padding: { top: 0, bottom: 0, left: 0, right: 0 }
});

function WorkspaceRow({ ws, index, onChange, onRemove }: { ws: MonitorWorkspaceConfig; index: number; onChange: (w: MonitorWorkspaceConfig) => void; onRemove: () => void }) {
  return (
    <div className="list-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span className="field-label" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          Workspace {index + 1}
        </span>
        <TextInput value={ws.name ?? ''} placeholder="workspace name" onChange={(v) => onChange({ ...ws, name: v || null })} />
        <Button variant="subtle" title="Remove workspace" onClick={onRemove}>
          ✕
        </Button>
      </div>
      <div className="form-grid tight">
        <Field label="Layout">
          <SelectInput value={(ws.layout as string) ?? ''} onChange={(v) => onChange({ ...ws, layout: v })} options={ENUM_LAYOUT} empty="(inherit)" />
        </Field>
        <Field label="Sizing">
          <SelectInput value={(ws.sizing as string) ?? ''} onChange={(v) => onChange({ ...ws, sizing: v })} options={ENUM_SIZING} empty="(inherit)" />
        </Field>
        <Field label="Workspace padding">
          <Padding4 value={ws.workspace_padding as Record<string, number> | undefined} onChange={(v) => onChange({ ...ws, workspace_padding: v })} />
        </Field>
        <Field label="Container padding">
          <Padding4 value={ws.container_padding as Record<string, number> | undefined} onChange={(v) => onChange({ ...ws, container_padding: v })} />
        </Field>
      </div>
    </div>
  );
}

function MonitorPanel({ mon, index, onChange, onRemove }: { mon: MonitorConfig; index: number; onChange: (m: MonitorConfig) => void; onRemove: () => void }) {
  const workspaces = mon.workspaces ?? [];
  const setWs = (i: number, w: MonitorWorkspaceConfig) => onChange({ ...mon, workspaces: workspaces.map((x, idx) => (idx === i ? w : x)) });
  const addWs = () => onChange({ ...mon, workspaces: [...workspaces, DEFAULT_WS()] });
  const removeWs = (i: number) => onChange({ ...mon, workspaces: workspaces.filter((_, idx) => idx !== i) });

  return (
    <Card
      title={<>Monitor {index + 1} <span className="faint mono" style={{ fontWeight: 400 }}>{mon.device ?? '(default device)'}</span></>}
      actions={
        <>
          <Button variant="subtle" onClick={() => addWs()}>+ workspace</Button>
          <Button variant="subtle" onClick={onRemove}>✕</Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 8 }}>
        <Field label="Device id" hint="Leave empty to match all.">
          <TextInput mono value={mon.device ?? ''} onChange={(v) => onChange({ ...mon, device: v || null })} />
        </Field>
        {workspaces.length === 0 && <EmptyState title="No workspaces" hint="Add one to override the defaults for this monitor." />}
        {workspaces.map((ws, i) => (
          <WorkspaceRow
            key={i}
            ws={ws}
            index={i}
            onChange={(w) => setWs(i, w)}
            onRemove={() => removeWs(i)}
          />
        ))}
      </div>
    </Card>
  );
}

export default function MonitorsConfig({ config, onChange }: Props) {
  const monitors = config.monitors ?? [];
  const setMonitor = (i: number, m: MonitorConfig) => onChange({ ...config, monitors: monitors.map((x, idx) => (idx === i ? m : x)) });
  const addMonitor = () => onChange({ ...config, monitors: [...monitors, { device: null, workspaces: [DEFAULT_WS()] }] });
  const removeMonitor = (i: number) => onChange({ ...config, monitors: monitors.filter((_, idx) => idx !== i) });

  return (
    <div className="stack">
      <Card
        title="Monitors & workspaces"
        subtitle="Per-monitor workspace definitions. Empty device id inherits defaults."
        actions={
          <Button onClick={addMonitor} variant="primary">
            + Add monitor
          </Button>
        }
      >
        <div className="stack" style={{ gap: 14 }}>
          {monitors.length === 0 ? (
            <EmptyState title="No monitors configured" hint="Komorebi falls back to its built-in defaults with 10 workspaces per monitor." />
          ) : (
            monitors.map((m, i) => (
              <MonitorPanel key={i} mon={m} index={i} onChange={(x) => setMonitor(i, x)} onRemove={() => removeMonitor(i)} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}