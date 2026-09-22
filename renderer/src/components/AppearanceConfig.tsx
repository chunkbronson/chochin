import type { Base16Palette, BorderColours, KomorebiConfig, KomorebiTheme } from '../types';
import { BASE16_VALUES, CATPPUCCIN_VALUES, THEME_OVERRIDE_FIELDS } from '../types';
import { Card, Field, SelectInput, Toggle, TextInput, NumberInput, ColorInput, Padding4, Badge } from '../ui';

interface Props {
  config: KomorebiConfig;
  onChange: (next: KomorebiConfig) => void;
  showDeprecated: boolean;
}

const ENUM_ANIMATION = ['Linear', 'EaseInSine', 'EaseOutSine', 'EaseInOutSine', 'EaseInQuad', 'EaseOutQuad', 'EaseInOutQuad', 'EaseInCubic', 'EaseOutCubic', 'EaseInOutCubic'];
const ENUM_PALETTE = ['Base16', 'Catppuccin', 'Custom'];
const THESH_STASH_KEY = 'chochin.theme-stash';

function stashTheme(theme: KomorebiTheme | null) {
  try {
    if (theme) localStorage.setItem(THESH_STASH_KEY, JSON.stringify(theme));
    else localStorage.removeItem(THESH_STASH_KEY);
  } catch {
    /* storage unavailable — nothing to stash */
  }
}

function readStash(): KomorebiTheme | null {
  try {
    const raw = localStorage.getItem(THESH_STASH_KEY);
    return raw ? (JSON.parse(raw) as KomorebiTheme) : null;
  } catch {
    return null;
  }
}

