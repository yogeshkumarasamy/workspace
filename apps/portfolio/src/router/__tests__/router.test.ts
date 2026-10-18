import { describe, it, expect, beforeEach } from "vitest";
import { parseHash, routeToHash, navigate } from "../index";

describe("Router", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  describe("parseHash", () => {
    it("parses empty, slash, or invalid hash as desktop route", () => {
      expect(parseHash("")).toEqual({ view: "desktop" });
      expect(parseHash("#/")).toEqual({ view: "desktop" });
      expect(parseHash("#")).toEqual({ view: "desktop" });
      expect(parseHash("#/unknown")).toEqual({ view: "desktop" });
    });

    it("parses #/classic as classic route", () => {
      expect(parseHash("#/classic")).toEqual({ view: "classic" });
      expect(parseHash("/classic")).toEqual({ view: "classic" });
      expect(parseHash("#/classic/skills")).toEqual({ view: "classic" });
      expect(parseHash("#skills")).toEqual({ view: "classic" });
      expect(parseHash("#classic-content")).toEqual({ view: "classic" });
    });

    it("parses a classic section hash as that desktop app, not the generic desktop", () => {
      expect(parseHash("#projects")).toEqual({ view: "app", appId: "projects" });
      expect(parseHash("#experience")).toEqual({ view: "app", appId: "experience" });
      expect(parseHash("#/writing")).toEqual({ view: "app", appId: "writing" });
    });

    it("parses #/app/<id> as app route", () => {
      expect(parseHash("#/app/experience")).toEqual({
        view: "app",
        appId: "experience",
      });
      expect(parseHash("#/app/about")).toEqual({
        view: "app",
        appId: "about",
      });
      expect(parseHash("#/app/terminal")).toEqual({
        view: "app",
        appId: "terminal",
      });
    });
  });

  describe("routeToHash", () => {
    it("generates correct hash for routes", () => {
      expect(routeToHash({ view: "desktop" })).toBe("#/");
      expect(routeToHash({ view: "classic" })).toBe("#/classic");
      expect(routeToHash({ view: "app", appId: "contact" })).toBe("#/app/contact");
    });
  });

  describe("navigate", () => {
    it("updates window.location.hash", () => {
      navigate({ view: "classic" });
      expect(window.location.hash).toBe("#/classic");

      navigate({ view: "app", appId: "about" });
      expect(window.location.hash).toBe("#/app/about");

      navigate("#/classic");
      expect(window.location.hash).toBe("#/classic");
    });
  });
});
