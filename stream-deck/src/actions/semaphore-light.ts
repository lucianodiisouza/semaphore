import { action, SingletonAction } from "@elgato/streamdeck";
import type { WillAppearEvent, WillDisappearEvent, KeyAction } from "@elgato/streamdeck";
import { statePoller } from "../state-poller.js";
import type { LightState } from "../ipc.js";

const VALID_STATES: ReadonlySet<string> = new Set(["green", "yellow", "red"]);

@action({ UUID: "com.semaphore.streamdeck.light" })
export class SemaphoreLight extends SingletonAction {
  readonly #unsubscribeByContext = new Map<string, () => void>();

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    const ctx = ev.action as KeyAction;

    const unsubscribe = statePoller.subscribe((state) => {
      void this.#applyImage(ctx, state);
    });
    this.#unsubscribeByContext.set(ctx.id, unsubscribe);
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    this.#unsubscribeByContext.get(ev.action.id)?.();
    this.#unsubscribeByContext.delete(ev.action.id);
  }

  async #applyImage(ctx: KeyAction, state: LightState): Promise<void> {
    const img = VALID_STATES.has(state) ? state : "unknown";
    await ctx.setImage(`imgs/${img}.png`).catch(() => {
      // Action context may have been removed between poll and apply
    });
  }
}
