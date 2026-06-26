import classic from "./themes/classic.json";
import minimal from "./themes/minimal.json";
import neon from "./themes/neon.json";

export interface ThemeTokens {
  housingBg: string;
  housingBorder: string;
  lensOff: string;
  green: string;
  greenGlow: string;
  yellow: string;
  yellowGlow: string;
  red: string;
  redGlow: string;
}

interface ThemeFile extends ThemeTokens {
  themeVersion: number;
  id: string;
  name: string;
}

const builtin: Record<string, ThemeFile> = {
  classic: classic as ThemeFile,
  minimal: minimal as ThemeFile,
  neon: neon as ThemeFile,
};

export const themeNames = Object.keys(builtin);

export function getTheme(name: string): ThemeFile {
  return builtin[name] ?? builtin.classic;
}

export function applyThemeToElement(element: HTMLElement, name: string): void {
  const theme = getTheme(name);
  element.style.setProperty("--housing-bg", theme.housingBg);
  element.style.setProperty("--housing-border", theme.housingBorder);
  element.style.setProperty("--lens-off", theme.lensOff);
  element.style.setProperty("--green", theme.green);
  element.style.setProperty("--green-glow", theme.greenGlow);
  element.style.setProperty("--yellow", theme.yellow);
  element.style.setProperty("--yellow-glow", theme.yellowGlow);
  element.style.setProperty("--red", theme.red);
  element.style.setProperty("--red-glow", theme.redGlow);
  element.dataset.theme = theme.id;
}

export function applyTheme(name: string): void {
  applyThemeToElement(document.documentElement, name);
  document.body.dataset.theme = getTheme(name).id;
}
