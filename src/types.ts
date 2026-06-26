export type Light = "green" | "yellow" | "red";

export interface StageSound {
  preset: string;
  custom_path: string | null;
}

export interface SoundsConfig {
  enabled: boolean;
  green: StageSound;
  yellow: StageSound;
  red: StageSound;
}

export type WindowSize = "small" | "medium" | "large";

export interface Config {
  idle_timeout_secs: number;
  stealth: boolean;
  stealth_acknowledged: boolean;
  theme: string;
  locale: string;
  onboarding_completed: boolean;
  window: { x: number; y: number; size: string; horizontal?: boolean };
  sounds: SoundsConfig;
}

export interface ToolStatus {
  id: string;
  name: string;
  installed: boolean;
  connected: boolean;
}

export const SOUND_PRESETS = [
  "soft-chime",
  "double-ping",
  "alert",
  "chime",
  "bell",
  "ping",
  "pop",
] as const;

export type SoundPreset = (typeof SOUND_PRESETS)[number];
