/** Shared Google Picker view plan + accept matching for Drive file/folder selection. */

export const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Common video MIME types Google Drive/Picker recognize for uploads. */
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/avi",
  "video/webm",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
  "video/x-flv",
  "video/x-m4v",
  "video/mp2t",
  "video/x-ms-wmv",
  "video/ogg",
].join(",");

/** Filename extensions treated as videos when Drive MIME is missing or octet-stream. */
export const VIDEO_NAME_RE = /\.(mp4|m4v|mov|avi|mkv|webm|mpeg|mpg|3gp|flv|wmv|ts|mts|m2ts|ogv)$/i;

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

export const IMAGE_NAME_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

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
      /**
       * Primary: My Drive / all docs with folders. MIME filter is intentionally
       * omitted — Drive often stores episode files as application/octet-stream
       * (or other non-video/* types), and setMimeTypes then disables Select for
       * every file except the few with a real video/* MIME.
       */
      primary: {
        viewId: "DOCS";
        includeFolders: true;
        /** When set, applied to DocsView; undefined means no MIME gate. */
        mimeTypes?: string;
      };
      /** Optional Videos/Images tab; do not rely on it alone under drive.file. */
      secondary: {
        viewId: "DOCS_VIDEOS" | "DOCS_IMAGES";
      };
    };

/**
 * Prefer ViewId.DOCS + folders (no MIME gate) so every video in the library is
 * selectable; filter on pick via matchesPickerAccept. DOCS_VIDEOS / DOCS_IMAGES
 * alone often only list already-authorized files under drive.file scope.
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
        // No mimeTypes — same octet-stream issue as videos; filter in callback.
      },
      secondary: { viewId: "DOCS_IMAGES" },
    };
  }
  return {
    kind: "files",
    primary: {
      viewId: "DOCS",
      includeFolders: true,
    },
    secondary: { viewId: "DOCS_VIDEOS" },
  };
}

/** True when a Drive file/folder matches the picker accept mode (MIME or extension). */
export function matchesPickerAccept(
  accept: PickerAccept,
  file: { name: string; mimeType: string },
): boolean {
  if (accept === "folder") return file.mimeType === FOLDER_MIME;
  if (accept === "video/") {
    return file.mimeType.startsWith("video/") || VIDEO_NAME_RE.test(file.name);
  }
  return file.mimeType.startsWith("image/") || IMAGE_NAME_RE.test(file.name);
}
