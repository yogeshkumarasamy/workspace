import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { createRequire } from "node:module";
import { BootScreen } from "../BootScreen";
import {
  BOOT_STORAGE_KEY,
  persistBooted,
  readAlreadyBooted,
  readBootEnvironment,
  shouldSkipBoot,
} from "../environment";
import {
  BOOT_CHAR_MS,
  BOOT_LINE_GAP_MS,
  BOOT_LINES,
  BOOT_MAX_MS,
  bootDurationMs,
  buildBootCues,
} from "../lines";
import { bindBootInput, runBoot } from "../runBoot";
import { BootScreen as BootScreenFromIndex } from "../index";

interface FakeTimers {
  schedule: (fn: () => void, ms: number) => unknown;
  cancelTimer: (id: unknown) => void;
  tick: (ms: number) => void;
  pending: () => number;
}

function createFakeTimers(): FakeTimers {
  let now = 0;
  let nextId = 1;
  const queue = new Map<number, { at: number; fn: () => void }>();

  const schedule = (fn: () => void, ms: number) => {
    const id = nextId;
    nextId += 1;
    queue.set(id, { at: now + ms, fn });
    return id;
  };

  const cancelTimer = (id: unknown) => {
    if (typeof id === "number") queue.delete(id);
  };

  const tick = (ms: number) => {
    const target = now + ms;
    for (;;) {
      let next: { id: number; at: number; fn: () => void } | null = null;
      for (const [id, item] of queue) {
        if (item.at <= target && (next === null || item.at < next.at)) {
          next = { id, at: item.at, fn: item.fn };
        }
      }
      if (!next) break;
      queue.delete(next.id);
      now = next.at;
      next.fn();
    }
    now = target;
  };

  return {
    schedule,
    cancelTimer,
    tick,
    pending: () => queue.size,
  };
}

function visibleEnv() {
  return { reducedMotion: false, alreadyBooted: false, webdriver: false };
}

interface PageStub {
  navigator?: { webdriver?: boolean };
  location?: { hash?: string };
  matchMedia?: (query: string) => { matches: boolean };
  sessionStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
}

function withPage(page: PageStub | undefined, run: () => void) {
  const host = globalThis as { window?: PageStub };
  const previous = host.window;
  host.window = page;
  try {
    run();
  } finally {
    host.window = previous;
  }
}

const cases: Array<[string, () => void]> = [];

function test(name: string, fn: () => void) {
  cases.push([name, fn]);
}

test("keeps the typed POST sequence inside 2.5s", () => {
  assert.deepEqual(BOOT_LINES, [
    "YK-OS BIOS v2026",
    "Memory test OK",
    "Loading portfolio.sys",
  ]);
  const duration = bootDurationMs();
  assert.ok(duration > 0);
  assert.ok(duration <= BOOT_MAX_MS);
  assert.equal(shouldSkipBoot(visibleEnv()), false);
  const cues = buildBootCues();
  const last = cues[cues.length - 1];
  if (!last) {
    throw new Error("boot cues must include a final frame");
  }
  assert.equal(last.at, duration);
  assert.equal(last.done, true);
  assert.equal(last.text, BOOT_LINES.join("\n"));
});

test("reveals BIOS lines on a fake timer and finishes once", () => {
  const clock = createFakeTimers();
  let text = "";
  let done = 0;
  let persisted = 0;
  const handle = runBoot({
    env: visibleEnv(),
    schedule: clock.schedule,
    cancelTimer: clock.cancelTimer,
    onText: (value) => {
      text = value;
    },
    onDone: () => {
      done += 1;
    },
    persist: () => {
      persisted += 1;
    },
  });

  clock.tick(BOOT_CHAR_MS);
  assert.equal(text, "Y");
  assert.equal(done, 0);

  clock.tick(BOOT_CHAR_MS * 15);
  assert.equal(text, "YK-OS BIOS v2026");

  clock.tick(BOOT_LINE_GAP_MS + BOOT_CHAR_MS);
  assert.equal(text, "YK-OS BIOS v2026\nM");

  clock.tick(bootDurationMs());
  assert.equal(done, 1);
  assert.equal(persisted, 1);
  assert.equal(text, BOOT_LINES.join("\n"));
  assert.match(text, /YK-OS BIOS v2026/);
  assert.match(text, /Memory test OK/);
  assert.match(text, /Loading portfolio\.sys/);
  assert.equal(clock.pending(), 0);

  handle.skip();
  clock.tick(BOOT_MAX_MS);
  assert.equal(done, 1);
  assert.equal(persisted, 1);
});

test("does not finish before the scheduled duration", () => {
  const clock = createFakeTimers();
  let done = 0;
  runBoot({
    env: visibleEnv(),
    schedule: clock.schedule,
    cancelTimer: clock.cancelTimer,
    onText: () => {},
    onDone: () => {
      done += 1;
    },
    persist: () => {},
  });

  clock.tick(bootDurationMs() - 1);
  assert.equal(done, 0);
  clock.tick(1);
  assert.equal(done, 1);
});

test("any skip ends the boot immediately and records the session", () => {
  const clock = createFakeTimers();
  const store = new Map<string, string>();
  let done = 0;
  const handle = runBoot({
    env: visibleEnv(),
    schedule: clock.schedule,
    cancelTimer: clock.cancelTimer,
    onText: () => {},
    onDone: () => {
      done += 1;
    },
    persist: () => persistBooted({
      setItem: (key, value) => {
        store.set(key, value);
      },
    }),
  });

  clock.tick(BOOT_CHAR_MS * 3);
  handle.skip();
  assert.equal(done, 1);
  assert.equal(store.get(BOOT_STORAGE_KEY), "1");
  assert.equal(clock.pending(), 0);

  clock.tick(BOOT_MAX_MS);
  handle.skip();
  assert.equal(done, 1);
});

