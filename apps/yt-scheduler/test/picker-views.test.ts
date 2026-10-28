import { describe, expect, it } from "vitest";
import {
  FOLDER_MIME,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  pickerViewPlan,
} from "../web/src/picker-views";

describe("pickerViewPlan", () => {
  it("uses DOCS + folders + video MIME types (not DOCS_VIDEOS alone) for videos", () => {
    const plan = pickerViewPlan("video/");
    expect(plan.kind).toBe("files");
    if (plan.kind !== "files") return;
    expect(plan.primary).toEqual({
      viewId: "DOCS",
      includeFolders: true,
      mimeTypes: VIDEO_MIME_TYPES,
    });
    expect(plan.secondary.viewId).toBe("DOCS_VIDEOS");
    expect(plan.primary.mimeTypes).toContain("video/mp4");
  });

  it("uses DOCS + folders + image MIME types for images", () => {
    const plan = pickerViewPlan("image/");
    expect(plan.kind).toBe("files");
    if (plan.kind !== "files") return;
    expect(plan.primary.viewId).toBe("DOCS");
    expect(plan.primary.includeFolders).toBe(true);
    expect(plan.primary.mimeTypes).toBe(IMAGE_MIME_TYPES);
    expect(plan.secondary.viewId).toBe("DOCS_IMAGES");
  });

  it("keeps FOLDERS view for folder accept", () => {
    expect(pickerViewPlan("folder")).toEqual({
      kind: "folder",
      viewId: "FOLDERS",
      selectFolderEnabled: true,
      mimeTypes: FOLDER_MIME,
    });
  });
});
