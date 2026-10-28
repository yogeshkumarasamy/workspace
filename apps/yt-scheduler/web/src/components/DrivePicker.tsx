import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@repo/ui/shadcn";
import { api, getRuntimeConfig } from "../api";
import type { DriveFile } from "../api";
import { useApp } from "../state";
import { FOLDER_MIME, pickerViewPlan, type PickerAccept } from "../picker-views";

const FOLDER = FOLDER_MIME;
/** Default browse root: user's production episode library folder. */
const DEFAULT_DRIVE_FOLDER = "1bDXcqn6u8tp6GZ6ceumvKNfiDqaPF2sV";

interface PickerDoc { id: string; name: string; mimeType: string }
interface PickerBuilder {
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  addView(view: unknown): PickerBuilder;
  setCallback(cb: (data: { action: string; docs?: PickerDoc[] }) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}
interface DocsView {
  setSelectFolderEnabled(enabled: boolean): DocsView;
  setMimeTypes(mimeTypes: string): DocsView;
  setIncludeFolders(included: boolean): DocsView;
  setParent(folderId: string): DocsView;
  setEnableDrives(enabled: boolean): DocsView;
}

declare global {
  interface Window {
    gapi?: { load(name: string, options: { callback(): void }): void };
    google?: {
      picker: {
        Action: { PICKED: string };
        ViewId: { DOCS: string; DOCS_VIDEOS: string; DOCS_IMAGES: string; FOLDERS: string };
        DocsView: new (viewId: string) => DocsView;
        PickerBuilder: new () => PickerBuilder;
      };
    };
  }
}

function pickerAppId(clientId: string): string | null {
  const match = /^(\d+)-/.exec(clientId);
  return match ? match[1] : null;
}

function loadPickerApi(): Promise<void> {
  if (window.google?.picker) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const ready = () => {
      const gapi = window.gapi;
      if (!gapi) { reject(new Error("Google Picker failed to load")); return; }
      gapi.load("picker", { callback: () => resolve() });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-picker]");
    if (existing) { existing.addEventListener("load", ready); ready(); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.dataset.googlePicker = "1";
    script.onload = ready;
    script.onerror = () => reject(new Error("Google Picker failed to load"));
    document.head.appendChild(script);
  });
}

function addPickerViews(
  builder: PickerBuilder,
  picker: NonNullable<Window["google"]>["picker"],
  accept: PickerAccept,
): PickerBuilder {
  const plan = pickerViewPlan(accept);
  if (plan.kind === "folder") {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setMimeTypes(FOLDER)
      .setParent(DEFAULT_DRIVE_FOLDER)
      .setEnableDrives(true);
    return builder.addView(view);
  }
  const primary = new picker.DocsView(picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setMimeTypes(plan.primary.mimeTypes)
    .setParent(DEFAULT_DRIVE_FOLDER)
    .setEnableDrives(true);
  let next = builder.addView(primary);
  const secondaryId =
    plan.secondary.viewId === "DOCS_IMAGES" ? picker.ViewId.DOCS_IMAGES : picker.ViewId.DOCS_VIDEOS;
  next = next.addView(
    new picker.DocsView(secondaryId)
      .setParent(DEFAULT_DRIVE_FOLDER)
      .setEnableDrives(true),
  );
  return next;
}

/** Browse Drive folders and pick a file (accept = mime prefix) or a folder (accept="folder"). */
export function DrivePicker({ open, onOpenChange, channel, accept, onPick }: {
  open: boolean; onOpenChange(o: boolean): void; channel: string; accept: PickerAccept; onPick(f: DriveFile): void;
}) {
  const { youtubeMode, driveScope } = useApp();
  const runtime = getRuntimeConfig();
  const pickerReady = youtubeMode === "live" && Boolean(runtime?.googleClientId && runtime?.pickerApiKey);
  const browse = youtubeMode !== "live" || driveScope === "readonly";
  const [stack, setStack] = useState<{ id: string; name: string }[]>([{ id: DEFAULT_DRIVE_FOLDER, name: "Library" }]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const [picking, setPicking] = useState(false);
  const cur = stack[stack.length - 1]!;
  useEffect(() => {
    if (!open || !browse) return;
    setLoading(true); setErr("");
    api<DriveFile[]>(`/drive/list?folderId=${encodeURIComponent(cur.id)}${channel ? `&channel=${channel}` : ""}`)
      .then(setFiles).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [open, cur.id, channel, browse]);
  const ok = (f: DriveFile) => (accept === "folder" ? f.mimeType === FOLDER : f.mimeType.startsWith(accept));
  async function openGooglePicker() {
    const clientId = runtime?.googleClientId;
    const pickerKey = runtime?.pickerApiKey;
    if (!clientId || !pickerKey) return;
    setPicking(true); setErr("");
    try {
      const token = await api<{ accessToken: string }>(`/google/access-token${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`);
      await loadPickerApi();
      const picker = window.google?.picker;
      if (!picker) throw new Error("Google Picker failed to load");
      const appId = pickerAppId(clientId);
      let builder = new picker.PickerBuilder()
        .setOAuthToken(token.accessToken)
        .setDeveloperKey(pickerKey);
      builder = addPickerViews(builder, picker, accept);
      if (appId) builder = builder.setAppId(appId);
      builder.setCallback((data) => {
        const doc = data.docs?.[0];
        if (data.action === picker.Action.PICKED && doc) {
          onPick({ id: doc.id, name: doc.name, mimeType: doc.mimeType || (accept === "folder" ? FOLDER : accept) });
          onOpenChange(false);
        }
      }).build().setVisible(true);
    } catch (e) { setErr((e as Error).message); } finally { setPicking(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Pick ${accept === "folder" ? "a folder" : accept === "video/" ? "a video" : "an image"} from Drive`}>
      {pickerReady && <div className="mb-3"><Button onClick={openGooglePicker} disabled={picking}>{picking ? "Opening Picker…" : "Open Google Picker"}</Button></div>}
      {!browse && <p className="mb-3 text-sm text-muted-foreground">drive.file cannot list a folder this app has not opened. Use Google Picker, or paste an id.</p>}
      {browse && <p className="mb-3 text-sm text-muted-foreground">Starts in your Library folder. After a Drive scope change, reconnect Drive under Channels.</p>}
      {browse && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1 text-sm">
            {stack.map((s, i) => (
              <span key={s.id}>{i > 0 && " / "}<button className="text-blue-400 hover:underline" onClick={() => setStack(stack.slice(0, i + 1))}>{s.name}</button></span>
            ))}
            <span className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => setStack([{ id: "root", name: "My Drive" }])}>My Drive</Button>
            <Button size="sm" variant="ghost" onClick={() => setStack([{ id: DEFAULT_DRIVE_FOLDER, name: "Library" }])}>Library</Button>
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
        </>
      )}
      {!browse && err && <p className="mb-2 text-sm text-red-400">{err}</p>}
      <div className="mt-3 flex gap-2">
        {browse && accept === "folder" && <Button variant="secondary" onClick={() => { onPick({ id: cur.id, name: cur.name, mimeType: FOLDER }); onOpenChange(false); }}>Use current folder</Button>}
        <Input placeholder="…or paste a Drive id" value={manual} onChange={(e) => setManual(e.target.value)} />
        <Button variant="outline" disabled={manual.length < 10} onClick={() => { onPick({ id: manual.trim(), name: manual.trim(), mimeType: accept === "folder" ? FOLDER : accept }); onOpenChange(false); }}>Use id</Button>
      </div>
    </Dialog>
  );
}
