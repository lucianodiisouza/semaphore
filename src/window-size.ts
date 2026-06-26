export type WindowSize = "small" | "medium" | "large";

export const WINDOW_SIZES: WindowSize[] = ["small", "medium", "large"];

export function applyWindowSize(size: string): WindowSize {
  const normalized = WINDOW_SIZES.includes(size as WindowSize)
    ? (size as WindowSize)
    : "medium";
  document.body.dataset.size = normalized;
  return normalized;
}

export function applyWindowOrientation(horizontal: boolean): void {
  document.body.dataset.orientation = horizontal ? "horizontal" : "vertical";
}
