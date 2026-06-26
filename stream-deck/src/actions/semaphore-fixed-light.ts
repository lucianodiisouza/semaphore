import { action, SingletonAction } from "@elgato/streamdeck";
import type { WillAppearEvent, WillDisappearEvent, KeyAction } from "@elgato/streamdeck";
import { statePoller } from "../state-poller.js";
import type { LightState } from "../ipc.js";

abstract class SemaphoreFixedLight extends SingletonAction {
  protected abstract readonly targetState: LightState;
  protected abstract readonly litImage: string;

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
    const img = state === this.targetState ? this.litImage : "unknown";
    await ctx.setImage(`imgs/${img}.png`).catch(() => {
      // Action context may have been removed between poll and apply
    });
  }
}

@action({ UUID: "com.semaphore.streamdeck.green" })
export class SemaphoreGreen extends SemaphoreFixedLight {
  protected override readonly targetState = "green";
  protected override readonly litImage = "green";
}

@action({ UUID: "com.semaphore.streamdeck.yellow" })
export class SemaphoreYellow extends SemaphoreFixedLight {
  protected override readonly targetState = "yellow";
  protected override readonly litImage = "yellow";
}

@action({ UUID: "com.semaphore.streamdeck.red" })
export class SemaphoreRed extends SemaphoreFixedLight {
  protected override readonly targetState = "red";
  protected override readonly litImage = "red";
}
