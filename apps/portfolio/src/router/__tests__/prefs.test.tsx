import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PrefsProvider, usePrefs } from "../prefs";

function PrefsConsumer() {
  const { theme, setTheme, crt, setCrt, reducedMotion } = usePrefs();

  return (
    <div>
      <span data-testid="pref-theme">{theme}</span>
      <span data-testid="pref-crt">{crt ? "on" : "off"}</span>
      <span data-testid="pref-reduced-motion">
        {reducedMotion ? "reduced" : "normal"}
      </span>
      <button type="button" onClick={() => setTheme("amber")}>
        Set Amber
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        Set Light
      </button>
      <button
        type="button"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => setTheme("invalid" as any)}
      >
        Set Invalid
      </button>
      <button type="button" onClick={() => setCrt(false)}>
        Disable CRT
      </button>
      <button type="button" onClick={() => setCrt(true)}>
        Enable CRT
      </button>
    </div>
  );
}

describe("PrefsProvider & usePrefs", () => {
  beforeEach(() => {
    window.localStorage?.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-crt");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides default theme 'green' and crt true", () => {
    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    expect(screen.getByTestId("pref-theme").textContent).toBe("green");
    expect(screen.getByTestId("pref-crt").textContent).toBe("on");
    expect(document.documentElement.getAttribute("data-theme")).toBe("green");
    expect(document.documentElement.getAttribute("data-crt")).toBe("on");
  });

  it("updates theme, data-theme attribute, and localStorage on setTheme", () => {
    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    act(() => {
      screen.getByRole("button", { name: "Set Amber" }).click();
    });

    expect(screen.getByTestId("pref-theme").textContent).toBe("amber");
    expect(document.documentElement.getAttribute("data-theme")).toBe("amber");
    expect(window.localStorage.getItem("yk-theme")).toBe("amber");

    act(() => {
      screen.getByRole("button", { name: "Set Light" }).click();
    });

    expect(screen.getByTestId("pref-theme").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem("yk-theme")).toBe("light");

    act(() => {
      screen.getByRole("button", { name: "Set Invalid" }).click();
    });

    expect(screen.getByTestId("pref-theme").textContent).toBe("light");
  });

  it("initializes theme from window.localStorage", () => {
    window.localStorage.setItem("yk-theme", "amber");

    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    expect(screen.getByTestId("pref-theme").textContent).toBe("amber");
    expect(document.documentElement.getAttribute("data-theme")).toBe("amber");
  });

  it("updates crt, data-crt attribute, and window.localStorage on setCrt", () => {
    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    act(() => {
      screen.getByRole("button", { name: "Disable CRT" }).click();
    });

    expect(screen.getByTestId("pref-crt").textContent).toBe("off");
    expect(document.documentElement.getAttribute("data-crt")).toBe("off");
    expect(window.localStorage.getItem("yk-crt")).toBe("off");

    act(() => {
      screen.getByRole("button", { name: "Enable CRT" }).click();
    });

    expect(screen.getByTestId("pref-crt").textContent).toBe("on");
    expect(document.documentElement.getAttribute("data-crt")).toBe("on");
    expect(window.localStorage.getItem("yk-crt")).toBe("on");
  });

  it("initializes crt from window.localStorage", () => {
    window.localStorage.setItem("yk-crt", "off");

    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    expect(screen.getByTestId("pref-crt").textContent).toBe("off");
    expect(document.documentElement.getAttribute("data-crt")).toBe("off");
  });

  it("disables CRT when reducedMotion is true", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <PrefsProvider>
        <PrefsConsumer />
      </PrefsProvider>
    );

    expect(screen.getByTestId("pref-reduced-motion").textContent).toBe("reduced");
    expect(screen.getByTestId("pref-crt").textContent).toBe("off");
    expect(document.documentElement.getAttribute("data-crt")).toBe("off");
  });

  it("handles localStorage failures gracefully", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("QuotaExceeded or SecurityError");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded or SecurityError");
    });

    expect(() => {
      render(
        <PrefsProvider>
          <PrefsConsumer />
        </PrefsProvider>
      );
    }).not.toThrow();

    expect(screen.getByTestId("pref-theme").textContent).toBe("green");

    expect(() => {
      act(() => {
        screen.getByRole("button", { name: "Set Amber" }).click();
      });
    }).not.toThrow();

    expect(screen.getByTestId("pref-theme").textContent).toBe("amber");
  });

  it("throws error when usePrefs is called outside PrefsProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<PrefsConsumer />)).toThrow(
      "usePrefs must be used within a PrefsProvider"
    );

    spy.mockRestore();
  });
});
