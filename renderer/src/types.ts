export type MatchingKind = 'Exe' | 'Class' | 'Title' | 'Path' | 'Composite';
export type MatchingStrategy = 'Equals' | 'Contains' | 'Regex' | 'Legacy';

export interface MatchingRule {
  kind: MatchingKind;
  id?: string;
  matching_strategy?: MatchingStrategy;
  rules?: MatchingRule[];
}

export interface AnimationConfig {
  enabled?: boolean;
  style?: string;
  fps?: number;
  duration?: number;
}

/**
 * Border colours per container state (komorebi >= 0.1.3x).
 * Legacy `active_colour` / `inactive_colour` fields no longer exist; chochin maps
 * "active" -> single|stack|monocle|floating and "inactive" -> unfocused|unfocused_locked.
 * NOTE: has no effect while a `theme` is defined.
 */
export interface BorderColours {
  single?: string;
  stack?: string;
  monocle?: string;
  floating?: string;
  unfocused?: string;
  unfocused_locked?: string;
}

export const BASE16_VALUES = [
  'Base00', 'Base01', 'Base02', 'Base03', 'Base04', 'Base05', 'Base06', 'Base07',
  'Base08', 'Base09', 'Base0A', 'Base0B', 'Base0C', 'Base0D', 'Base0E', 'Base0F'
] as const;
export type Base16Value = (typeof BASE16_VALUES)[number];

export const CATPPUCCIN_VALUES = [
  'Rosewater', 'Flamingo', 'Pink', 'Mauve', 'Red', 'Maroon', 'Peach', 'Yellow',
  'Green', 'Teal', 'Sky', 'Sapphire', 'Blue', 'Lavender', 'Text', 'Subtext1',
  'Subtext0', 'Overlay2', 'Overlay1', 'Overlay0', 'Surface2', 'Surface1',
  'Surface0', 'Base', 'Mantle', 'Crust'
] as const;
export type CatppuccinValue = (typeof CATPPUCCIN_VALUES)[number];

/** Base16 palette (base_00..base_0f) used by a custom komorebi theme. */
export interface Base16Palette {
  base_00?: string;
  base_01?: string;
  base_02?: string;
  base_03?: string;
  base_04?: string;
  base_05?: string;
  base_06?: string;
  base_07?: string;
  base_08?: string;
  base_09?: string;
  base_0a?: string;
  base_0b?: string;
  base_0c?: string;
  base_0d?: string;
  base_0e?: string;
  base_0f?: string;
}

/**
 * Window/stackbar colour overrides on a komorebi theme. Values are *references*
 * into the theme palette (Base16Value / CatppuccinValue), not raw hex.
 */
export interface ThemeBorderOverrides {
  single_border?: string;
  stack_border?: string;
  monocle_border?: string;
  floating_border?: string;
  unfocused_border?: string;
  unfocused_locked_border?: string;
  stackbar_focused_text?: string;
  stackbar_unfocused_text?: string;
  stackbar_background?: string;
  bar_accent?: string;
}

export const THEME_OVERRIDE_FIELDS: { key: keyof ThemeBorderOverrides; label: string }[] = [
  { key: 'single_border', label: 'Single border' },
  { key: 'stack_border', label: 'Stack border' },
  { key: 'monocle_border', label: 'Monocle border' },
  { key: 'floating_border', label: 'Floating border' },
  { key: 'unfocused_border', label: 'Unfocused border' },
  { key: 'unfocused_locked_border', label: 'Unfocused locked border' },
  { key: 'stackbar_focused_text', label: 'Stackbar focused text' },
  { key: 'stackbar_unfocused_text', label: 'Stackbar unfocused text' },
  { key: 'stackbar_background', label: 'Stackbar background' },
  { key: 'bar_accent', label: 'Bar accent' }
];

/** Internally-tagged by `palette`, matching komorebi-themes' `KomorebiTheme`. */
export type KomorebiTheme =
  | ({ palette: 'Base16'; name: string } & ThemeBorderOverrides)
  | ({ palette: 'Catppuccin'; name: string } & ThemeBorderOverrides)
  | ({ palette: 'Custom'; name?: string; colours: Base16Palette } & ThemeBorderOverrides);

/** Pre-0.1.3x legacy shape, read for migration only. */
export interface LegacyBorderConfig {
  enabled?: boolean;
  width?: number;
  offset?: number;
  active_colour?: string;
  inactive_colour?: string;
  hwnd_focus_pen_colour?: string | null;
  hwnd_unfocus_pen_colour?: string | null;
  style?: string;
  focused?: Record<string, string>;
  unfocused?: Record<string, string>;
}

export interface MonitorWorkspaceConfig {
  name?: string | null;
  layout?: string | null;
  sizing?: string | null;
  layout_override?: string | null;
  workspace_padding?: { top?: number; bottom?: number; left?: number; right?: number };
  container_padding?: { top?: number; bottom?: number; left?: number; right?: number };
  rules?: Record<string, unknown>[];
}

