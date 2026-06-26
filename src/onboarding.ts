import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { t, type Locale } from "./i18n";
import type { Config, ToolStatus } from "./types";

const STEPS = ["welcome", "tools", "streamdeck", "done"] as const;
type Step = (typeof STEPS)[number];

let currentStep: Step = "welcome";
let currentLocale: Locale = "en";
let detectedTools: ToolStatus[] = [];
let streamDeckDetected = false;

function showStep(step: Step): void {
  currentStep = step;
  for (const id of STEPS) {
    const el = document.getElementById(`step-${id}`);
    el?.classList.toggle("active", id === step);
  }

  const backBtn = document.getElementById("btn-back") as HTMLButtonElement;
  const nextBtn = document.getElementById("btn-next") as HTMLButtonElement;
  const skipBtn = document.getElementById("btn-skip") as HTMLButtonElement;
  const strings = t(currentLocale);

  backBtn.hidden = step === "welcome";
  skipBtn.hidden = step === "done";

  if (step === "streamdeck") {
    void loadStreamDeck();
  }

  if (step === "done") {
    nextBtn.textContent = strings.onboarding.finish;
  } else {
    nextBtn.textContent = strings.onboarding.next;
  }
}

function applyLocale(locale: Locale): void {
  currentLocale = locale;
  const strings = t(locale);

  document.getElementById("onboarding-title")!.textContent = strings.onboarding.title;
  document.getElementById("welcome-title")!.textContent = strings.onboarding.welcomeTitle;
  document.getElementById("welcome-body")!.textContent = strings.onboarding.welcomeBody;
  document.getElementById("lights-title")!.textContent = strings.onboarding.lightsTitle;
  document.getElementById("tools-title")!.textContent = strings.onboarding.toolsTitle;
  document.getElementById("tools-body")!.textContent = strings.onboarding.toolsBody;
  document.getElementById("tools-empty")!.textContent = strings.onboarding.toolsEmpty;
  document.getElementById("streamdeck-title")!.textContent = strings.onboarding.streamdeckTitle;
  document.getElementById("streamdeck-body")!.textContent = strings.onboarding.streamdeckBody;
  document.getElementById("streamdeck-label")!.textContent = strings.onboarding.streamdeckLabel;
  document.getElementById("streamdeck-note")!.textContent = strings.onboarding.streamdeckNote;
  document.getElementById("done-title")!.textContent = strings.onboarding.doneTitle;
  document.getElementById("done-body")!.textContent = strings.onboarding.doneBody;
  document.getElementById("btn-connect-selected")!.textContent =
    strings.onboarding.connectSelected;
  document.getElementById("btn-skip")!.textContent = strings.onboarding.skip;
  document.getElementById("btn-back")!.textContent = strings.onboarding.back;

  const lightsList = document.getElementById("lights-list")!;
  lightsList.innerHTML = "";
  const colors: Array<"green" | "yellow" | "red"> = ["green", "yellow", "red"];
  strings.about.lights.forEach((text, i) => {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = `light-dot ${colors[i]}`;
    const label = document.createElement("span");
    label.textContent = text;
    li.appendChild(dot);
    li.appendChild(label);
    lightsList.appendChild(li);
  });

  renderToolsList();
  showStep(currentStep);
}

