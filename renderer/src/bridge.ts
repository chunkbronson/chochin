import type { KomorebiConfig, AppsConfig, Paths, KomorebiState } from './types';

export interface Bridge {
  getPaths(): Promise<{ ok: boolean } & Paths>;
  setKomorebicPath(p: string): Promise<{ ok: boolean }>;
  readConfig(): Promise<{
    ok: boolean;
    config: { ok: boolean; value: KomorebiConfig | null; error?: string };
    apps: { ok: boolean; value: AppsConfig | null; error?: string };
    paths: Paths;
  }>;
  saveConfig(config: KomorebiConfig): Promise<{ ok: boolean; error?: string }>;
  saveAppsConfig(apps: AppsConfig): Promise<{ ok: boolean; error?: string }>;
  applyConfig(): Promise<{ ok: boolean; output: string; command: string }>;
  run(args: string[]): Promise<{ ok: boolean; output: string; command: string }>;
  state(): Promise<{ ok: boolean; state?: KomorebiState; output?: string }>;
  pickKomorebic(): Promise<{ ok: boolean; canceled?: boolean; komorebicPath?: string }>;
  pickConfig(): Promise<{ ok: boolean; canceled?: boolean; configPath?: string }>;
  log(text: string): Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    komorebi: Bridge;
  }
}

export const bridge = window.komorebi;