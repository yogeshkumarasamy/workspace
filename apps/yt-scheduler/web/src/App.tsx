import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Progress, Select, Tabs } from "@repo/ui/shadcn";
import { api, connectUrl, getKey, getRuntimeConfig, initApi, setKey } from "./api";
import type { Job } from "./api";
import { routerBasename } from "./runtime";
import { AppProvider, useApp } from "./state";
import { fmt } from "./time";
import { Calendar } from "./components/Calendar";
import { JobsTable } from "./components/JobsTable";
import { JobForm } from "./components/JobForm";
import { JobDetail } from "./components/JobDetail";
import { ImportPanel } from "./components/ImportPanel";
import { Settings } from "./components/Settings";
import { InstallButton, OfflineScreen, UpdateToast, useOnline } from "./pwa";

const PAGES = ["calendar", "jobs", "import", "settings"] as const;
type Page = (typeof PAGES)[number];

function isPage(value: string): value is Page {
  return (PAGES as readonly string[]).includes(value);
}

export function App() {
  const [authed, setAuthed] = useState<boolean | "offline" | null>(null);
  const check = () => {
    const preset = getRuntimeConfig()?.apiKey ?? "";
    if (!getKey() && preset) setKey(preset);
    if (!getKey()) { setAuthed(false); return; }
    api("/channels").then(() => setAuthed(true)).catch((e) => setAuthed(e instanceof TypeError || !navigator.onLine ? "offline" : false));
  };
  useEffect(() => { initApi().finally(check); }, []);
  return (
    <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
      <UpdateToast />
      {authed === "offline" ? <OfflineScreen onRetry={check} />
        : authed === null ? null
        : !authed ? <Login onOk={() => setAuthed(true)} />
        : <AppProvider><Shell onLogout={() => { setKey(""); setAuthed(false); }} /></AppProvider>}
    </BrowserRouter>
  );
}

function Login({ onOk }: { onOk(): void }) {
  const [k, setK] = useState(getRuntimeConfig()?.apiKey ?? "");
  const [err, setErr] = useState("");
  const go = async () => { setKey(k); try { await api("/channels"); onOk(); } catch { setKey(""); setErr("Invalid API key"); } };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>📅 YT Scheduler</CardTitle><CardDescription>Enter the API key (the <code>API_KEY</code> env var) to continue.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" autoFocus value={k} onChange={(e) => setK(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="API key" />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button className="w-full" onClick={go} disabled={!k}>Sign in</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Shell({ onLogout }: { onLogout(): void }) {
  const { channels, channelId, setChannelId, quota, audited, jobs, tz, youtubeMode } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const segment = pathname.replace(/^\//, "").split("/")[0] ?? "";
  const page: Page = isPage(segment) ? segment : "calendar";
  const [form, setForm] = useState<{ open: boolean; job?: Job | null; at?: string }>({ open: false });
  const [detail, setDetail] = useState<Job | null>(null);
  useEffect(() => { if (detail) setDetail(jobs.find((j) => j.id === detail.id) ?? null); }, [jobs]); // eslint-disable-line
  const connected = params.get("connected");
  const online = useOnline();
  const counts = jobs.reduce<Record<string, number>>((a, j) => ({ ...a, [j.status]: (a[j.status] ?? 0) + 1 }), {});

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <span className="text-lg font-semibold">📅 <span className="max-sm:hidden">YT Scheduler</span></span>
          <Select aria-label="Channel" className="w-auto min-w-0 max-w-[11rem] flex-1 sm:w-48 sm:flex-none" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">All channels ({channels.length})</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.title} {c.handle ?? ""}</option>)}
          </Select>
          <Button size="sm" variant="outline" className="max-sm:hidden" onClick={() => (location.href = connectUrl())}>+ Connect channel</Button>
          <Tabs className="order-last w-full sm:order-none sm:w-auto [&>button]:flex-1" value={page} onValueChange={(next) => navigate(next === "calendar" ? "/" : `/${next}`)} items={[{ value: "calendar", label: "Calendar" }, { value: "jobs", label: "Jobs" }, { value: "import", label: "Import" }, { value: "settings", label: "Channels" }]} />
          <span className="flex-1 max-sm:hidden" />
          {quota && (
            <div className="w-40 text-xs max-md:hidden lg:w-52" title={`${quota.note} Resets ${fmt(quota.resetsAt, tz)}`}>
              <div className="mb-1 flex justify-between text-muted-foreground"><span>Quota {quota.used.toLocaleString()}/{quota.limit.toLocaleString()}</span><span>~{quota.uploadsLeftToday} left</span></div>
              <Progress value={(quota.used / quota.limit) * 100} />
            </div>
          )}
          <InstallButton />
          <Button size="sm" onClick={() => setForm({ open: true, job: null })}>+ <span className="max-sm:hidden">New job</span><span className="sm:hidden">New</span></Button>
          <Button size="sm" variant="ghost" className="max-sm:px-2" onClick={onLogout} aria-label="Sign out">⎋<span className="max-sm:hidden">Sign out</span></Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
        {!online && <Alert variant="destructive">You’re offline — showing the last loaded data. Changes need a connection.</Alert>}
        {quota && <div className="md:hidden"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Quota {quota.used.toLocaleString()}/{quota.limit.toLocaleString()}</span><span>~{quota.uploadsLeftToday} uploads left</span></div><Progress value={(quota.used / quota.limit) * 100} /></div>}
        {youtubeMode === "mock" && <Alert>Mock YouTube: nothing on this environment is sent to YouTube.</Alert>}
        {!audited && <Alert variant="warning"><b>Unverified API project:</b> until Google approves the YouTube API audit, uploads from this app are locked to <b>Private</b> and scheduled publishing will not go public. See README → “API audit”.</Alert>}
        {connected && <Alert>Connected: {connected}</Alert>}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{Object.entries(counts).map(([s, n]) => <span key={s} className="rounded-md border px-2 py-0.5">{s}: {n}</span>)}</div>
        <Routes>
          <Route path="/" element={<Calendar onOpen={setDetail} onCreateAt={(at) => setForm({ open: true, job: null, at })} />} />
          <Route path="/calendar" element={<Calendar onOpen={setDetail} onCreateAt={(at) => setForm({ open: true, job: null, at })} />} />
          <Route path="/jobs" element={<JobsTable onOpen={setDetail} />} />
          <Route path="/import" element={<ImportPanel />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <JobForm open={form.open} job={form.job} initialPublishAt={form.at} onOpenChange={(o) => setForm({ open: o })} />
      <JobDetail job={detail} onClose={() => setDetail(null)} onEdit={(j) => { setDetail(null); setForm({ open: true, job: j }); }} />
    </div>
  );
}
