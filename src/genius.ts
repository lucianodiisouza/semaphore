import { invoke } from "@tauri-apps/api/core";
import { playGeniusGameOverMelody, playGeniusTone } from "./sounds";
import type { Light } from "./types";

const LIGHTS: Light[] = ["green", "yellow", "red"];
const FLASH_MS = 420;
const GAP_MS = 180;
const INPUT_FLASH_MS = 280;
const ROUND_PAUSE_MS = 600;

function randomLight(): Light {
  return LIGHTS[Math.floor(Math.random() * LIGHTS.length)]!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setActiveLight(state: Light | null): void {
  document.querySelectorAll<HTMLElement>("[data-light]").forEach((el) => {
    const light = el.dataset.light as Light;
    el.classList.toggle("active", state !== null && light === state);
  });
}

function setGamingMode(enabled: boolean): void {
  document.querySelector(".housing")?.classList.toggle("gaming", enabled);
}

function setHousingTitle(title: string): void {
  const housing = document.querySelector(".housing") as HTMLElement | null;
  if (housing) {
    housing.title = title;
  }
}

async function flashLight(light: Light, duration = FLASH_MS): Promise<void> {
  await invoke("genius_preview_light", { state: light });
  setActiveLight(light);
  playGeniusTone(light);
  await sleep(duration);
}

function waitForInput(sequence: Light[]): Promise<boolean> {
  return new Promise((resolve) => {
    let index = 0;
    let locked = false;
    const lights = document.querySelectorAll<HTMLElement>("[data-light]");

    const stopDrag = (e: Event) => {
      e.stopPropagation();
    };

    const onLightClick = async (e: Event) => {
      if (locked) {
        return;
      }

      const target = e.currentTarget as HTMLElement;
      const light = target.dataset.light as Light;

      locked = true;
      await flashLight(light, INPUT_FLASH_MS);
      setActiveLight(null);
      locked = false;

      if (light !== sequence[index]) {
        cleanup();
        resolve(false);
        return;
      }

      index += 1;
      if (index >= sequence.length) {
        cleanup();
        resolve(true);
      }
    };

    const cleanup = () => {
      lights.forEach((el) => {
        el.removeEventListener("mousedown", stopDrag);
        el.removeEventListener("click", onLightClick);
      });
    };

    lights.forEach((el) => {
      el.addEventListener("mousedown", stopDrag);
      el.addEventListener("click", onLightClick);
    });
  });
}

export async function runGeniusGame(
  dragHint: string,
  strings: { round: (n: number) => string; nice: (n: number) => string; gameOver: (n: number) => string },
): Promise<void> {
  setGamingMode(true);
  const sequence: Light[] = [];
  let round = 0;

  try {
    while (true) {
      round += 1;
      sequence.push(randomLight());

      setHousingTitle(strings.round(round));
      await sleep(ROUND_PAUSE_MS);

      for (const light of sequence) {
        await flashLight(light);
        setActiveLight(null);
        await sleep(GAP_MS);
      }

      const inputOk = await waitForInput(sequence);
      if (!inputOk) {
        setHousingTitle(strings.gameOver(round - 1));
        playGeniusGameOverMelody();
        await sleep(1200);
        break;
      }

      setHousingTitle(strings.nice(round));
      await sleep(400);
    }
  } finally {
    setGamingMode(false);
    setActiveLight(null);
    setHousingTitle(dragHint);

    const restored = await invoke<string>("end_genius_game");
    setActiveLight(restored as Light);
  }
}