function renderToolsList(): void {
  const list = document.getElementById("tools-list")!;
  const emptyNote = document.getElementById("tools-empty") as HTMLParagraphElement;
  const connectBtn = document.getElementById("btn-connect-selected") as HTMLButtonElement;

  list.innerHTML = "";
  const installable = detectedTools.filter((t) => t.installed && !t.connected);

  emptyNote.hidden = installable.length > 0;
  connectBtn.hidden = installable.length === 0;

  for (const tool of detectedTools.filter((t) => t.installed)) {
    const item = document.createElement("label");
    item.className = `tool-item${tool.connected ? " connected" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = tool.id;
    checkbox.checked = !tool.connected;
    checkbox.disabled = tool.connected;

    const label = document.createElement("span");
    label.textContent = tool.connected ? `${tool.name} ✓` : tool.name;

    item.appendChild(checkbox);
    item.appendChild(label);
    list.appendChild(item);
  }
}

async function loadTools(): Promise<void> {
  try {
    detectedTools = await invoke<ToolStatus[]>("detect_tools");
  } catch {
    detectedTools = [];
  }
  renderToolsList();
}

async function loadStreamDeck(): Promise<void> {
  try {
    streamDeckDetected = await invoke<boolean>("detect_stream_deck");
  } catch {
    streamDeckDetected = false;
  }

  const checkbox = document.getElementById("streamdeck-checkbox") as HTMLInputElement;
  const note = document.getElementById("streamdeck-note") as HTMLParagraphElement;

  checkbox.checked = false; // always unchecked by default
  checkbox.disabled = !streamDeckDetected;
  note.hidden = streamDeckDetected;
}

async function connectSelected(): Promise<void> {
  const strings = t(currentLocale);
  const connectBtn = document.getElementById("btn-connect-selected") as HTMLButtonElement;
  const checkboxes = document.querySelectorAll<HTMLInputElement>(
    "#tools-list input[type=checkbox]:checked:not(:disabled)",
  );

  if (checkboxes.length === 0) return;

  connectBtn.disabled = true;
  connectBtn.textContent = strings.onboarding.connecting;

  for (const checkbox of checkboxes) {
    try {
      await invoke("install_hooks", { tool: checkbox.value });
    } catch {
      // continue with remaining tools
    }
  }

  await loadTools();
  connectBtn.disabled = false;
  connectBtn.textContent = strings.onboarding.connectSelected;
}

async function finishOnboarding(): Promise<void> {
  await invoke("complete_onboarding");
  await getCurrentWindow().hide();
}

async function skipOnboarding(): Promise<void> {
  await finishOnboarding();
}

function nextStep(): void {
  if (currentStep === "welcome") {
    showStep("tools");
  } else if (currentStep === "tools") {
    showStep("streamdeck");
  } else if (currentStep === "streamdeck") {
    void installStreamDeckIfChecked().then(() => showStep("done"));
  } else {
    void finishOnboarding();
  }
}

async function installStreamDeckIfChecked(): Promise<void> {
  const checkbox = document.getElementById("streamdeck-checkbox") as HTMLInputElement;
  if (!checkbox.checked) return;

  const strings = t(currentLocale);
  const nextBtn = document.getElementById("btn-next") as HTMLButtonElement;
  const doneNote = document.getElementById("streamdeck-done-note") as HTMLParagraphElement;

  nextBtn.disabled = true;
  nextBtn.textContent = strings.onboarding.streamdeckInstalling;

  try {
    await invoke("install_stream_deck");
    doneNote.textContent = strings.onboarding.streamdeckDone;
    doneNote.hidden = false;
  } catch {
    // Non-fatal: continue to done step even if install fails
  } finally {
    nextBtn.disabled = false;
    nextBtn.textContent = strings.onboarding.next;
  }
}

function prevStep(): void {
  if (currentStep === "tools") {
    showStep("welcome");
  } else if (currentStep === "streamdeck") {
    showStep("tools");
  } else if (currentStep === "done") {
    showStep("streamdeck");
  }
}

async function resetOnboarding(): Promise<void> {
  const config = await invoke<Config>("get_config");
  applyLocale((config.locale as Locale) || "en");
  await loadTools();
  streamDeckDetected = false;
  const doneNote = document.getElementById("streamdeck-done-note") as HTMLParagraphElement;
  if (doneNote) doneNote.hidden = true;
  showStep("welcome");
}

window.addEventListener("DOMContentLoaded", async () => {
  await resetOnboarding();

  await listen("onboarding-restart", () => {
    void resetOnboarding();
  });

  document.getElementById("btn-next")?.addEventListener("click", nextStep);
  document.getElementById("btn-back")?.addEventListener("click", prevStep);
  document.getElementById("btn-skip")?.addEventListener("click", () => {
    void skipOnboarding();
  });
  document.getElementById("btn-connect-selected")?.addEventListener("click", () => {
    void connectSelected();
  });
});
