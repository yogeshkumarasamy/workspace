/** Shared Google Picker view plan for Drive file/folder selection (drive.file-safe). */

export const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Common video MIME types Google Drive/Picker recognize for uploads. */
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
  "video/x-flv",
].join(",");

/** Common image MIME types for thumbnails. */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/heic",
  "image/heif",
].join(",");

export type PickerAccept = "video/" | "image/" | "folder";

export type PickerViewPlan =
  | {
      kind: "folder";
      viewId: "FOLDERS";
      selectFolderEnabled: true;
      mimeTypes: typeof FOLDER_MIME;
    }
  | {
      kind: "files";
      /** Primary: My Drive / all docs with folders + MIME filter (works with drive.file). */
      primary: {
        viewId: "DOCS";
        includeFolders: true;
        mimeTypes: string;
      };
      /** Optional Videos/Images tab; do not rely on it alone under drive.file. */
      secondary: {
        viewId: "DOCS_VIDEOS" | "DOCS_IMAGES";
      };
    };

/**
 * Prefer ViewId.DOCS + folders + MIME filter so Picker can browse My Drive and
 * grant drive.file on pick. DOCS_VIDEOS / DOCS_IMAGES alone often only list
 * already-authorized files under drive.file scope.
 */
export function pickerViewPlan(accept: PickerAccept): PickerViewPlan {
  if (accept === "folder") {
    return {
      kind: "folder",
      viewId: "FOLDERS",
      selectFolderEnabled: true,
      mimeTypes: FOLDER_MIME,
    };
  }
  if (accept === "image/") {
    return {
      kind: "files",
      primary: {
        viewId: "DOCS",
        includeFolders: true,
        mimeTypes: IMAGE_MIME_TYPES,
      },
      secondary: { viewId: "DOCS_IMAGES" },
    };
  }
  return {
    kind: "files",
    primary: {
      viewId: "DOCS",
      includeFolders: true,
      mimeTypes: VIDEO_MIME_TYPES,
    },
    secondary: { viewId: "DOCS_VIDEOS" },
  };
}
