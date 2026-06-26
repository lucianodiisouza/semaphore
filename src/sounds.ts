import { convertFileSrc } from "@tauri-apps/api/core";
import type { Light, StageSound } from "./types";

const MAX_CUSTOM_DURATION_SECS = 3;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function resumeContext(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume = 0.15,
  type: OscillatorType = "sine",
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playPreset(preset: string): void {
  const ctx = getAudioContext();
  resumeContext(ctx);
  const t0 = ctx.currentTime;

  switch (preset) {
    case "soft-chime":
      playTone(ctx, 523.25, t0, 0.25, 0.12);
      playTone(ctx, 659.25, t0 + 0.12, 0.3, 0.1);
      break;
    case "double-ping":
      playTone(ctx, 880, t0, 0.08, 0.14);
      playTone(ctx, 880, t0 + 0.14, 0.08, 0.12);
      break;
    case "alert":
      playTone(ctx, 440, t0, 0.12, 0.1, "square");
      playTone(ctx, 330, t0 + 0.1, 0.15, 0.08, "square");
      break;
    case "chime":
      playTone(ctx, 523.25, t0, 0.2, 0.1);
      playTone(ctx, 659.25, t0 + 0.08, 0.2, 0.09);
      playTone(ctx, 783.99, t0 + 0.16, 0.25, 0.08);
      break;
    case "bell":
      playTone(ctx, 880, t0, 0.35, 0.1);
      playTone(ctx, 1320, t0, 0.3, 0.04);
      break;
    case "ping":
      playTone(ctx, 1000, t0, 0.1, 0.14);
      break;
    case "pop":
      playTone(ctx, 200, t0, 0.06, 0.18, "triangle");
      break;
    case "attention-chime":
      playTone(ctx, 740, t0, 0.1, 0.13);
      playTone(ctx, 988, t0 + 0.11, 0.12, 0.12);
      playTone(ctx, 1174.66, t0 + 0.22, 0.22, 0.11);
      break;
    default:
      playTone(ctx, 660, t0, 0.15, 0.12);
  }
}

async function playCustomFile(path: string): Promise<void> {
  const audio = new Audio(convertFileSrc(path));
  audio.volume = 0.7;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("failed to play audio"));
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (audio.duration > MAX_CUSTOM_DURATION_SECS) {
          cleanup();
          audio.pause();
          reject(new Error("audio too long"));
        }
      },
      { once: true },
    );

    void audio.play().catch(reject);
  });
}

export function playTestLightsMelody(): void {
  const ctx = getAudioContext();
  resumeContext(ctx);
  const t0 = ctx.currentTime;
  const step = 0.48;

  playTone(ctx, 523.25, t0, 0.22, 0.13);
  playTone(ctx, 659.25, t0 + step, 0.22, 0.13);
  playTone(ctx, 783.99, t0 + step * 2.0, 0.28, 0.14);
  playTone(ctx, 523.25, t0 + step * 2.85, 0.35, 0.1);
}

const GENIUS_TONE: Record<Light, number> = {
  green: 523.25,
  yellow: 659.25,
  red: 783.99,
};

export function playGeniusTone(light: Light): void {
  const ctx = getAudioContext();
  resumeContext(ctx);
  playTone(ctx, GENIUS_TONE[light], ctx.currentTime, 0.28, 0.14);
}

export function playGeniusGameOverMelody(): void {
  const ctx = getAudioContext();
  resumeContext(ctx);
  const t0 = ctx.currentTime;

  playTone(ctx, 392, t0, 0.2, 0.12);
  playTone(ctx, 349.23, t0 + 0.22, 0.2, 0.11);
  playTone(ctx, 293.66, t0 + 0.44, 0.35, 0.1);
}

export async function playStageSound(
  _stage: string,
  sound: StageSound,
): Promise<void> {
  if (sound.custom_path) {
    try {
      await playCustomFile(sound.custom_path);
    } catch {
      playPreset(sound.preset);
    }
    return;
  }
  playPreset(sound.preset);
}

export async function previewStageSound(stage: string, sound: StageSound): Promise<void> {
  await playStageSound(stage, sound);
}

let awaitingInputAudio: HTMLAudioElement | null = null;

export function stopAwaitingInputBlink(): void {
  if (!awaitingInputAudio) {
    return;
  }
  awaitingInputAudio.pause();
  awaitingInputAudio.currentTime = 0;
}

export async function playAwaitingInputBlink(sound: StageSound): Promise<void> {
  if (!sound.custom_path) {
    playPreset(sound.preset);
    return;
  }

  const src = convertFileSrc(sound.custom_path);
  if (!awaitingInputAudio) {
    awaitingInputAudio = new Audio(src);
    awaitingInputAudio.volume = 0.7;
  } else if (awaitingInputAudio.src !== src) {
    awaitingInputAudio.src = src;
  }

  awaitingInputAudio.currentTime = 0;
  try {
    await awaitingInputAudio.play();
  } catch {
    playPreset(sound.preset);
  }
}
