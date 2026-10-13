import { useEffect, useState } from "react";
import { Alert, Badge, Button, Dialog } from "@repo/ui/shadcn";
import { api, driveImageUrl } from "../api";
import type { Job } from "../api";
import { useApp } from "../state";
import { fmt, tzLabel } from "../time";
import { StatusBadge } from "./StatusBadge";

export function JobDetail({ job, onClose, onEdit }: { job: Job | null; onClose(): void; onEdit(j: Job): void }) {
  const { refresh, toast, channelById } = useApp();
  const [thumb, setThumb] = useState("");
  const ch = job ? channelById(job.channelId) : undefined;
  const tz = ch?.slots.timezone ?? "Asia/Kolkata";
  useEffect(() => {
    setThumb("");
    if (!job?.thumbnail) return;
    if (job.thumbnail.kind === "url") setThumb(job.thumbnail.url);
    else driveImageUrl(job.thumbnail.fileId, job.channelId).then(setThumb).catch(() => {});
  }, [job]);
  if (!job) return null;
  const act = async (a: "cancel" | "retry") => {
    try { await api(`/jobs/${job.id}/${a}`, { method: "POST" }); toast(`Job ${a === "cancel" ? "cancelled" : "re-queued"}`); await refresh(); onClose(); }
    catch (e) { toast((e as Error).message, "err"); }
  };
  const src = (s: Job["video"]) => (s.kind === "drive" ? <a className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" href={`https://drive.google.com/file/d/${s.fileId}/view`}>Drive {s.fileId}</a> : <a className="break-all text-blue-400 hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={job.metadata.title}>
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={job.status} /><Badge variant="outline">{job.metadata.type}</Badge><Badge variant="outline">{job.metadata.privacyStatus}</Badge>{job.metadata.madeForKids && <Badge variant="outline">made for kids</Badge>}<span className="text-muted-foreground">{ch?.title}</span></div>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Publish at</dt><dd>{fmt(job.publishAt, tz)} {tzLabel(tz)}</dd>
            <dt className="text-muted-foreground">Upload</dt><dd>{job.uploadMode === "at" ? `deferred until ${fmt(job.runAt, tz)}` : "immediately"} · attempts {job.attempts}</dd>
            <dt className="text-muted-foreground">Video</dt><dd>{src(job.video)}</dd>
            <dt className="text-muted-foreground">Thumbnail</dt><dd>{job.thumbnail ? src(job.thumbnail) : "—"}</dd>
            <dt className="text-muted-foreground">Playlist</dt><dd>{job.metadata.playlist ?? "—"}</dd>
            <dt className="text-muted-foreground">Tags</dt><dd>{job.metadata.tags.join(", ") || "—"}</dd>
            <dt className="text-muted-foreground">Key</dt><dd className="font-mono text-xs">{job.idempotencyKey}</dd>
            {job.youtubeVideoId && <><dt className="text-muted-foreground">YouTube</dt><dd className="space-x-3"><a className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" href={`https://studio.youtube.com/video/${job.youtubeVideoId}/edit`}>Studio</a><a className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" href={`https://youtu.be/${job.youtubeVideoId}`}>youtu.be/{job.youtubeVideoId}</a></dd></>}
          </dl>
          {job.lastError && <Alert variant="destructive"><b>Last error:</b> {job.lastError}</Alert>}
          {job.warnings.map((w, i) => <Alert key={i} variant="warning">⚠ {w}</Alert>)}
          <div><h4 className="mb-1 font-medium">Activity log</h4>
            <ol className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2 font-mono text-xs">
              {[...job.log].reverse().map((l, i) => <li key={i}><span className="text-muted-foreground">{fmt(l.at, tz, { dateStyle: "short", timeStyle: "medium" })}</span> {l.msg}</li>)}
              {job.log.length === 0 && <li className="text-muted-foreground">No entries</li>}
            </ol></div>
          <details><summary className="cursor-pointer text-muted-foreground">Description</summary><pre className="mt-2 whitespace-pre-wrap text-xs">{job.metadata.description || "—"}</pre></details>
        </div>
        <div className="space-y-3">
          <div className={`overflow-hidden rounded-lg border bg-muted ${job.metadata.type === "short" ? "aspect-[9/16]" : "aspect-video"}`}>{thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}</div>
          <div className="flex flex-col gap-2">
            {!["uploading", "published", "cancelled"].includes(job.status) && <Button variant="secondary" onClick={() => onEdit(job)}>{job.youtubeVideoId ? "Reschedule" : "Edit"}</Button>}
            {["queued", "failed"].includes(job.status) && <Button variant="outline" onClick={() => act("cancel")}>Cancel job</Button>}
            {["failed", "cancelled"].includes(job.status) && <Button onClick={() => act("retry")}>Retry</Button>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
