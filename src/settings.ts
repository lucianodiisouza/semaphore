import { emit } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { applyTheme } from "./themes";
import { t, type Locale } from "./i18n";
import {
  buildSizePicker,
  buildThemePicker,
  createSemaphorePreview,
  refreshSizePickerTheme,
  updateLivePreview,
} from "./preview";
import { previewStageSound } from "./sounds";
import type { Config, Light, StageSound, ToolStatus, WindowSize } from "./types";

const GITHUB_REPO = "https://github.com/lucianodiisouza/semaphore";

const STAGES: Light[] = ["green", "yellow", "red"];

let currentLocale: Locale = "en";
let selectedTheme = "classic";
let selectedSize = "medium";
let appVersion = "0.2.1";
const customPaths: Record<Light, string | null> = {
  green: null,
  yellow: null,
  red: null,
};

function getThemeInput(): HTMLInputElement {
  return document.getElementById("theme-select") as HTMLInputElement;
}

function getSizeInput(): HTMLInputElement {
  return document.getElementById("size-select") as HTMLInputElement;
}

function setThemeValue(theme: string): void {
  selectedTheme = theme;
  getThemeInput().value = theme;
  refreshSizePickerTheme(document.getElementById("size-picker")!, theme);
  updateLivePreview(
    document.getElementById("live-preview-inner")!,
    theme,
    selectedSize,
  );
}

function setSizeValue(size: string): void {
  selectedSize = size;
  getSizeInput().value = size;
  const livePreviewInner = document.getElementById("live-preview-inner")!;
  livePreviewInner.dataset.size = size;
  updateLivePreview(livePreviewInner, selectedTheme, size);
}

let pickersInitialized = false;

function initAppearancePickers(): void {
  if (pickersInitialized) {
    const themePicker = document.getElementById("theme-picker")!;
    const sizePicker = document.getElementById("size-picker")!;
    for (const btn of themePicker.querySelectorAll<HTMLButtonElement>(".theme-option")) {
      const isSelected = btn.dataset.value === selectedTheme;
      btn.classList.toggle("selected", isSelected);
      btn.setAttribute("aria-checked", String(isSelected));
    }
    for (const btn of sizePicker.querySelectorAll<HTMLButtonElement>(".size-option")) {
      const isSelected = btn.dataset.value === selectedSize;
      btn.classList.toggle("selected", isSelected);
      btn.setAttribute("aria-checked", String(isSelected));
    }
    refreshSizePickerTheme(sizePicker, selectedTheme);
    const livePreviewInner = document.getElementById("live-preview-inner")!;
    livePreviewInner.dataset.size = selectedSize;
    updateLivePreview(livePreviewInner, selectedTheme, selectedSize);
    return;
  }
  pickersInitialized = true;
  const themePicker = document.getElementById("theme-picker")!;
  const sizePicker = document.getElementById("size-picker")!;
  const strings = t(currentLocale);

  buildThemePicker(themePicker, selectedTheme, setThemeValue);
  buildSizePicker(
    sizePicker,
    selectedSize,
    selectedTheme,
    {
      small: strings.settings.sizeSmall,
      medium: strings.settings.sizeMedium,
      large: strings.settings.sizeLarge,
    },
    setSizeValue,
  );

  const livePreviewInner = document.getElementById("live-preview-inner")!;
  livePreviewInner.appendChild(createSemaphorePreview("green"));
  updateLivePreview(livePreviewInner, selectedTheme, selectedSize);
}

function stageSound(stage: Light): StageSound {
  const presetSelect = document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement;
  const isCustom = presetSelect.value === "custom";
  return {
    preset: isCustom ? "soft-chime" : presetSelect.value,
    custom_path: isCustom ? customPaths[stage] : null,
  };
}

function validateSounds(): boolean {
  const strings = t(currentLocale);
  for (const stage of STAGES) {
    const presetSelect = document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement;
    if (presetSelect.value === "custom" && !customPaths[stage]) {
      alert(strings.settings.soundImportFailed);
      return false;
    }
  }
  return true;
}

function updateStageUi(stage: Light): void {
  const presetSelect = document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement;
  const browseBtn = document.getElementById(`sound-${stage}-browse`) as HTMLButtonElement;
  const hint = document.getElementById(`sound-${stage}-hint`) as HTMLSpanElement;
  const strings = t(currentLocale);
  const isCustom = presetSelect.value === "custom";

  browseBtn.hidden = !isCustom;
  hint.hidden = !isCustom || !customPaths[stage];
  if (isCustom && customPaths[stage]) {
    const name = customPaths[stage]!.split(/[/\\]/).pop() ?? customPaths[stage];
    hint.textContent = `${strings.settings.soundCustomActive}: ${name}`;
  }
}

