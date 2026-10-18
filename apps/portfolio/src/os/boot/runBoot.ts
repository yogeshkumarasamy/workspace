import { buildBootCues } from "./lines";
import { shouldSkipBoot, type BootEnvironment } from "./environment";

export interface RunBootOptions {
  env: BootEnvironment;
  schedule: (fn: () => void, ms: number) => unknown;
  cancelTimer: (id: unknown) => void;
  onText: (text: string) => void;
  onDone: () => void;
  persist: () => void;
}

export interface BootRun {
  cancel: () => void;
  skip: () => void;
}

/**
 * Types the POST lines, or finishes on the next timer turn when the
 * environment says the boot must not be shown. `skip` ends a visible boot
 * and records the session. `cancel` drops timers without calling `onDone`
 * (effect cleanup, including Strict Mode's extra setup/cleanup pass).
 */
export function runBoot(options: RunBootOptions): BootRun {
  const ids: unknown[] = [];
  let settled = false;

  const clearAll = () => {
    for (const id of ids) options.cancelTimer(id);
    ids.length = 0;
  };

  const finish = (persist: boolean) => {
    if (settled) return;
    settled = true;
    clearAll();
    if (persist) options.persist();
    options.onDone();
  };

  if (shouldSkipBoot(options.env)) {
    ids.push(
      options.schedule(() => {
        finish(false);
      }, 0),
    );
  } else {
    for (const cue of buildBootCues()) {
      ids.push(
        options.schedule(() => {
          if (settled) return;
          options.onText(cue.text);
          if (cue.done) finish(true);
        }, cue.at),
      );
    }
  }

  return {
    cancel: () => {
      settled = true;
      clearAll();
    },
    skip: () => finish(true),
  };
}

export function bindBootInput(target: EventTarget, skip: () => void): () => void {
  const onSkip = () => {
    skip();
  };
  target.addEventListener("keydown", onSkip);
  target.addEventListener("pointerdown", onSkip);
  target.addEventListener("touchstart", onSkip);
  target.addEventListener("click", onSkip);
  return () => {
    target.removeEventListener("keydown", onSkip);
    target.removeEventListener("pointerdown", onSkip);
    target.removeEventListener("touchstart", onSkip);
    target.removeEventListener("click", onSkip);
  };
}
