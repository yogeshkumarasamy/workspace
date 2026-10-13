import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Progress, Select, Tabs } from "@repo/ui/shadcn";
import { api, connectUrl, getKey, setKey } from "./api";
import type { Job } from "./api";
import { AppProvider, useApp } from "./state";
import { fmt } from "./time";
import { Calendar } from "./components/Calendar";
import { JobsTable } from "./components/JobsTable";
import { JobForm } from "./components/JobForm";
import { JobDetail } from "./components/JobDetail";
import { ImportPanel } from "./components/ImportPanel";
import { Settings } from "./components/Settings";
import { InstallButton, OfflineScreen, UpdateToast, useOnline } from "./pwa";

type Page = "calendar" | "jobs" | "import" | "settings";

export function App() {
  const [authed, setAuthed] = useState<boolean | "offline" | null>(null);
  const check = () => {
    if (!getKey()) { setAuthed(false); return; }
    api("/channels").then(() => setAuthed(true)).catch((e) => setAuthed(e instanceof TypeError || !navigator.onLine ? "offline" : false));
  };
  useEffect(check, []);
  return (
    <>
      <UpdateToast />
      {authed === "offline" ? <OfflineScreen onRetry={check} />
        : authed === null ? null
        : !authed ? <Login onOk={() => setAuthed(true)} />
        : <AppProvider><Shell onLogout={() => { setKey(""); setAuthed(false); }} /></AppProvider>}
    </>
  );
}

function Login({ onOk }: { onOk(): void }) {
  const [k, setK] = useState("");
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
  const { channels, channelId, setChannelId, quota, audited, jobs, tz } = useApp();
  const [page, setPage] = useState<Page>((location.hash.slice(1) as Page) || "calendar");
  const [form, setForm] = useState<{ open: boolean; job?: Job | null; at?: string }>({ open: false });
  const [detail, setDetail] = useState<Job | null>(null);
  useEffect(() => { location.hash = page; }, [page]);
  useEffect(() => { if (detail) setDetail(jobs.find((j) => j.id === detail.id) ?? null); }, [jobs]); // eslint-disable-line
  const connected = new URLSearchParams(location.search).get("connected");
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
          <Tabs className="order-last w-full sm:order-none sm:w-auto [&>button]:flex-1" value={page} onValueChange={setPage} items={[{ value: "calendar", label: "Calendar" }, { value: "jobs", label: "Jobs" }, { value: "import", label: "Import" }, { value: "settings", label: "Channels" }]} />
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
        {!audited && <Alert variant="warning"><b>Unverified API project:</b> until Google approves the YouTube API audit, uploads from this app are locked to <b>Private</b> and scheduled publishing will not go public. See README → “API audit”.</Alert>}
        {connected && <Alert>Connected: {connected}</Alert>}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{Object.entries(counts).map(([s, n]) => <span key={s} className="rounded-md border px-2 py-0.5">{s}: {n}</span>)}</div>
        {page === "calendar" && <Calendar onOpen={setDetail} onCreateAt={(at) => setForm({ open: true, job: null, at })} />}
        {page === "jobs" && <JobsTable onOpen={setDetail} />}
        {page === "import" && <ImportPanel />}
        {page === "settings" && <Settings />}
      </main>
      <JobForm open={form.open} job={form.job} initialPublishAt={form.at} onOpenChange={(o) => setForm({ open: o })} />
      <JobDetail job={detail} onClose={() => setDetail(null)} onEdit={(j) => { setDetail(null); setForm({ open: true, job: j }); }} />
    </div>
  );
}