function toolStatusLabel(tool: ToolStatus, strings: ReturnType<typeof t>): string {
  if (tool.connected) return strings.tools.connected;
  if (tool.installed) return strings.tools.notConnected;
  return strings.tools.notInstalled;
}

function toolStatusClass(tool: ToolStatus): string {
  if (tool.connected) return "connected";
  if (tool.installed) return "installed";
  return "missing";
}

async function refreshToolStatus(): Promise<void> {
  const list = document.getElementById("tool-status-list");
  if (!list) return;

  const strings = t(currentLocale);
  let tools: ToolStatus[] = [];
  try {
    tools = await invoke<ToolStatus[]>("detect_tools");
  } catch {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = "";
  for (const tool of tools) {
    const row = document.createElement("div");
    row.className = "tool-status-row";

    const name = document.createElement("span");
    name.className = "tool-status-name";
    name.textContent = tool.name;

    const badge = document.createElement("span");
    badge.className = `tool-status-badge ${toolStatusClass(tool)}`;
    badge.textContent = toolStatusLabel(tool, strings);

    row.appendChild(name);
    row.appendChild(badge);
    list.appendChild(row);
  }
}

function renderAboutLinks(strings: ReturnType<typeof t>["about"]): void {
  const links = document.getElementById("about-links")!;
  links.innerHTML = "";

  const githubLink = document.createElement("a");
  githubLink.href = GITHUB_REPO;
  githubLink.textContent = strings.github;
  githubLink.addEventListener("click", (e) => {
    e.preventDefault();
    void openUrl(GITHUB_REPO);
  });

  const releasesLink = document.createElement("a");
  releasesLink.href = `${GITHUB_REPO}/releases`;
  releasesLink.textContent = strings.releases;
  releasesLink.addEventListener("click", (e) => {
    e.preventDefault();
    void openUrl(`${GITHUB_REPO}/releases`);
  });

  links.appendChild(githubLink);
  links.appendChild(releasesLink);
}

function applyLocale(locale: Locale): void {
  currentLocale = locale;
  const strings = t(locale);
  document.getElementById("settings-title")!.textContent = strings.settings.title;
  document.getElementById("label-theme")!.textContent = strings.settings.theme;
  document.getElementById("label-language")!.textContent = strings.settings.language;
  document.getElementById("label-size")!.textContent = strings.settings.size;
  document.getElementById("label-appearance-preview")!.textContent =
    strings.settings.appearancePreview;
  document.getElementById("label-stealth")!.textContent = strings.settings.stealth;
  document.getElementById("label-connect")!.textContent = strings.settings.connect;
  document.getElementById("label-startup")!.textContent = strings.settings.startup;
  document.getElementById("label-autostart")!.textContent = strings.settings.autostart;
  document.getElementById("autostart-note")!.textContent = strings.settings.autostartNote;
  document.getElementById("label-launch-with-tools")!.textContent =
    strings.settings.launchWithTools;
  document.getElementById("launch-with-tools-note")!.textContent =
    strings.settings.launchWithToolsNote;
  document.getElementById("btn-cancel")!.textContent = strings.settings.cancel;
  document.getElementById("btn-save")!.textContent = strings.settings.save;
  document.getElementById("stealth-note")!.textContent = strings.settings.stealthNote;
  document.getElementById("label-sounds")!.textContent = strings.settings.sounds;
  document.getElementById("label-sounds-enabled")!.textContent = strings.settings.soundsEnabled;
  document.getElementById("sounds-note")!.textContent = strings.settings.soundsNote;
  document.getElementById("label-sound-green")!.textContent = strings.settings.soundGreen;
  document.getElementById("label-sound-yellow")!.textContent = strings.settings.soundYellow;
  document.getElementById("label-sound-red")!.textContent = strings.settings.soundRed;
  document.getElementById("connect-cursor")!.textContent = strings.tools.cursor;
  document.getElementById("connect-claude")!.textContent = strings.tools.claude;
  document.getElementById("connect-codex")!.textContent = strings.tools.codex;
  document.getElementById("connect-gemini")!.textContent = strings.tools.gemini;
  document.getElementById("connect-copilot")!.textContent = strings.tools.copilot;
  document.getElementById("connect-all")!.textContent = strings.tools.all;
  document.getElementById("label-onboarding")!.textContent = strings.settings.onboarding;
  document.getElementById("onboarding-note")!.textContent = strings.settings.onboardingNote;
  document.getElementById("btn-restart-onboarding")!.textContent = strings.settings.redoOnboarding;
  document.getElementById("about-title")!.textContent = strings.about.title;
  document.getElementById("about-description")!.textContent = strings.about.description;
  document.getElementById("about-meta")!.textContent =
    `${strings.about.version} ${appVersion} · ${strings.about.author} ${strings.about.authorName} · ${strings.about.license}`;
  document.getElementById("about-contribute")!.textContent = strings.about.contribute;
  document.getElementById("about-controls-title")!.textContent = strings.about.controlsTitle;
  document.getElementById("about-tray-title")!.textContent = strings.about.trayTitle;
  renderAboutLinks(strings.about);

  for (const option of document.querySelectorAll<HTMLButtonElement>(".size-option .visual-option-label")) {
    const size = option.closest<HTMLButtonElement>(".size-option")?.dataset.value as WindowSize;
    if (size === "small") option.textContent = strings.settings.sizeSmall;
    if (size === "medium") option.textContent = strings.settings.sizeMedium;
    if (size === "large") option.textContent = strings.settings.sizeLarge;
  }

  for (const stage of STAGES) {
    const browseBtn = document.getElementById(`sound-${stage}-browse`) as HTMLButtonElement;
    const previewBtn = document.getElementById(`sound-${stage}-preview`) as HTMLButtonElement;
    const customOption = document.querySelector(
      `#sound-${stage}-preset option[value="custom"]`,
    ) as HTMLOptionElement;
    browseBtn.textContent = strings.settings.soundBrowse;
    previewBtn.textContent = strings.settings.soundPreview;
    customOption.textContent = strings.settings.soundCustom;
    updateStageUi(stage);
  }

  const lightsList = document.getElementById("about-lights")!;
  lightsList.innerHTML = "";
  for (const item of strings.about.lights) {
    const li = document.createElement("li");
    li.textContent = item;
    lightsList.appendChild(li);
  }

  const controlsList = document.getElementById("about-controls")!;
  controlsList.innerHTML = "";
  for (const item of strings.about.controls) {
    const li = document.createElement("li");
    li.textContent = item;
    controlsList.appendChild(li);
  }

  const trayList = document.getElementById("about-tray")!;
  trayList.innerHTML = "";
  for (const item of strings.about.trayMenu) {
    const li = document.createElement("li");
    li.textContent = item;
    trayList.appendChild(li);
  }

  void refreshToolStatus();
}

function populateStageSound(stage: Light, sound: StageSound): void {
  const presetSelect = document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement;
  if (sound.custom_path) {
    customPaths[stage] = sound.custom_path;
    presetSelect.value = "custom";
  } else {
    customPaths[stage] = null;
    presetSelect.value = sound.preset;
  }
  updateStageUi(stage);
}

async function loadConfig(): Promise<Config> {
  const config = await invoke<Config>("get_config");
  selectedTheme = config.theme;
  selectedSize = config.window.size || "medium";
  applyTheme(config.theme);
  applyLocale((config.locale as Locale) || "en");
  getThemeInput().value = config.theme;
  getSizeInput().value = selectedSize;
  (document.getElementById("stealth-checkbox") as HTMLInputElement).checked = config.stealth;
  (document.getElementById("autostart-checkbox") as HTMLInputElement).checked =
    config.autostart ?? false;
  (document.getElementById("launch-with-tools-checkbox") as HTMLInputElement).checked =
    config.launch_with_tools ?? false;
  (document.getElementById("sounds-enabled-checkbox") as HTMLInputElement).checked =
    config.sounds?.enabled ?? false;
  populateStageSound("green", config.sounds?.green ?? { preset: "soft-chime", custom_path: null });
  populateStageSound("yellow", config.sounds?.yellow ?? { preset: "double-ping", custom_path: null });
  populateStageSound("red", config.sounds?.red ?? { preset: "alert", custom_path: null });

  initAppearancePickers();
  return config;
}

async function maybeAcknowledgeStealth(config: Config): Promise<Config> {
  const checkbox = document.getElementById("stealth-checkbox") as HTMLInputElement;
  if (!checkbox.checked || config.stealth_acknowledged) {
    return config;
  }
  const strings = t(currentLocale);
  const ok = confirm(strings.settings.stealthNote);
  if (!ok) {
    checkbox.checked = false;
    config.stealth = false;
    return config;
  }
  config.stealth_acknowledged = true;
  return config;
}

function readSoundsFromForm(): Config["sounds"] {
  return {
    enabled: (document.getElementById("sounds-enabled-checkbox") as HTMLInputElement).checked,
    green: stageSound("green"),
    yellow: stageSound("yellow"),
    red: stageSound("red"),
  };
}

async function saveConfigFromForm(): Promise<void> {
  if (!validateSounds()) {
    return;
  }
  let config = await invoke<Config>("get_config");
  config.theme = getThemeInput().value;
  config.locale = (document.getElementById("locale-select") as HTMLSelectElement).value;
  config.window.size = getSizeInput().value;
  config.stealth = (document.getElementById("stealth-checkbox") as HTMLInputElement).checked;
  config.autostart = (document.getElementById("autostart-checkbox") as HTMLInputElement).checked;
  config.launch_with_tools = (
    document.getElementById("launch-with-tools-checkbox") as HTMLInputElement
  ).checked;
  config.sounds = readSoundsFromForm();
  config = await maybeAcknowledgeStealth(config);
  await invoke("save_config", { config });
  await invoke("set_autostart", { enabled: config.autostart });
  await invoke("sync_launch_hooks");
  applyTheme(config.theme);
  applyLocale(config.locale as Locale);
  await invoke("set_stealth", { enabled: config.stealth });
  await invoke("apply_window_size", {
    size: config.window.size,
    horizontal: config.window.horizontal ?? false,
  });
  await emit("config-changed", config);
}

async function browseCustomSound(stage: Light): Promise<void> {
  const strings = t(currentLocale);
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Audio",
        extensions: ["mp3", "wav", "ogg", "m4a", "aac", "webm"],
      },
    ],
  });

  if (!selected || Array.isArray(selected)) {
    return;
  }

  try {
    const destPath = await invoke<string>("import_stage_sound", {
      stage,
      sourcePath: selected,
    });
    customPaths[stage] = destPath;
    const presetSelect = document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement;
    presetSelect.value = "custom";
    updateStageUi(stage);
  } catch (err) {
    const message = String(err);
    if (message.includes("too large")) {
      alert(strings.settings.soundTooLarge);
    } else {
      alert(strings.settings.soundImportFailed);
    }
  }
}

