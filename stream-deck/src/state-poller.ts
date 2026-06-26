import { queryState, type LightState } from "./ipc.js";

const POLL_INTERVAL_MS = 500;

type Listener = (state: LightState) => void;

/** Shared IPC poller so multiple actions reuse one timer. */
class StatePoller {
  readonly #listeners = new Set<Listener>();
  #timer: ReturnType<typeof setInterval> | undefined;
  #lastState: LightState = "unknown";

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    listener(this.#lastState);

    if (this.#listeners.size === 1) {
      this.#start();
    }

    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size === 0) {
        this.#stop();
      }
    };
  }

  #start(): void {
    void this.#poll();
    this.#timer = setInterval(() => void this.#poll(), POLL_INTERVAL_MS);
  }

  #stop(): void {
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
    this.#lastState = "unknown";
  }

  async #poll(): Promise<void> {
    const state = await queryState();
    if (state === this.#lastState) return;

    this.#lastState = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}

export const statePoller = new StatePoller();