test("skips on the next fake-timer turn for reduced motion, session, and webdriver", () => {
  const reasons = [
    { reducedMotion: true, alreadyBooted: false, webdriver: false },
    { reducedMotion: false, alreadyBooted: true, webdriver: false },
    { reducedMotion: false, alreadyBooted: false, webdriver: true },
  ];

  for (const env of reasons) {
    assert.equal(shouldSkipBoot(env), true);
    const clock = createFakeTimers();
    let done = 0;
    let persisted = 0;
    runBoot({
      env,
      schedule: clock.schedule,
      cancelTimer: clock.cancelTimer,
      onText: () => {
        throw new Error("hidden boot must not type");
      },
      onDone: () => {
        done += 1;
      },
      persist: () => {
        persisted += 1;
      },
    });
    assert.equal(done, 0);
    clock.tick(0);
    assert.equal(done, 1);
    assert.equal(persisted, 0);
  }
});

test("reads skip flags from the page and tolerates storage failures", () => {
  withPage(undefined, () => {
    assert.deepEqual(readBootEnvironment(), {
      reducedMotion: false,
      alreadyBooted: false,
      webdriver: false,
    });
  });

  withPage(
    {
      navigator: { webdriver: true },
      matchMedia: () => ({ matches: false }),
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    },
    () => {
      assert.equal(readBootEnvironment().webdriver, true);
      assert.equal(shouldSkipBoot(readBootEnvironment()), true);
    },
  );

  withPage(
    {
      navigator: { webdriver: false },
      matchMedia: (query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
      }),
      sessionStorage: {
        getItem: (key) => (key === BOOT_STORAGE_KEY ? "1" : null),
        setItem: () => {},
      },
    },
    () => {
      const env = readBootEnvironment();
      assert.equal(env.reducedMotion, true);
      assert.equal(env.alreadyBooted, true);
      assert.equal(shouldSkipBoot(env), true);
    },
  );

  assert.equal(
    readAlreadyBooted({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
    false,
  );
  assert.equal(
    persistBooted({
      setItem: () => {
        throw new Error("blocked");
      },
    }),
    undefined,
  );
  assert.equal(readAlreadyBooted({ getItem: () => "" }), false);
  assert.equal(readAlreadyBooted({ getItem: () => "1" }), true);
});

test("cancel drops the fake timers without finishing", () => {
  const clock = createFakeTimers();
  let done = 0;
  const handle = runBoot({
    env: visibleEnv(),
    schedule: clock.schedule,
    cancelTimer: clock.cancelTimer,
    onText: () => {},
    onDone: () => {
      done += 1;
    },
    persist: () => {},
  });
  clock.tick(BOOT_CHAR_MS);
  handle.cancel();
  clock.tick(bootDurationMs());
  assert.equal(done, 0);
  assert.equal(clock.pending(), 0);
});

test("keydown, click, and pointerdown skip, then unbind", () => {
  const target = new EventTarget();
  let skips = 0;
  const unbind = bindBootInput(target, () => {
    skips += 1;
  });
  target.dispatchEvent(new Event("keydown"));
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("pointerdown"));
  assert.equal(skips, 3);
  unbind();
  target.dispatchEvent(new Event("keydown"));
  target.dispatchEvent(new Event("click"));
  target.dispatchEvent(new Event("pointerdown"));
  assert.equal(skips, 3);
});

test("renders a visible Skip button and hides the BIOS log from assistive tech", () => {
  withPage(undefined, () => {
    const html = renderToStaticMarkup(
      createElement(BootScreen, {
        onDone: () => {},
      }),
    );
    assert.match(html, /aria-live="off"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /<button[^>]*>Skip<\/button>/);
    assert.match(html, /Press any key, click, or tap to skip\./);
    assert.equal(html.includes("YK-OS BIOS"), false);
  });
});

test("renders nothing when reduced motion, a prior boot, or webdriver is set", () => {
  const pages: PageStub[] = [
    {
      matchMedia: () => ({ matches: true }),
      navigator: { webdriver: false },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    },
    {
      matchMedia: () => ({ matches: false }),
      navigator: { webdriver: false },
      sessionStorage: {
        getItem: (key) => (key === BOOT_STORAGE_KEY ? "1" : null),
        setItem: () => {},
      },
    },
    {
      matchMedia: () => ({ matches: false }),
      navigator: { webdriver: true },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    },
  ];

  for (const page of pages) {
    withPage(page, () => {
      const html = renderToStaticMarkup(
        createElement(BootScreen, {
          onDone: () => {},
        }),
      );
      assert.equal(html, "");
    });
  }
});

test("entry module exports BootScreen", () => {
  assert.equal(BootScreenFromIndex, BootScreen);
});

const underVitest =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.VITEST === "true";

if (underVitest) {
  const vitest = createRequire(import.meta.url)("vitest");
  vitest.describe("YK-OS boot", () => {
    for (const [name, fn] of cases) {
      vitest.it(name, fn);
    }
  });
} else {
  describe("YK-OS boot", () => {
    for (const [name, fn] of cases) {
      it(name, fn);
    }
  });
}
