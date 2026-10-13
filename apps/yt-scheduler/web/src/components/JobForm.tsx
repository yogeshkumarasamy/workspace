import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, Label, Select, Switch, Tabs, Textarea, Alert } from "@repo/ui/shadcn";
import { api, driveImageUrl } from "../api";
import type { Job, Metadata, Source } from "../api";
import { useApp } from "../state";
import { fromInput, toInput, tzLabel } from "../time";
import { DrivePicker } from "./DrivePicker";

const CATEGORIES: [string, string][] = [["1", "Film & Animation"], ["27", "Education"], ["24", "Entertainment"], ["22", "People & Blogs"], ["10", "Music"], ["20", "Gaming"], ["28", "Science & Technology"]];
const LANGS: [string, string][] = [["ta", "Tamil"], ["en", "English"], ["hi", "Hindi"], ["te", "Telugu"], ["ml", "Malayalam"], ["kn", "Kannada"]];

type SrcState = { mode: "drive" | "url"; value: string; name?: string };
const fromSource = (s: Source | null | undefined): SrcState => (!s ? { mode: "drive", value: "" } : s.kind === "drive" ? { mode: "drive", value: s.fileId } : { mode: "url", value: s.url });
const toSource = (s: SrcState) => (!s.value ? undefined : s.mode === "drive" ? { driveFileId: s.value.trim() } : { url: s.value.trim() });

