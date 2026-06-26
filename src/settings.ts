import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { applyTheme } from "./themes";
import { t, type Locale } from "./i18n";
import { previewStageSound } from "./sounds";
import type { Config, Light, StageSound } from "./types";

const STAGES: Light[] = ["green", "yellow", "red"];

let currentLocale: Locale = "en";
const customPaths: Record<Light, string | null> = {
  green: null,
  yellow: null,
  red: null,
};

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

function applyLocale(locale: Locale): void {
  currentLocale = locale;
  const strings = t(locale);
  document.getElementById("settings-title")!.textContent = strings.settings.title;
  document.getElementById("label-theme")!.textContent = strings.settings.theme;
  document.getElementById("label-language")!.textContent = strings.settings.language;
  document.getElementById("label-stealth")!.textContent = strings.settings.stealth;
  document.getElementById("label-connect")!.textContent = strings.settings.connect;
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
  document.getElementById("about-title")!.textContent = strings.about.title;
  document.getElementById("about-description")!.textContent = strings.about.description;
  document.getElementById("about-controls-title")!.textContent = strings.about.controlsTitle;
  document.getElementById("about-tray-title")!.textContent = strings.about.trayTitle;

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
  applyTheme(config.theme);
  applyLocale((config.locale as Locale) || "en");
  (document.getElementById("theme-select") as HTMLSelectElement).value = config.theme;
  (document.getElementById("locale-select") as HTMLSelectElement).value = config.locale;
  (document.getElementById("stealth-checkbox") as HTMLInputElement).checked = config.stealth;
  (document.getElementById("sounds-enabled-checkbox") as HTMLInputElement).checked =
    config.sounds?.enabled ?? false;
  populateStageSound("green", config.sounds?.green ?? { preset: "soft-chime", custom_path: null });
  populateStageSound("yellow", config.sounds?.yellow ?? { preset: "double-ping", custom_path: null });
  populateStageSound("red", config.sounds?.red ?? { preset: "alert", custom_path: null });
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
  config.theme = (document.getElementById("theme-select") as HTMLSelectElement).value;
  config.locale = (document.getElementById("locale-select") as HTMLSelectElement).value;
  config.stealth = (document.getElementById("stealth-checkbox") as HTMLInputElement).checked;
  config.sounds = readSoundsFromForm();
  config = await maybeAcknowledgeStealth(config);
  await invoke("save_config", { config });
  applyTheme(config.theme);
  applyLocale(config.locale as Locale);
  await invoke("set_stealth", { enabled: config.stealth });
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
  } catch {
    alert(strings.tools.failed);
  }
}

async function hideSettings(): Promise<void> {
  await getCurrentWindow().hide();
}

window.addEventListener("DOMContentLoaded", async () => {
  const window = getCurrentWindow();

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
});
