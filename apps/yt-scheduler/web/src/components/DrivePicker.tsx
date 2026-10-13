import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@repo/ui/shadcn";
import { api } from "../api";
import type { DriveFile } from "../api";

const FOLDER = "application/vnd.google-apps.folder";
const EPISODES = "15UNBqiwoEZoNzJ8hl-U2HccZgFftwWsV";

/** Browse Drive folders and pick a file (accept = mime prefix) or a folder (accept="folder"). */
export function DrivePicker({ open, onOpenChange, channel, accept, onPick }: {
  open: boolean; onOpenChange(o: boolean): void; channel: string; accept: "video/" | "image/" | "folder"; onPick(f: DriveFile): void;
}) {
  const [stack, setStack] = useState<{ id: string; name: string }[]>([{ id: EPISODES, name: "Episodes" }]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const cur = stack[stack.length - 1]!;
  useEffect(() => {
    if (!open) return;
    setLoading(true); setErr("");
    api<DriveFile[]>(`/drive/list?folderId=${encodeURIComponent(cur.id)}${channel ? `&channel=${channel}` : ""}`)
      .then(setFiles).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [open, cur.id, channel]);
  const ok = (f: DriveFile) => (accept === "folder" ? f.mimeType === FOLDER : f.mimeType.startsWith(accept));
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Pick ${accept === "folder" ? "a folder" : accept === "video/" ? "a video" : "an image"} from Drive`}>
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        {stack.map((s, i) => (
          <span key={s.id}>{i > 0 && " / "}<button className="text-blue-400 hover:underline" onClick={() => setStack(stack.slice(0, i + 1))}>{s.name}</button></span>
        ))}
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setStack([{ id: "root", name: "My Drive" }])}>My Drive</Button>
        <Button size="sm" variant="ghost" onClick={() => setStack([{ id: EPISODES, name: "Episodes" }])}>Episodes</Button>
      </div>
      {err && <p className="mb-2 text-sm text-red-400">{err}</p>}
      <div className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
        {loading && <p className="p-3 text-sm text-muted-foreground">Loading…</p>}
        {!loading && files.length === 0 && <p className="p-3 text-sm text-muted-foreground">Empty folder</p>}
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span>{f.mimeType === FOLDER ? "📁" : f.mimeType.startsWith("video/") ? "🎬" : f.mimeType.startsWith("image/") ? "🖼️" : "📄"}</span>
            {f.mimeType === FOLDER ? <button className="flex-1 text-left hover:underline" onClick={() => setStack([...stack, { id: f.id, name: f.name }])}>{f.name}</button> : <span className="flex-1">{f.name}</span>}
            {f.size && <span className="text-xs text-muted-foreground">{(Number(f.size) / 1e6).toFixed(1)} MB</span>}
            {ok(f) && <Button size="sm" onClick={() => { onPick(f); onOpenChange(false); }}>Select</Button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {accept === "folder" && <Button variant="secondary" onClick={() => { onPick({ id: cur.id, name: cur.name, mimeType: FOLDER }); onOpenChange(false); }}>Use current folder</Button>}
        <Input placeholder="…or paste a Drive id" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button variant="outline" disabled={manual.length < 10} onClick={() => { onPick({ id: manual.trim(), name: manual.trim(), mimeType: accept === "folder" ? FOLDER : accept }); onOpenChange(false); }}>Use id</Button>
      </div>
    </Dialog>
  );
}
