import { describe, expect, it } from "vitest";
import { driveFileId } from "../web/src/drive-id";

describe("driveFileId", () => {
  it("reads /file/d/<id>/view and ?id= links and leaves a bare id alone", () => {
    expect(driveFileId("https://drive.google.com/file/d/VIDEOFILEID123/view")).toBe("VIDEOFILEID123");
    expect(driveFileId("https://drive.google.com/file/d/VIDEOFILEID123/view?usp=sharing")).toBe("VIDEOFILEID123");
    expect(driveFileId("https://drive.google.com/open?id=THUMBFILEID99")).toBe("THUMBFILEID99");
    expect(driveFileId("https://drive.google.com/uc?id=THUMBFILEID99&export=download")).toBe("THUMBFILEID99");
    expect(driveFileId("VIDEOFILEID123")).toBe("VIDEOFILEID123");
    expect(driveFileId("not a url")).toBe("not a url");
  });
});