async function connectTool(tool: string): Promise<void> {
  const strings = t(currentLocale);
  try {
    await invoke("install_hooks", { tool });
    alert(strings.tools.connected);
    await refreshToolStatus();
  } catch {
    alert(strings.tools.failed);
  }
}

async function hideSettings(): Promise<void> {
  await getCurrentWindow().hide();
}

window.addEventListener("DOMContentLoaded", async () => {
  const window = getCurrentWindow();

  try {
    appVersion = await getVersion();
  } catch {
    appVersion = "0.2.1";
  }

  await window.onCloseRequested(async (event) => {
    event.preventDefault();
    await hideSettings();
  });

  await window.onFocusChanged(async ({ payload: focused }) => {
    if (focused) {
      await loadConfig();
    }
  });

  await loadConfig();

  document.getElementById("locale-select")?.addEventListener("change", (e) => {
    applyLocale((e.target as HTMLSelectElement).value as Locale);
  });

  document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveConfigFromForm();
    await hideSettings();
  });

  document.getElementById("btn-cancel")?.addEventListener("click", () => {
    void hideSettings();
  });

  for (const stage of STAGES) {
    document.getElementById(`sound-${stage}-preset`)?.addEventListener("change", () => {
      if ((document.getElementById(`sound-${stage}-preset`) as HTMLSelectElement).value !== "custom") {
        customPaths[stage] = null;
      }
      updateStageUi(stage);
    });

    document.getElementById(`sound-${stage}-browse`)?.addEventListener("click", () => {
      void browseCustomSound(stage);
    });

    document.getElementById(`sound-${stage}-preview`)?.addEventListener("click", () => {
      void previewStageSound(stage, stageSound(stage));
    });
  }

  document.getElementById("connect-cursor")?.addEventListener("click", () => connectTool("cursor"));
  document.getElementById("connect-claude")?.addEventListener("click", () => connectTool("claude-code"));
  document.getElementById("connect-codex")?.addEventListener("click", () => connectTool("codex"));
  document.getElementById("connect-gemini")?.addEventListener("click", () => connectTool("gemini-cli"));
  document.getElementById("connect-copilot")?.addEventListener("click", () => connectTool("copilot-cli"));
  document.getElementById("connect-all")?.addEventListener("click", () => connectTool("all"));

  document.getElementById("btn-restart-onboarding")?.addEventListener("click", () => {
    void invoke("restart_onboarding");
  });
});
