import type { BorderConfig, KomorebiConfig } from '../types';
import { Card, Field, SelectInput, Toggle, TextInput, NumberInput } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
}

const ENUM_ANIMATION = ['Linear', 'EaseIn', 'EaseOut'];

export default function AppearanceConfig({ config, onChange }: Props) {
  const set = (key: string, v: unknown) => onChange({ ...config, [key]: v });
  const border = typeof config.border === 'boolean' ? {} : (config.border ?? {}) as BorderConfig;
  const setBorder = (patch: Partial<BorderConfig>) => set('border', { ...border, ...patch });
  const anim = config.animation ?? {};
  const setAnim = (patch: Record<string, unknown>) => set('animation', { ...anim, ...patch });

  return (
    <div className="stack">
      <Card title="Borders" subtitle="Focused / unfocused window borders.">
        <div className="form-grid">
          <Field label="Enable borders">
            <Toggle checked={!!config.border && (config.border as any) !== true} onChange={(b) => set('border', b ? { ...border } : false)} />
          </Field>
          <Field label="Width (px)">
            <NumberInput value={border.width ?? config.border_width} onChange={(v) => setBorder({ width: Number(v) })} />
          </Field>
          <Field label="Offset (px)">
            <NumberInput value={border.offset ?? config.border_offset} onChange={(v) => setBorder({ offset: Number(v) })} />
          </Field>
          <Field label="Style" hint="Free-form; e.g. Solid, Flat.">
            <TextInput value={border.style ?? config.border_style ?? ''} onChange={(v) => setBorder({ style: v })} />
          </Field>
          <Field label="Active colour">
            <TextInput value={border.active_colour ?? ''} placeholder="0x6EA8FE" onChange={(v) => setBorder({ active_colour: v })} mono />
          </Field>
          <Field label="Inactive colour">
            <TextInput value={border.inactive_colour ?? ''} placeholder="0x262D3D" onChange={(v) => setBorder({ inactive_colour: v })} mono />
          </Field>
        </div>
      </Card>

      <Card title="Transparency" subtitle="Dim unfocused windows for depth of field.">
        <div className="form-grid">
          <Field label="Enable transparency">
            <Toggle checked={!!config.transparency} onChange={(b) => set('transparency', b)} />
          </Field>
          <Field label="Alpha of unfocused windows">
            <NumberInput value={config.transparency_alpha} onChange={(v) => set('transparency_alpha', Number(v))} />
          </Field>
        </div>
      </Card>

      <Card title="Animation" subtitle="Move / fade easing between layouts.">
        <div className="form-grid">
          <Field label="Enable animation">
            <Toggle checked={anim.enabled ?? true} onChange={(b) => setAnim({ enabled: b })} />
          </Field>
          <Field label="Style">
            <SelectInput value={(anim.style as string) ?? ''} onChange={(v) => setAnim({ style: v })} options={ENUM_ANIMATION} />
          </Field>
          <Field label="FPS">
            <NumberInput value={anim.fps} onChange={(v) => setAnim({ fps: Number(v) })} />
          </Field>
          <Field label="Duration (ms)">
            <NumberInput value={anim.duration} onChange={(v) => setAnim({ duration: Number(v) })} />
          </Field>
        </div>
      </Card>
    </div>
  );
}