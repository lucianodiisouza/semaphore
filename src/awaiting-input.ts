import { playAwaitingInputBlink, stopAwaitingInputBlink } from "./sounds";
import type { StageSound } from "./types";

/** Matches `.housing.awaiting-input .light { animation: awaiting-pulse 1.2s ... }` */
export const AWAITING_INPUT_BLINK_MS = 1200;

let blinkSoundTimer: ReturnType<typeof setTimeout> | null = null;

function stopAwaitingInputBlinkSound(): void {
  if (blinkSoundTimer !== null) {
    clearTimeout(blinkSoundTimer);
    blinkSoundTimer = null;
  }
  stopAwaitingInputBlink();
}

function startAwaitingInputBlinkSound(sound: StageSound): void {
  stopAwaitingInputBlinkSound();

  const playAtPeak = () => {
    void playAwaitingInputBlink(sound);
    blinkSoundTimer = setTimeout(playAtPeak, AWAITING_INPUT_BLINK_MS);
  };

  // awaiting-pulse peaks at 50% of the cycle
  blinkSoundTimer = setTimeout(playAtPeak, AWAITING_INPUT_BLINK_MS / 2);
}

export function setAwaitingInputMode(active: boolean, sound?: StageSound | null): void {
  const housing = document.querySelector(".housing");
  if (!housing) {
    return;
  }

  housing.classList.toggle("awaiting-input", active);

  if (active) {
    document.querySelectorAll<HTMLElement>("[data-light]").forEach((el) => {
      el.classList.remove("active");
    });
    if (sound) {
      startAwaitingInputBlinkSound(sound);
    }
    return;
  }

  stopAwaitingInputBlinkSound();
}

export function isAwaitingInputMode(): boolean {
  return document.querySelector(".housing")?.classList.contains("awaiting-input") ?? false;
}
