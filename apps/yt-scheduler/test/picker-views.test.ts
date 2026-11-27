import { describe, expect, it } from "vitest";
import {
  FOLDER_MIME,
  matchesPickerAccept,
  pickerViewPlan,
} from "../web/src/picker-views";

describe("pickerViewPlan", () => {
  it("uses DOCS + folders without MIME gate for videos (octet-stream-safe)", () => {
    const plan = pickerViewPlan("video/");
    expect(plan.kind).toBe("files");
    if (plan.kind !== "files") return;
    expect(plan.primary).toEqual({
      viewId: "DOCS",
      includeFolders: true,
    });
    expect(plan.primary.mimeTypes).toBeUndefined();
    expect(plan.secondary.viewId).toBe("DOCS_VIDEOS");
  });

  it("uses DOCS + folders without MIME gate for images", () => {
    const plan = pickerViewPlan("image/");
    expect(plan.kind).toBe("files");
    if (plan.kind !== "files") return;
    expect(plan.primary.viewId).toBe("DOCS");
    expect(plan.primary.includeFolders).toBe(true);
    expect(plan.primary.mimeTypes).toBeUndefined();
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

describe("matchesPickerAccept", () => {
  it("accepts video/* MIME and common video extensions (incl. octet-stream)", () => {
    expect(matchesPickerAccept("video/", { name: "a.mp4", mimeType: "video/mp4" })).toBe(true);
    expect(matchesPickerAccept("video/", { name: "pirai enge poran.mp4", mimeType: "video/mp4" })).toBe(true);
    expect(matchesPickerAccept("video/", { name: "ep05.MP4", mimeType: "application/octet-stream" })).toBe(true);
    expect(matchesPickerAccept("video/", { name: "clip.mkv", mimeType: "application/octet-stream" })).toBe(true);
    expect(matchesPickerAccept("video/", { name: "clip.mov", mimeType: "application/octet-stream" })).toBe(true);
    expect(matchesPickerAccept("video/", { name: "notes.txt", mimeType: "text/plain" })).toBe(false);
    expect(matchesPickerAccept("video/", { name: "thumb.jpg", mimeType: "image/jpeg" })).toBe(false);
  });

  it("accepts image/* MIME and common image extensions", () => {
    expect(matchesPickerAccept("image/", { name: "a.jpg", mimeType: "image/jpeg" })).toBe(true);
    expect(matchesPickerAccept("image/", { name: "a.PNG", mimeType: "application/octet-stream" })).toBe(true);
    expect(matchesPickerAccept("image/", { name: "a.mp4", mimeType: "video/mp4" })).toBe(false);
  });

  it("accepts only Drive folders for folder mode", () => {
    expect(matchesPickerAccept("folder", { name: "Episodes", mimeType: FOLDER_MIME })).toBe(true);
    expect(matchesPickerAccept("folder", { name: "a.mp4", mimeType: "video/mp4" })).toBe(false);
  });
});
