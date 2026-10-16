import { createElement, useEffect, useRef, useState } from "react";
import {
  readBootEnvironment,
  sessionStorageFromPage,
  persistBooted,
  shouldSkipBoot,
} from "./environment";
import { bindBootInput, runBoot, type BootRun } from "./runBoot";

export interface BootScreenProps {
  onDone: () => void;
}

function pageTarget(): EventTarget | null {
  const current = (globalThis as { window?: EventTarget }).window;
  return current ?? null;
}

export function BootScreen({ onDone }: BootScreenProps) {
  const envRef = useRef(readBootEnvironment());
  const onDoneRef = useRef(onDone);
  const handleRef = useRef<BootRun | null>(null);
  // Set when Skip is activated before the effect has stored the run handle.
  const skipRequestedRef = useRef(false);
  const [text, setText] = useState("");
  const skipping = shouldSkipBoot(envRef.current);

  onDoneRef.current = onDone;

  useEffect(() => {
    const handle = runBoot({
      env: envRef.current,
      schedule: (fn, ms) => globalThis.setTimeout(fn, ms),
      cancelTimer: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
      onText: setText,
      onDone: () => onDoneRef.current(),
      persist: () => persistBooted(sessionStorageFromPage()),
    });
    handleRef.current = handle;

    if (skipRequestedRef.current) {
      handle.skip();
      return () => {
        handle.cancel();
      };
    }

    if (skipping) {
      return () => {
        handle.cancel();
      };
    }

    const target = pageTarget();
    const unbind = target
      ? bindBootInput(target, () => {
          skipRequestedRef.current = true;
          handle.skip();
        })
      : () => {};
    return () => {
      handle.cancel();
      unbind();
    };
  }, [skipping]);

  if (skipping) return null;

  const skip = () => {
    skipRequestedRef.current = true;
    handleRef.current?.skip();
  };

  return createElement(
    "div",
    {
      className: "yk-boot",
      "aria-live": "off",
      onClick: skip,
    },
    createElement(
      "pre",
      {
        className: "yk-boot-log",
        "aria-hidden": true,
        "aria-live": "off",
      },
      text.length > 0 ? `${text}\u2588` : "",
    ),
    createElement(
      "p",
      { className: "yk-boot-hint" },
      "Press any key, click, or tap to skip.",
    ),
    createElement(
      "button",
      {
        type: "button",
        className: "yk-boot-skip",
        onClick: skip,
      },
      "Skip",
    ),
  );
}
