import { useState } from "react";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Table, TBody, TD, TH, THead, TR, Textarea } from "@repo/ui/shadcn";
import { api } from "../api";
import { useApp } from "../state";
import { DrivePicker } from "./DrivePicker";

interface Draft { idempotencyKey: string; video: { driveFileId: string }; thumbnail?: { driveFileId: string }; metadata: { title?: string; type?: string; publishAt?: string; playlist?: string } }
interface Result { ok: boolean; created?: boolean; title?: string; error?: string; publishAt?: string }

export function ImportPanel() {
  const { channel, channels, refresh, toast, driveScope, youtubeMode } = useApp();
  const ch = channel ?? (channels.length === 1 ? channels[0]! : null);
  const [folder, setFolder] = useState({ id: "", name: "" });
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState<{ jobs: Draft[]; skipped: { folder: string; reason: string }[] } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState("");
  const [err, setErr] = useState("");

  async function run(dryRun: boolean) {
    setBusy(true); setErr(""); setResults(null);
    try {
      const r = await api<{ jobs?: Draft[]; results?: Result[]; skipped: { folder: string; reason: string }[] }>("/drive/import", { method: "POST", json: { folderId: folder.id, channel: ch?.id, dryRun } });
      if (dryRun) setPreview({ jobs: r.jobs ?? [], skipped: r.skipped });
      else { setResults(r.results ?? []); setPreview(null); toast(`Imported ${(r.results ?? []).filter((x) => x.ok).length} job(s)`); await refresh(); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function runBulk() {
    setErr("");
    try {
      const body = JSON.parse(bulk);
      const r = await api<{ results?: Result[]; created?: boolean }>("/jobs", { method: "POST", json: Array.isArray(body) ? { jobs: body } : body });
      setResults(r.results ?? [{ ok: true, created: r.created }]); await refresh();
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Import a Drive episode folder</CardTitle>
          <CardDescription>Each folder with an MP4 + <code>metadata.json</code> becomes a job (Ep folder and its “Short NN” subfolders). Re-importing is safe: keys are <code>drive:&lt;fileId&gt;</code>.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Channel: <b className="text-foreground">{ch ? ch.title : "select a channel in the header"}</b></div>
          {youtubeMode === "live" && driveScope === "file" && <Alert>This environment uses the drive.file scope. Pick a folder in Google Picker, or paste an id the app already opened. Listing a whole Drive needs <code>DRIVE_SCOPE=readonly</code>.</Alert>}
          <div className="flex gap-2"><Input placeholder="Drive folder id" value={folder.id} onChange={(e) => setFolder({ id: e.target.value, name: "" })} /><Button variant="outline" disabled={!ch} onClick={() => setPicker(true)}>Browse</Button></div>
          {folder.name && <p className="text-xs text-muted-foreground">📁 {folder.name}</p>}
          <div className="flex gap-2"><Button variant="secondary" disabled={busy || !ch || folder.id.length < 10} onClick={() => run(true)}>Dry run</Button><Button disabled={busy || !ch || folder.id.length < 10} onClick={() => run(false)}>Import</Button></div>
          {preview && (
            <div className="space-y-2">
              <Table><THead><TR><TH>Title</TH><TH>Type</TH><TH>Thumb</TH><TH>Publish</TH></TR></THead>
                <TBody>{preview.jobs.map((j) => <TR key={j.idempotencyKey}><TD>{j.metadata.title ?? <i className="text-red-400">missing title</i>}</TD><TD>{j.metadata.type}</TD><TD>{j.thumbnail ? "✓" : "—"}</TD><TD className="text-xs">{j.metadata.publishAt ?? "auto-slot"}</TD></TR>)}
                  {preview.jobs.length === 0 && <TR><TD colSpan={4} className="text-muted-foreground">Nothing importable found</TD></TR>}</TBody></Table>
              {preview.skipped.map((s, i) => <Alert key={i} variant="warning">Skipped {s.folder}: {s.reason}</Alert>)}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bulk JSON</CardTitle><CardDescription>Paste one job, an array, or <code>{"{\"jobs\":[…]}"}</code> (same format agents POST).</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={12} className="font-mono text-xs" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder='[{"idempotencyKey":"ep05","channel":"@meeyazhpirai","video":{"driveFileId":"…"},"metadata":{"title":"Ep 05","type":"long"}}]' />
          <Button onClick={runBulk} disabled={!bulk.trim()}>Submit</Button>
        </CardContent>
      </Card>
      {err && <Alert variant="destructive" className="lg:col-span-2">{err}</Alert>}
      {results && <Card className="lg:col-span-2"><CardHeader><CardTitle>Results</CardTitle></CardHeader><CardContent>
        <ul className="space-y-1 text-sm">{results.map((r, i) => <li key={i} className={r.ok ? "" : "text-red-400"}>{r.ok ? (r.created ? "✓ created" : "= already existed") : "✕"} {r.title ?? ""} {r.publishAt ? `· ${r.publishAt}` : ""} {r.error ?? ""}</li>)}</ul></CardContent></Card>}
      <DrivePicker open={picker} onOpenChange={setPicker} channel={ch?.id ?? ""} accept="folder" onPick={(f) => setFolder({ id: f.id, name: f.name })} />
    </div>
  );
}
