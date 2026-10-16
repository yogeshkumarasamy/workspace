import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { parseRoute, routeToHash, navigate, useRoute } from "../index";
import { App } from "../../App";
import { loadApps, apps, getApp } from "../../apps/registry";

describe("Router & Navigation", () => {
  beforeEach(() => {
    window.location.hash = "";
    window.sessionStorage?.clear();
    window.localStorage?.clear();
  });

  afterEach(() => {
    window.location.hash = "";
  });

  describe("parseRoute", () => {
    it("parses empty, slash, or # hash as desktop route", () => {
      expect(parseRoute("")).toEqual({ view: "desktop" });
      expect(parseRoute("#")).toEqual({ view: "desktop" });
      expect(parseRoute("#/")).toEqual({ view: "desktop" });
    });

    it("parses #/classic as classic route", () => {
      expect(parseRoute("#/classic")).toEqual({ view: "classic" });
      expect(parseRoute("classic")).toEqual({ view: "classic" });
    });

    it("parses valid app routes", () => {
      expect(parseRoute("#/app/about")).toEqual({
        view: "app",
        appId: "about",
      });
      expect(parseRoute("#/app/terminal")).toEqual({
        view: "app",
        appId: "terminal",
      });
      expect(parseRoute("#/app/experience")).toEqual({
        view: "app",
        appId: "experience",
      });
      expect(parseRoute("#/app/projects")).toEqual({
        view: "app",
        appId: "projects",
      });
      expect(parseRoute("#/app/writing")).toEqual({
        view: "app",
        appId: "writing",
      });
      expect(parseRoute("#/app/contact")).toEqual({
        view: "app",
        appId: "contact",
      });
    });

    it("falls back to desktop for unknown routes or invalid app IDs", () => {
      expect(parseRoute("#/unknown-route")).toEqual({ view: "desktop" });
      expect(parseRoute("#/app/invalid-app-id")).toEqual({ view: "desktop" });
    });

    it("handles trailing slashes and query strings gracefully", () => {
      expect(parseRoute("#/classic/")).toEqual({ view: "classic" });
      expect(parseRoute("#/app/terminal/")).toEqual({
        view: "app",
        appId: "terminal",
      });
      expect(parseRoute("#/app/terminal?ref=nav")).toEqual({
        view: "app",
        appId: "terminal",
      });
      expect(parseRoute("#/?utm_source=test")).toEqual({ view: "desktop" });
    });
  });

  describe("routeToHash", () => {
    it("converts routes to hash strings", () => {
      expect(routeToHash({ view: "desktop" })).toBe("#/");
      expect(routeToHash({ view: "classic" })).toBe("#/classic");
      expect(routeToHash({ view: "app", appId: "terminal" })).toBe(
        "#/app/terminal"
      );
    });
  });

  describe("navigate", () => {
    it("updates window.location.hash", () => {
      navigate({ view: "classic" });
      expect(window.location.hash).toBe("#/classic");

      navigate({ view: "app", appId: "about" });
      expect(window.location.hash).toBe("#/app/about");

      navigate({ view: "desktop" });
      expect(window.location.hash).toBe("#/");
    });
  });

  describe("useRoute hook", () => {
    function RouteConsumer() {
      const route = useRoute();
      return (
        <div>
          <span data-testid="route-view">{route.view}</span>
          {route.view === "app" && (
            <span data-testid="route-app-id">{route.appId}</span>
          )}
        </div>
      );
    }

    it("reacts to hashchange events", () => {
      window.location.hash = "#/";
      render(<RouteConsumer />);
      expect(screen.getByTestId("route-view").textContent).toBe("desktop");

      act(() => {
        window.location.hash = "#/classic";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByTestId("route-view").textContent).toBe("classic");

      act(() => {
        window.location.hash = "#/app/terminal";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByTestId("route-view").textContent).toBe("app");
      expect(screen.getByTestId("route-app-id").textContent).toBe("terminal");
    });
  });

  describe("Apps Registry", () => {
    it("exports apps array and helper functions without crashing", () => {
      const discovered = loadApps();
      expect(Array.isArray(discovered)).toBe(true);
      expect(Array.isArray(apps)).toBe(true);
      expect(getApp("nonexistent")).toBeUndefined();
    });
  });

  describe("App Component integration", () => {
    it("renders ClassicView on #/classic without boot screen", () => {
      window.location.hash = "#/classic";
      render(<App />);

      expect(screen.getByTestId("classic-view")).not.toBeNull();
      expect(screen.queryByTestId("boot-screen")).toBeNull();
    });

    it("renders BootScreen on first visit to #/ and transitions to Desktop onDone", () => {
      window.location.hash = "#/";
      render(<App />);

      const skipBtn = screen.getByRole("button", { name: /skip boot/i });
      expect(skipBtn).not.toBeNull();

      act(() => {
        skipBtn.click();
      });

      expect(screen.getByTestId("desktop")).not.toBeNull();
      expect(window.sessionStorage.getItem("yk-boot-done")).toBe("1");
    });

    it("skips BootScreen if session already completed boot", () => {
      window.location.hash = "#/";
      window.sessionStorage.setItem("yk-boot-done", "1");

      render(<App />);
      expect(screen.getByTestId("desktop")).not.toBeNull();
      expect(screen.queryByTestId("boot-screen")).toBeNull();
    });
  });
});
