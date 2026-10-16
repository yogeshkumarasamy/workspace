import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { PrefsProvider, usePrefs } from "../prefs";

const ConsumerComponent: React.FC = () => {
  const { theme, setTheme, crt, setCrt, reducedMotion } = usePrefs();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="crt-val">{crt ? "on" : "off"}</span>
      <span data-testid="motion-val">{reducedMotion ? "reduce" : "no-preference"}</span>
      <button onClick={() => setTheme("amber")}>Set Amber</button>
      <button onClick={() => setCrt(false)}>Turn CRT Off</button>
    </div>
  );
};

describe("PrefsProvider and usePrefs", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-crt");
  });

  it("provides default preferences and sets HTML data attributes", () => {
    render(
      <PrefsProvider>
        <ConsumerComponent />
      </PrefsProvider>,
    );

    expect(screen.getByTestId("theme-val")).toHaveTextContent("green");
    expect(screen.getByTestId("crt-val")).toHaveTextContent("on");
    expect(document.documentElement.getAttribute("data-theme")).toBe("green");
    expect(document.documentElement.getAttribute("data-crt")).toBe("on");
  });

  it("allows updating theme and crt and persists to localStorage", () => {
    render(
      <PrefsProvider>
        <ConsumerComponent />
      </PrefsProvider>,
    );

    act(() => {
      screen.getByText("Set Amber").click();
    });

    expect(screen.getByTestId("theme-val")).toHaveTextContent("amber");
    expect(document.documentElement.getAttribute("data-theme")).toBe("amber");
    expect(localStorage.getItem("yk-os-theme")).toBe("amber");

    act(() => {
      screen.getByText("Turn CRT Off").click();
    });

    expect(screen.getByTestId("crt-val")).toHaveTextContent("off");
    expect(document.documentElement.getAttribute("data-crt")).toBe("off");
    expect(localStorage.getItem("yk-os-crt")).toBe("off");
  });

  it("handles localStorage failures gracefully", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    render(
      <PrefsProvider>
        <ConsumerComponent />
      </PrefsProvider>,
    );

    expect(() => {
      act(() => {
        screen.getByText("Set Amber").click();
      });
    }).not.toThrow();

    expect(screen.getByTestId("theme-val")).toHaveTextContent("amber");
    localStorage.setItem = originalSetItem;
  });
});