export function JobForm({ open, onOpenChange, job, initialPublishAt }: { open: boolean; onOpenChange(o: boolean): void; job?: Job | null; initialPublishAt?: string }) {
  const { channels, channel, refresh, toast } = useApp();
  const [chId, setChId] = useState("");
  const ch = channels.find((c) => c.id === chId) ?? null;
  const tz = ch?.slots.timezone ?? "Asia/Kolkata";
  const [video, setVideo] = useState<SrcState>({ mode: "drive", value: "" });
  const [thumb, setThumb] = useState<SrcState>({ mode: "drive", value: "" });
  const [m, setM] = useState<Metadata>(blank());
  const [tags, setTags] = useState("");
  const [publishLocal, setPublishLocal] = useState("");
  const [key, setKey] = useState("");
  const [uploadMode, setUploadMode] = useState<"now" | "at">("now");
  const [uploadLocal, setUploadLocal] = useState("");
  const [playlists, setPlaylists] = useState<{ id: string; title: string }[]>([]);
  const [picker, setPicker] = useState<null | "video" | "thumb">(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = !!job && !["queued", "failed", "cancelled"].includes(job.status);

  useEffect(() => {
    if (!open) return;
    const c = job ? channels.find((x) => x.id === job.channelId) : channel ?? channels[0];
    setChId(c?.id ?? "");
    const ctz = c?.slots.timezone ?? "Asia/Kolkata";
    setVideo(fromSource(job?.video)); setThumb(fromSource(job?.thumbnail));
    const meta = job ? { ...job.metadata } : { ...blank(), ...stripPlaylists(c?.defaults ?? {}) };
    setM(meta); setTags(meta.tags.join(", "));
    setPublishLocal(toInput(job?.publishAt ?? initialPublishAt, ctz));
    setKey(job?.idempotencyKey ?? ""); setUploadMode(job?.uploadMode ?? "now"); setUploadLocal(job?.uploadMode === "at" ? toInput(job.runAt, ctz) : "");
    setError("");
  }, [open, job, channel, channels, initialPublishAt]);

  useEffect(() => { if (open && chId) api<{ id: string; title: string }[]>(`/channels/${chId}/playlists`).then(setPlaylists).catch(() => setPlaylists([])); }, [open, chId]);
  useEffect(() => {
    let url = ""; setPreview("");
    if (!thumb.value) return;
    if (thumb.mode === "url") { setPreview(thumb.value); return; }
    if (chId && thumb.value.length > 10) driveImageUrl(thumb.value, chId).then((u) => { url = u; setPreview(u); }).catch(() => setPreview(""));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [thumb, chId]);

  const defaultPlaylist = m.type === "short" ? ch?.defaults.shortsPlaylist : ch?.defaults.longPlaylist;
  const set = <K extends keyof Metadata>(k: K, v: Metadata[K]) => setM((x) => ({ ...x, [k]: v }));
  const tagLen = useMemo(() => tags.split(",").map((t) => t.trim()).filter(Boolean).join(",").length, [tags]);

  async function suggest() {
    if (!ch) return;
    const r = await api<{ publishAt: string }>(`/slots/next?channel=${ch.id}&type=${m.type}`);
    setPublishLocal(toInput(r.publishAt, tz));
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const metadata = { ...m, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), publishAt: fromInput(publishLocal, tz), playlist: m.playlist || undefined };
      if (locked) {
        await api(`/jobs/${job!.id}/reschedule`, { method: "POST", json: { publishAt: metadata.publishAt } });
      } else if (job) {
        await api(`/jobs/${job.id}`, { method: "PATCH", json: { video: toSource(video), thumbnail: toSource(thumb) ?? null, metadata, uploadMode, uploadAt: uploadMode === "at" ? fromInput(uploadLocal, tz) : undefined } });
      } else {
        await api("/jobs", { method: "POST", json: {
          idempotencyKey: key || `ui:${Date.now()}`, channel: ch?.youtubeChannelId, video: toSource(video), thumbnail: toSource(thumb), metadata: { ...metadata, channel: undefined },
          uploadMode, uploadAt: uploadMode === "at" ? fromInput(uploadLocal, tz) : undefined,
        } });
      }
      toast(job ? "Job updated" : "Job created"); await refresh(); onOpenChange(false);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const src = (label: string, s: SrcState, setS: (v: SrcState) => void, which: "video" | "thumb") => (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><Label>{label}</Label>
        <Tabs value={s.mode} onValueChange={(v) => setS({ mode: v, value: "" })} items={[{ value: "drive", label: "Drive" }, { value: "url", label: "URL" }]} /></div>
      <div className="flex gap-2">
        <Input disabled={locked} placeholder={s.mode === "drive" ? "Drive file id" : "https://…"} value={s.value} onChange={(e) => setS({ ...s, value: e.target.value })} />
        {s.mode === "drive" && <Button type="button" variant="outline" disabled={locked || !chId} onClick={() => setPicker(which)}>Browse</Button>}
      </div>
      {s.name && <p className="text-xs text-muted-foreground">{s.name}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={job ? (locked ? "Reschedule uploaded video" : "Edit job") : "New upload job"} className="max-w-4xl">
      {locked && <Alert variant="warning" className="mb-4">This video is already on YouTube ({job!.youtubeVideoId}). Only the publish time can change here; it is updated on YouTube via videos.update.</Alert>}
      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Channel</Label>
              <Select value={chId} disabled={!!job} onChange={(e) => setChId(e.target.value)}>{channels.map((c) => <option key={c.id} value={c.id}>{c.title} {c.handle ?? ""}</option>)}</Select></div>
            <div className="space-y-2"><Label>Type</Label>
              <Tabs value={m.type} onValueChange={(v) => !locked && set("type", v)} items={[{ value: "long", label: "Long episode" }, { value: "short", label: "Short" }]} /></div>
          </div>
          {src("Video", video, setVideo, "video")}
          <div className="space-y-2">
            <div className="flex justify-between"><Label htmlFor="t">Title</Label><span className={`text-xs ${m.title.length > 100 ? "text-red-400" : "text-muted-foreground"}`}>{m.title.length}/100</span></div>
            <Input id="t" disabled={locked} value={m.title} onChange={(e) => set("title", e.target.value)} placeholder="Ep 04 - மீயாழ் & பிறை | …" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><Label>Description</Label><span className="text-xs text-muted-foreground">{m.description.length}/5000</span></div>
            <Textarea disabled={locked} rows={5} value={m.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><Label>Tags (comma separated)</Label><span className={`text-xs ${tagLen > 500 ? "text-red-400" : "text-muted-foreground"}`}>{tagLen}/500</span></div>
            <Input disabled={locked} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tamil kids, cartoon" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Category</Label><Select disabled={locked} value={m.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
            <div className="space-y-2"><Label>Language</Label><Select disabled={locked} value={m.defaultLanguage} onChange={(e) => setM({ ...m, defaultLanguage: e.target.value, defaultAudioLanguage: e.target.value })}>{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
            <div className="space-y-2"><Label>Privacy</Label><Select disabled={locked} value={m.privacyStatus} onChange={(e) => set("privacyStatus", e.target.value as Metadata["privacyStatus"])}><option value="private">private (scheduled)</option><option value="unlisted">unlisted</option><option value="public">public</option></Select></div>
          </div>
          <div className="space-y-2"><Label>Playlist</Label>
            <Input disabled={locked} list="pl" value={m.playlist ?? ""} placeholder={defaultPlaylist ? `channel default: ${defaultPlaylist}` : "playlist name or PL… id"} onChange={(e) => set("playlist", e.target.value)} />
            <datalist id="pl">{playlists.map((p) => <option key={p.id} value={p.title} />)}</datalist>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" disabled={locked} checked={m.createPlaylistIfMissing} onChange={(e) => set("createPlaylistIfMissing", e.target.checked)} /> create if missing</label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch disabled={locked} checked={m.madeForKids} onCheckedChange={(v) => set("madeForKids", v)} /> Made for kids</label>
            <label className="flex items-center gap-2 text-sm"><Switch disabled={locked} checked={m.containsSyntheticMedia} onCheckedChange={(v) => set("containsSyntheticMedia", v)} /> Altered / synthetic content</label>
          </div>
        </div>
        <div className="space-y-4">
          {src("Thumbnail", thumb, setThumb, "thumb")}
          <div className={`flex items-center justify-center overflow-hidden rounded-lg border bg-muted ${m.type === "short" ? "aspect-[9/16]" : "aspect-video"}`}>
            {preview ? <img src={preview} alt="thumbnail" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No thumbnail preview</span>}
          </div>
          <div className="space-y-2">
            <Label>Publish at ({tzLabel(tz)})</Label>
            <Input type="datetime-local" value={publishLocal} onChange={(e) => setPublishLocal(e.target.value)} />
            <div className="flex gap-2"><Button type="button" size="sm" variant="secondary" onClick={suggest} disabled={!ch}>Next free slot</Button>
              {!locked && <Button type="button" size="sm" variant="ghost" onClick={() => setPublishLocal("")}>Auto on save</Button>}</div>
            <p className="text-xs text-muted-foreground">Empty = auto-slot ({m.type === "short" ? `daily ${ch?.slots.shortsTime ?? "07:00"}` : `weekly ${ch?.slots.longTime ?? "18:00"}`} {tzLabel(tz)}).</p>
          </div>
          {!locked && <div className="space-y-2"><Label>Upload</Label>
            <Tabs value={uploadMode} onValueChange={setUploadMode} items={[{ value: "now", label: "Now (YouTube schedules)" }, { value: "at", label: "Later" }]} />
            {uploadMode === "at" && <Input type="datetime-local" value={uploadLocal} onChange={(e) => setUploadLocal(e.target.value)} />}</div>}
          {!job && <div className="space-y-2"><Label>Idempotency key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="auto" /></div>}
        </div>
      </div>
      {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={busy || !chId || (!locked && !video.value) || !m.title || m.title.length > 100}>{busy ? "Saving…" : locked ? "Reschedule" : job ? "Save" : "Create job"}</Button>
      </div>
      <DrivePicker open={!!picker} onOpenChange={(o) => !o && setPicker(null)} channel={chId} accept={picker === "thumb" ? "image/" : "video/"}
        onPick={(f) => {
          if (picker === "thumb") setThumb({ mode: "drive", value: f.id, name: f.name });
          else { setVideo({ mode: "drive", value: f.id, name: f.name }); if (!m.title) set("title", f.name.replace(/\.[^.]+$/, "").slice(0, 100)); if (!key) setKey(`drive:${f.id}`); }
        }} />
    </Dialog>
  );
}

function blank(): Metadata {
  return { title: "", description: "", tags: [], categoryId: "1", defaultLanguage: "ta", defaultAudioLanguage: "ta", madeForKids: true, containsSyntheticMedia: false, type: "long", privacyStatus: "private", createPlaylistIfMissing: false };
}
function stripPlaylists(d: Record<string, unknown>) { const { shortsPlaylist: _a, longPlaylist: _b, ...r } = d; void _a; void _b; return r as Partial<Metadata>; }
