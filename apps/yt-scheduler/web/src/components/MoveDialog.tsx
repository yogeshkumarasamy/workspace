import { useEffect, useState } from "react";
import { Button, Dialog, Input, Label } from "@repo/ui/shadcn";
import { api } from "../api";
import type { Job } from "../api";
import { useApp } from "../state";
import { fmt, fromInput, toInput, tzLabel } from "../time";

/** Touch-friendly alternative to drag-to-reschedule. */
export function MoveDialog({ job, onClose }: { job: Job | null; onClose(): void }) {
  const { tz, refresh, toast, channelById } = useApp();
  const ctz = job ? channelById(job.channelId)?.slots.timezone ?? tz : tz;
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(toInput(job?.publishAt, ctz)), [job, ctz]);
  if (!job) return null;
  const go = async (body: { publishAt: string } | "auto") => {
    setBusy(true);
    try {
      if (body === "auto") await api("/jobs/bulk", { method: "POST", json: { ids: [job.id], action: "autoslot" } });
      else await api(`/jobs/${job.id}/reschedule`, { method: "POST", json: body });
      toast(`Moved “${job.metadata.title}”${job.youtubeVideoId ? " (YouTube updated)" : ""}`); await refresh(); onClose();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const iso = fromInput(v, ctz);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Move to…" className="sm:max-w-md">
      <p className="mb-3 text-sm text-muted-foreground">{job.metadata.title}<br />Currently {fmt(job.publishAt, ctz)} {tzLabel(ctz)}</p>
      <Label>New publish time ({tzLabel(ctz)})</Label>
      <Input type="datetime-local" className="mt-2 h-11 text-base" value={v} onChange={(e) => setV(e.target.value)} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="h-11" disabled={busy} onClick={() => go("auto")}>Next free slot</Button>
        <Button className="h-11" disabled={busy || !iso} onClick={() => iso && go({ publishAt: iso })}>Move</Button>
      </div>
    </Dialog>
  );
}
