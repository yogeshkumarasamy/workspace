const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

/**
 * A Drive share link becomes the file id. Anything else, including a bare id,
 * is returned unchanged so typing in the field never clears it.
 *
 * `https://drive.google.com/file/d/<id>/view` and `?id=<id>` (open, uc, …).
 */
export function driveFileId(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  const fromPath = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (fromPath?.[1]) {
    const id = decodeURIComponent(fromPath[1]);
    if (DRIVE_ID.test(id)) return id;
  }
  const query = url.searchParams.get("id");
  if (query && DRIVE_ID.test(query)) return query;
  return raw;
}