export default function AppearanceConfig({ config, onChange, showDeprecated }: Props) {
  const set = (key: string, v: unknown) => onChange({ ...config, [key]: v });

  const borderOn = config.border !== false;
  const bc = (config.border_colours ?? {}) as BorderColours;
  const active = bc.single ?? bc.stack ?? bc.monocle ?? bc.floating;
  const inactive = bc.unfocused ?? bc.unfocused_locked;

  const setActive = (v: string) =>
    onChange({ ...config, border_colours: { ...bc, single: v, stack: v, monocle: v, floating: v } });
  const setInactive = (v: string) =>
    onChange({ ...config, border_colours: { ...bc, unfocused: v, unfocused_locked: v } });

  const anim = config.animation ?? {};
  const setAnim = (patch: Record<string, unknown>) => set('animation', { ...anim, ...patch });

  const rawTheme = config.theme;
  const themeOn = rawTheme !== null && rawTheme !== undefined;
  const theme =
    typeof rawTheme === 'string'
      ? ({ palette: 'Base16', name: rawTheme } as KomorebiTheme)
      : (rawTheme as KomorebiTheme | null);
  const palette = (theme?.palette ?? 'Base16') as 'Base16' | 'Catppuccin' | 'Custom';
  const themeName = theme && 'name' in theme ? theme.name ?? '' : '';
  const colours: Base16Palette = (theme?.palette === 'Custom' ? theme.colours ?? {} : {}) as Base16Palette;

  const patchTheme = (patch: Record<string, unknown>) =>
    onChange({ ...config, theme: { ...(theme as object), ...patch } as unknown as KomorebiTheme });

  const setPalette = (p: string) => {
    if (p === 'Custom') patchTheme({ palette: 'Custom', colours });
    else patchTheme({ palette: p, name: themeName || (p === 'Catppuccin' ? 'Mocha' : 'Ashes') });
  };
  const setOverride = (field: string, v: string) => patchTheme({ [field]: v || undefined });
  const setColour = (slot: keyof Base16Palette, v: string) =>
    patchTheme({ colours: { ...colours, [slot]: v || undefined } });

  const toggleTheme = (on: boolean) => {
    if (on) {
      const stashed = readStash();
      onChange({ ...config, theme: stashed ?? { palette: 'Base16', name: 'Ashes' } });
    } else {
      if (theme) stashTheme(theme);
      onChange({ ...config, theme: null });
    }
  };

  const overrideOptions: string[] = palette === 'Catppuccin' ? [...CATPPUCCIN_VALUES] : [...BASE16_VALUES];

  return (
    <div className="stack">
      <Card title="Borders" subtitle="0.1.4x schema: border toggles, colours live in border_colours.">
        {themeOn && (
          <div className="warn" style={{ marginBottom: 14 }}>
            A <code>theme</code> is set — komorebi ignores <code>border_colours</code> while a theme is defined.
            Remove the theme to see custom colours.
          </div>
        )}
        <div className="form-grid">
          <Field label="Enable borders">
            <Toggle checked={borderOn} onChange={(b) => onChange({ ...config, border: b })} />
          </Field>
          <Field label="Width (px)">
            <NumberInput value={config.border_width} onChange={(v) => set('border_width', v === '' ? undefined : Number(v))} />
          </Field>
          <Field label="Offset (px)">
            <NumberInput value={config.border_offset} onChange={(v) => set('border_offset', v === '' ? undefined : Number(v))} />
          </Field>
          <Field label="Active colour" hint="Applied to single, stack, monocle and floating containers.">
            <ColorInput value={active} onChange={setActive} />
          </Field>
          <Field label="Inactive colour" hint="Applied to unfocused (and unfocused+locked) containers.">
            <ColorInput value={inactive} onChange={setInactive} />
          </Field>
          {showDeprecated && (
            <Field
              label={
                <>
                  Style <Badge tone="amber">deprecated</Badge>
                </>
              }
              hint="No longer required since v0.1.22."
            >
              <TextInput value={config.border_style ?? ''} onChange={(v) => set('border_style', v || undefined)} />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Padding" subtitle="Global defaults for the gaps around and between windows. Per-workspace overrides live in Monitors.">
        <div className="form-grid">
          <Field label="Default container padding" hint="Gap between windows.">
            <NumberInput value={config.default_container_padding} onChange={(v) => set('default_container_padding', v === '' ? undefined : Number(v))} />
          </Field>
          <Field label="Default workspace padding" hint="Space between windows and the screen edges.">
            <NumberInput value={config.default_workspace_padding} onChange={(v) => set('default_workspace_padding', v === '' ? undefined : Number(v))} />
          </Field>
          <Field label="Global work area offset">
            <Padding4 value={config.global_work_area_offset as Record<string, number> | undefined} onChange={(v) => set('global_work_area_offset', v)} />
          </Field>
          {showDeprecated && (
            <Field
              label={
                <>
                  Invisible borders <Badge tone="amber">deprecated</Badge>
                </>
              }
              hint="No longer required since v0.1.22."
            >
              <Padding4 value={config.invisible_borders as Record<string, number> | undefined} onChange={(v) => set('invisible_borders', v)} />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Theme" subtitle="KomorebiTheme: a Base16/Catppuccin preset, or a fully custom palette.">
        <div className="form-grid">
          <Field label="Enable theme" hint="Disabling lets border_colours take effect. Your theme is preserved.">
            <Toggle checked={themeOn} onChange={toggleTheme} />
          </Field>
          {themeOn && (
            <>
              <Field label="Palette">
                <SelectInput value={palette} onChange={setPalette} options={ENUM_PALETTE} />
              </Field>
              {(palette === 'Base16' || palette === 'Catppuccin') && (
                <Field label="Theme name" hint="e.g. Ashes for base16, Mocha for catppuccin.">
                  <TextInput value={themeName} onChange={(v) => patchTheme({ name: v })} />
                </Field>
              )}
            </>
          )}
        </div>

        {themeOn && palette === 'Custom' && (
          <div className="theme-palette">
            <span className="faint">Custom palette (base_00 – base_0f)</span>
            <div className="theme-palette-grid">
              {(Object.keys(colours).length ? Object.keys(colours) : [
                'base_00','base_01','base_02','base_03','base_04','base_05','base_06','base_07',
                'base_08','base_09','base_0a','base_0b','base_0c','base_0d','base_0e','base_0f'
              ]).map((slot) => (
                <label key={slot} className="theme-slot">
                  <code className="faint">{slot}</code>
                  <ColorInput value={colours[slot as keyof Base16Palette]} onChange={(v) => setColour(slot as keyof Base16Palette, v)} />
                </label>
              ))}
            </div>
          </div>
        )}

        {themeOn && (
          <div style={{ marginTop: 14 }}>
            <span className="faint">Palette references (single_border … bar_accent)</span>
            <div className="form-grid" style={{ marginTop: 8 }}>
              {THEME_OVERRIDE_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <SelectInput
                    value={(theme?.[key] as string) ?? ''}
                    onChange={(v) => setOverride(key, v)}
                    options={overrideOptions}
                    empty="(default)"
                  />
                </Field>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title="Transparency" subtitle="Dim unfocused windows for depth of field.">
        <div className="form-grid">
          <Field label="Enable transparency">
            <Toggle checked={!!config.transparency} onChange={(b) => set('transparency', b)} />
          </Field>
          <Field label="Alpha (0–255)">
            <div style={{ maxWidth: 130 }}>
              <NumberInput value={config.transparency ? (config.transparency_alpha ?? 150) : 150} disabled={!config.transparency} onChange={(v) => set('transparency_alpha', Number(v))} />
            </div>
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