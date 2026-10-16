import { describe, it, expect } from "vitest";
import { apps, getApp, sortAndFilterApps } from "../registry";
import type { AppDefinition } from "../../contracts/apps";

describe("Apps Registry", () => {
  it("discovers all registered apps and sorts them by order", () => {
    expect(apps.length).toBeGreaterThanOrEqual(6);

    const ids = apps.map((app) => app.id);
    expect(ids).toContain("about");
    expect(ids).toContain("experience");
    expect(ids).toContain("projects");
    expect(ids).toContain("writing");
    expect(ids).toContain("contact");
    expect(ids).toContain("terminal");

    // Check order is monotonically increasing
    for (let i = 0; i < apps.length - 1; i++) {
      expect(apps[i].order).toBeLessThanOrEqual(apps[i + 1].order);
    }
  });

  it("finds app by id using getApp", () => {
    const experienceApp = getApp("experience");
    expect(experienceApp).toBeDefined();
    expect(experienceApp?.id).toBe("experience");
    expect(experienceApp?.order).toBe(2);

    expect(getApp("nonexistent")).toBeUndefined();
  });

  it("handles empty registry modules gracefully without crashing", () => {
    const emptyResult = sortAndFilterApps({});
    expect(emptyResult).toEqual([]);

    const invalidModules = {
      foo: {},
      bar: { default: null },
      baz: { default: { id: "test" } }, // missing order
    };
    const invalidResult = sortAndFilterApps(invalidModules);
    expect(invalidResult).toEqual([]);
  });

  it("sorts arbitrary modules correctly", () => {
    const mockApp1 = { id: "app1", order: 10 } as unknown as AppDefinition;
    const mockApp2 = { id: "app2", order: 2 } as unknown as AppDefinition;
    const mockModules = {
      a: { default: mockApp1 },
      b: { default: mockApp2 },
    };
    const sorted = sortAndFilterApps(mockModules);
    expect(sorted[0].id).toBe("app2");
    expect(sorted[1].id).toBe("app1");
  });
});
