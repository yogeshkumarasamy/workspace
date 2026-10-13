export interface DriveFile { id: string; name: string; mimeType: string }
export interface DriveLister {
  list(folderId: string): Promise<DriveFile[]>;
  readText(fileId: string): Promise<string>;
}

const FOLDER = "application/vnd.google-apps.folder";

/**
 * Walk an episode folder (and Short subfolders). Each folder containing an MP4 becomes one raw job.
 * metadata.json in the same folder is the sidecar; thumbnail = first jpg/png.
 */
export async function draftJobsFromFolder(drive: DriveLister, folderId: string, opts: { channel?: string; recursive: boolean }) {
  const jobs: unknown[] = [];
  const skipped: { folder: string; reason: string }[] = [];
  async function walk(id: string, name: string) {
    const files = await drive.list(id);
    const video = files.find((f) => f.mimeType.startsWith("video/") || /\.mp4$/i.test(f.name));
    const thumb = files.find((f) => /^image\/(jpeg|png)$/.test(f.mimeType) || /\.(jpe?g|png)$/i.test(f.name));
    const sidecar = files.find((f) => f.name.toLowerCase() === "metadata.json");
    if (video) {
      if (!sidecar) skipped.push({ folder: name, reason: "no metadata.json" });
      else {
        const metadata = JSON.parse(await drive.readText(sidecar.id)) as Record<string, unknown>;
        if (!metadata.type) metadata.type = /^short\b/i.test(name) ? "short" : "long";
        jobs.push({
          idempotencyKey: `drive:${video.id}`,
          channel: opts.channel ?? metadata.channel,
          video: { driveFileId: video.id },
          ...(thumb ? { thumbnail: { driveFileId: thumb.id } } : {}),
          metadata,
        });
      }
    }
    if (opts.recursive) for (const f of files.filter((f) => f.mimeType === FOLDER)) await walk(f.id, f.name);
  }
  await walk(folderId, folderId);
  return { jobs, skipped };
}
