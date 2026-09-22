import type { KomorebiConfig } from '../types';
import { Card, Field, SelectInput, Toggle, TextInput, NumberInput, Badge } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  showDeprecated: boolean;
  showEol: boolean;
  onShowDeprecated: (v: boolean) => void;
  onShowEol: (v: boolean) => void;
}

const ENUM_NEW_WINDOW = ['ASC', 'Default'];
const ENUM_CONTAINER = ['CurrentMonitor', 'CurrentWorkspace'];
const ENUM_HIDING = ['Identify', 'Hide', 'Cloak'];
const ENUM_HANDLING = ['Default', 'Float'];
const ENUM_CROSS_MONITOR = ['Move', 'Insert', 'Retile'];
const ENUM_UNMANAGED = ['NoOp', 'Float', 'Minimise'];
const ENUM_FFM = ['Komorebi', 'Windows'];
const ENUM_TOGGLE_PLACEMENT = ['Mouse', 'Center', 'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'];

export function FloatOpt({ label, field, value, onChange }: { label: string; field: string; value?: number | null; onChange: (n: number | null) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Toggle checked={value !== null} onChange={(b) => onChange(b ? 0 : null)} />
        {value !== null && (
          <NumberInput value={value ?? 0} onChange={(v) => onChange(v === '' ? 0 : Number(v))} />
        )}
        <span className="faint">{field}</span>
      </div>
    </Field>
  );
}

export default function GeneralConfig({ config, onChange, showDeprecated, showEol, onShowDeprecated, onShowEol }: Props) {
  const set = (key: string, v: unknown) => onChange({ ...config, [key]: v });
  return (
    <div className="stack">
      <Card title="Option visibility" subtitle="Choose which aged-out options appear in this app.">
        <div className="form-grid">
          <Field label="Show deprecated options" hint="Options deprecated in recent komorebi versions.">
            <Toggle checked={showDeprecated} onChange={onShowDeprecated} />
          </Field>
          <Field label="Show end-of-life options" hint="End-of-life features like focus-follows-mouse (use masir instead).">
            <Toggle checked={showEol} onChange={onShowEol} />
          </Field>
        </div>
      </Card>
      <Card title="General behaviour" subtitle="Core window management policies.">
        <div className="form-grid">
          <Field label="Application-specific config path" hint="JSON or comma-separated list." grow>
            <TextInput
              mono
              value={(config.app_specific_configuration_path as string) ?? ''}
              onChange={(v) => set('app_specific_configuration_path', v || null)}
            />
          </Field>
          {showEol && (
            <Field
              label={
                <span className="field-label-row">
                  Focus follows mouse <Badge tone="red">EOL</Badge>
                </span>
              }
              hint={
                <>
                  End-of-life — use{' '}
                  <a className="ext-link" href="https://github.com/LGUG2Z/masir" target="_blank" rel="noreferrer">
                    masir
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>{' '}
                  instead.
                </>
              }
            >
              <SelectInput
                value={((config.focus_follows_mouse as string) || '') as string}
                onChange={(v) => set('focus_follows_mouse', v || null)}
                options={ENUM_FFM}
                empty="(disabled)"
              />
            </Field>
          )}
          <Field label="Mouse follows focus" hint="Warp cursor to focused window.">
            <Toggle
              checked={!!config.mouse_follows_focus}
              onChange={(b) => set('mouse_follows_focus', b)}
            />
          </Field>
          <Field label="New window behaviour" hint="How ASC applications request a workspace.">
            <SelectInput
              value={(config.new_window_behaviour as string) ?? ''}
              onChange={(v) => set('new_window_behaviour', v)}
              options={ENUM_NEW_WINDOW}
            />
          </Field>
          <Field label="Window container behaviour" hint="Where a new window lands.">
            <SelectInput
              value={(config.window_container_behaviour as string) ?? ''}
              onChange={(v) => set('window_container_behaviour', v)}
              options={ENUM_CONTAINER}
            />
          </Field>
          <Field label="Window hiding behaviour">
            <SelectInput
              value={(config.window_hiding_behaviour as string) ?? ''}
              onChange={(v) => set('window_hiding_behaviour', v)}
              options={ENUM_HIDING}
            />
          </Field>
          <Field label="Window handling behaviour">
            <SelectInput
              value={(config.window_handling_behaviour as string) ?? ''}
              onChange={(v) => set('window_handling_behaviour', v)}
              options={ENUM_HANDLING}
            />
          </Field>
          <Field label="Cross-monitor move behaviour">
            <SelectInput
              value={(config.cross_monitor_move_behaviour as string) ?? ''}
              onChange={(v) => set('cross_monitor_move_behaviour', v)}
              options={ENUM_CROSS_MONITOR}
            />
          </Field>
          <Field label="Unmanaged window operation behaviour">
            <SelectInput
              value={(config.unmanaged_window_operation_behaviour as string) ?? ''}
              onChange={(v) => set('unmanaged_window_operation_behaviour', v)}
              options={ENUM_UNMANAGED}
            />
          </Field>
          <Field label="Toggle float placement">
            <SelectInput
              value={(config.toggle_float_placement as string) ?? ''}
              onChange={(v) => set('toggle_float_placement', v)}
              options={ENUM_TOGGLE_PLACEMENT}
            />
          </Field>
          <Field label="Resize delta (px)" hint="One keyboard step of resize.">
            <NumberInput value={config.resize_delta} onChange={(v) => set('resize_delta', v === '' ? 0 : Number(v))} />
          </Field>
          {showDeprecated && (
            <>
              <Field
                label={
                  <>
                    Minimum window width <Badge tone="amber">deprecated</Badge>
                  </>
                }
                hint="Discouraged in 0.1.4x."
              >
                <NumberInput value={config.minimum_window_width} onChange={(v) => set('minimum_window_width', v === '' ? 0 : Number(v))} />
              </Field>
              <Field
                label={
                  <>
                    Minimum window height <Badge tone="amber">deprecated</Badge>
                  </>
                }
                hint="Discouraged in 0.1.4x."
              >
                <NumberInput value={config.minimum_window_height} onChange={(v) => set('minimum_window_height', v === '' ? 0 : Number(v))} />
              </Field>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}