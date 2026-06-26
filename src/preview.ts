import type { Light } from "./types";
import { applyThemeToElement, getTheme, themeNames } from "./themes";
import { WINDOW_SIZES, type WindowSize } from "./window-size";

const PREVIEW_LIGHTS: Light[] = ["red", "yellow", "green"];

export function createSemaphorePreview(activeLight: Light = "green"): HTMLElement {
  const housing = document.createElement("div");
  housing.className = "preview-housing";
  housing.setAttribute("aria-hidden", "true");

  for (const color of PREVIEW_LIGHTS) {
    const stack = document.createElement("div");
    stack.className = "preview-light-stack";

    const light = document.createElement("div");
    light.className = `preview-light ${color}`;
    if (color === activeLight) {
      light.classList.add("active");
    }

    stack.appendChild(light);
    housing.appendChild(stack);
  }

  return housing;
}

export function applyPreviewTheme(container: HTMLElement, themeName: string): void {
  applyThemeToElement(container, themeName);
}

export function applyPreviewSize(container: HTMLElement, size: string): void {
  const normalized = WINDOW_SIZES.includes(size as WindowSize) ? size : "medium";
  container.dataset.size = normalized;
}

export function updateLivePreview(
  container: HTMLElement,
  themeName: string,
  size: string,
): void {
  applyPreviewTheme(container, themeName);
  applyPreviewSize(container, size);
}

export function buildThemePicker(
  container: HTMLElement,
  selected: string,
  onChange: (theme: string) => void,
): void {
  container.innerHTML = "";
  container.setAttribute("role", "radiogroup");

  for (const id of themeNames) {
    const theme = getTheme(id);
    const option = document.createElement("button");
    option.type = "button";
    option.className = "visual-option theme-option";
    option.dataset.value = id;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(id === selected));
    option.setAttribute("aria-label", theme.name);
    if (id === selected) {
      option.classList.add("selected");
    }

    const previewWrap = document.createElement("div");
    previewWrap.className = "preview-wrap preview-wrap--theme";
    previewWrap.dataset.size = "small";
    const preview = createSemaphorePreview("green");
    applyPreviewTheme(previewWrap, id);
    previewWrap.appendChild(preview);

    const label = document.createElement("span");
    label.className = "visual-option-label";
    label.textContent = theme.name;

    option.appendChild(previewWrap);
    option.appendChild(label);

    option.addEventListener("click", () => {
      onChange(id);
      for (const btn of container.querySelectorAll<HTMLButtonElement>(".theme-option")) {
        const isSelected = btn.dataset.value === id;
        btn.classList.toggle("selected", isSelected);
        btn.setAttribute("aria-checked", String(isSelected));
      }
    });

    container.appendChild(option);
  }
}

export function buildSizePicker(
  container: HTMLElement,
  selected: string,
  themeName: string,
  labels: Record<WindowSize, string>,
  onChange: (size: string) => void,
): void {
  container.innerHTML = "";
  container.setAttribute("role", "radiogroup");

  for (const size of WINDOW_SIZES) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "visual-option size-option";
    option.dataset.value = size;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(size === selected));
    option.setAttribute("aria-label", labels[size]);
    if (size === selected) {
      option.classList.add("selected");
    }

    const previewWrap = document.createElement("div");
    previewWrap.className = "preview-wrap preview-wrap--size";
    previewWrap.dataset.size = size;
    const preview = createSemaphorePreview("green");
    applyPreviewTheme(previewWrap, themeName);
    previewWrap.appendChild(preview);

    const label = document.createElement("span");
    label.className = "visual-option-label";
    label.textContent = labels[size];

    option.appendChild(previewWrap);
    option.appendChild(label);

    option.addEventListener("click", () => {
      onChange(size);
      for (const btn of container.querySelectorAll<HTMLButtonElement>(".size-option")) {
        const isSelected = btn.dataset.value === size;
        btn.classList.toggle("selected", isSelected);
        btn.setAttribute("aria-checked", String(isSelected));
      }
    });

    container.appendChild(option);
  }
}

export function refreshSizePickerTheme(
  container: HTMLElement,
  themeName: string,
): void {
  for (const wrap of container.querySelectorAll<HTMLElement>(".preview-wrap")) {
    applyPreviewTheme(wrap, themeName);
  }
}