export interface MonitorConfig {
  device?: string | null;
  workspaces?: MonitorWorkspaceConfig[] | null;
}

export interface KomorebiConfig {
  $schema?: string;
  animation?: AnimationConfig;
  app_specific_configuration_path?: string | string[];
  ignore_rules?: MatchingRule[];
  floating_applications?: MatchingRule[];
  manage_rules?: MatchingRule[];
  workspace_rules?: MatchingRule[];
  transparency_ignore_rules?: MatchingRule[];
  tray_and_multi_window_applications?: MatchingRule[];
  layered_applications?: MatchingRule[];
  object_name_change_applications?: MatchingRule[];
  slow_application_identifiers?: MatchingRule[];
  focus_follows_mouse?: string | null;
  mouse_follows_focus?: boolean;
  new_window_behaviour?: string;
  window_container_behaviour?: string;
  window_hiding_behaviour?: string;
  window_handling_behaviour?: string;
  cross_monitor_move_behaviour?: string;
  unmanaged_window_operation_behaviour?: string;
  border?: boolean | LegacyBorderConfig;
  border_colours?: BorderColours;
  border_width?: number;
  border_offset?: number;
  border_style?: string;
  transparency?: boolean;
  transparency_alpha?: number;
  theme?: KomorebiTheme | string | null;
  default_workspace_padding?: number;
  default_container_padding?: number;
  global_work_area_offset?: { top?: number; bottom?: number; left?: number; right?: number };
  monitors?: MonitorConfig[];
  resize_delta?: number;
  toggle_float_placement?: string;
  minimum_window_width?: number;
  minimum_window_height?: number;
  invisible_borders?: { top?: number; bottom?: number; left?: number; right?: number };
  [key: string]: unknown;
}

export interface AppsConfig {
  [appName: string]: {
    identifiers?: unknown;
    floating?: MatchingRule[];
    ignore?: MatchingRule[];
    manage?: MatchingRule[];
    workspace?: Record<string, unknown>;
    tray_and_multi_window?: boolean;
    layered?: boolean;
    object_name_change?: boolean;
    slow_application?: boolean;
    [key: string]: unknown;
  };
}

export interface ReadConfigResult {
  ok: boolean;
  config: { ok: boolean; value: KomorebiConfig | null; error?: string };
  apps: { ok: boolean; value: AppsConfig | null; error?: string };
  paths: { komorebicPath: string; configPath: string; appsConfigPath: string; schemaPath: string; schemaAscPath: string };
}

export interface Paths {
  komorebicPath: string;
  configPath: string;
  appsConfigPath: string;
  schemaPath: string;
  schemaAscPath: string;
}

export interface KomorebiStateWindow {
  hwnd: string | number;
  title?: string;
  exe?: string;
  class?: string;
}

export interface KomorebiStateContainer {
  id?: string;
  locked?: boolean;
  windows?: { elements?: KomorebiStateWindow[] };
}

export interface KomorebiStateWorkspace {
  name?: string;
  layout?: Record<string, string>;
  containers?: { elements?: KomorebiStateContainer[] };
}

export interface KomorebiStateMonitor {
  id?: string;
  name?: string;
  device?: string;
  last_focused_workspace?: number;
  workspace_names?: string[];
  workspaces?: { elements?: KomorebiStateWorkspace[] };
}

export interface KomorebiState {
  monitors?: { elements?: KomorebiStateMonitor[] };
  is_paused?: boolean;
  [key: string]: unknown;
}

export const RULE_FIELDS: { key: keyof KomorebiConfig; label: string; hint: string }[] = [
  { key: 'ignore_rules', label: 'Ignore rules', hint: 'Windows never managed; float freely.' },
  { key: 'floating_applications', label: 'Floating apps', hint: 'Managed but kept as floating windows on their workspace.' },
  { key: 'manage_rules', label: 'Force-manage rules', hint: 'Always tile these windows, overriding float rules.' },
  { key: 'workspace_rules', label: 'Workspace rules', hint: 'Launch these apps on a specific workspace.' },
  { key: 'transparency_ignore_rules', label: 'Transparency ignore', hint: 'Never apply the unfocused transparency effect.' },
  { key: 'tray_and_multi_window_applications', label: 'Tray & multi-window', hint: 'Apps that minimize to tray or open multiple windows.' },
  { key: 'layered_applications', label: 'Layered apps', hint: 'Apps with the WS_EX_LAYERED extended style.' },
  { key: 'object_name_change_applications', label: 'Object name change', hint: 'Apps that send EVENT_OBJECT_NAMECHANGE on launch.' },
  { key: 'slow_application_identifiers', label: 'Slow apps', hint: 'Apps that are slow to send initial events.' }
];

export const KINDS: MatchingKind[] = ['Exe', 'Class', 'Title', 'Path'];
export const STRATEGIES: MatchingStrategy[] = ['Equals', 'Contains', 'Regex', 'Legacy'];