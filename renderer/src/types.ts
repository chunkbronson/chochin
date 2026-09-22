export type MatchingKind = 'Exe' | 'Class' | 'Title' | 'Path';
export type MatchingStrategy = 'Equals' | 'Contains' | 'Regex' | 'Legacy';

export interface MatchingRule {
  kind: MatchingKind;
  id: string;
  matching_strategy?: MatchingStrategy;
}

export interface AnimationConfig {
  enabled?: boolean;
  style?: string;
  fps?: number;
  duration?: number;
}

export interface BorderConfig {
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
  border?: BorderConfig | boolean;
  border_width?: number;
  border_offset?: number;
  border_style?: string;
  transparency?: boolean;
  transparency_alpha?: number;
  theme?: string;
  default_workspace_padding?: { top?: number; bottom?: number; left?: number; right?: number };
  default_container_padding?: { top?: number; bottom?: number; left?: number; right?: number };
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