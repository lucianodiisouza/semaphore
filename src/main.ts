import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { applyTheme } from "./themes";
import { t, type Locale } from "./i18n";
import { playStageSound, playTestLightsMelody } from "./sounds";
import {
  pointerDistance,
  shouldOpenSettingsOnDoubleClick,
} from "./interaction";
import { applyWindowSize, applyWindowOrientation } from "./window-size";
import { runGeniusGame } from "./genius";
import {
  isAwaitingInputMode,
  setAwaitingInputMode,
} from "./awaiting-input";
import type { Config, Light, StatePayload } from "./types";

let currentLight: Light = "green";
let currentConfig: Config | null = null;
let gamingMode = false;
let geniusRunning = false;

let dragStartX = 0;
let dragStartY = 0;
let dragMovedPx = 0;
let isDragging = false;

function setActiveLight(state: Light): void {
  document.querySelectorAll<HTMLElement>("[data-light]").forEach((el) => {
    const light = el.dataset.light as Light;
    el.classList.toggle("active", light === state);
  });
}

function applyMainLocale(locale: Locale): void {
  const strings = t(locale);
  const housing = document.querySelector(".housing") as HTMLElement | null;
  if (housing) {
    housing.title = strings.main.dragHint;
  }
}

async function applyConfigToUi(config: Config): Promise<void> {
  currentConfig = config;
  applyTheme(config.theme);
  applyMainLocale((config.locale as Locale) || "en");
  applyWindowSize(config.window.size);
  applyWindowOrientation(config.window.horizontal ?? false);
  await invoke("apply_window_size", {
    size: config.window.size,
    horizontal: config.window.horizontal ?? false,
  });
}

async function loadConfig(): Promise<Config> {
  const config = await invoke<Config>("get_config");
  await applyConfigToUi(config);
  return config;
}

function handleStateChange(payload: StatePayload): void {
  if (gamingMode) {
    return;
  }

  const { state, awaiting_input: awaitingInput = false } = payload;

  if (awaitingInput && state === "green") {
    const entering = !isAwaitingInputMode();
    currentLight = state;
    const sounds = currentConfig?.sounds;
    const awaitingSound =
      sounds?.enabled && sounds.awaiting_input ? sounds.awaiting_input : null;
    setAwaitingInputMode(true, entering ? awaitingSound : null);
    return;
  }

  const wasAwaitingInput = isAwaitingInputMode();
  setAwaitingInputMode(false);

  if (state === currentLight && !wasAwaitingInput) {
    return;
  }

  currentLight = state;
  setActiveLight(state);

  const sounds = currentConfig?.sounds;
  if (!sounds?.enabled) {
    return;
  }

  const stageSound = sounds[state];
  if (stageSound) {
    void playStageSound(state, stageSound);
  }
}

function setupDragAndSettings(): void {
  const housing = document.querySelector(".housing") as HTMLElement | null;
  if (!housing) {
    return;
  }

  housing.addEventListener("mousedown", async (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragMovedPx = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    e.preventDefault();
    await getCurrentWindow().startDragging();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    dragMovedPx = Math.max(
      dragMovedPx,
      pointerDistance(dragStartX, dragStartY, e.clientX, e.clientY),
    );
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  housing.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (shouldOpenSettingsOnDoubleClick(dragMovedPx)) {
      void invoke("show_settings");
    }
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  setActiveLight("green");
  setupDragAndSettings();

  await listen<StatePayload>("state-changed", (event) => {
    handleStateChange(event.payload);
  });

  await listen<StatePayload>("light-preview", (event) => {
    const { state, awaiting_input: awaitingInput = false } = event.payload;

    if (awaitingInput && state === "green") {
      const sounds = currentConfig?.sounds;
      const awaitingSound =
        sounds?.enabled && sounds.awaiting_input ? sounds.awaiting_input : null;
      setAwaitingInputMode(true, awaitingSound);
      return;
    }

    setAwaitingInputMode(false);
    setActiveLight(state);
  });

  await listen("test-lights-start", () => {
    playTestLightsMelody();
  });

  await listen<{ state: Light }>("genius-game-start", async () => {
    if (geniusRunning) {
      return;
    }

    geniusRunning = true;
    gamingMode = true;
    const locale = (currentConfig?.locale as Locale) || "en";
    const strings = t(locale);

    try {
      await runGeniusGame(strings.main.dragHint, {
        round: strings.main.geniusRound,
        nice: strings.main.geniusNice,
        gameOver: strings.main.geniusGameOver,
      });
    } finally {
      gamingMode = false;
      geniusRunning = false;
    }
  });

  await listen<Config>("config-changed", async (event) => {
    await applyConfigToUi(event.payload);
  });

  const window = getCurrentWindow();
  window.onMoved(async () => {
    const pos = await window.outerPosition();
    const config = await invoke<Config>("get_config");
    config.window = { ...config.window, x: pos.x, y: pos.y };
    await invoke("save_config", { config });
  });
});
