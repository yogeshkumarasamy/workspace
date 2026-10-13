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

type Page = "calendar" | "jobs" | "import" | "settings";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { if (!getKey()) { setAuthed(false); return; } api("/channels").then(() => setAuthed(true)).catch(() => setAuthed(false)); }, []);
  if (authed === null) return null;
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  return <AppProvider><Shell onLogout={() => { setKey(""); setAuthed(false); }} /></AppProvider>;
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
  const counts = jobs.reduce<Record<string, number>>((a, j) => ({ ...a, [j.status]: (a[j.status] ?? 0) + 1 }), {});

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-lg font-semibold">📅 YT Scheduler</span>
          <Select className="w-48" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">All channels ({channels.length})</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.title} {c.handle ?? ""}</option>)}
          </Select>
          <Button size="sm" variant="outline" onClick={() => (location.href = connectUrl())}>+ Connect channel</Button>
          <Tabs value={page} onValueChange={setPage} items={[{ value: "calendar", label: "Calendar" }, { value: "jobs", label: "Jobs" }, { value: "import", label: "Import" }, { value: "settings", label: "Channels" }]} />
          <span className="flex-1" />
          {quota && (
            <div className="w-52 text-xs" title={`${quota.note} Resets ${fmt(quota.resetsAt, tz)}`}>
              <div className="mb-1 flex justify-between text-muted-foreground"><span>Quota {quota.used.toLocaleString()}/{quota.limit.toLocaleString()}</span><span>~{quota.uploadsLeftToday} uploads left</span></div>
              <Progress value={(quota.used / quota.limit) * 100} />
            </div>
          )}
          <Button size="sm" onClick={() => setForm({ open: true, job: null })}>+ New job</Button>
          <Button size="sm" variant="ghost" onClick={onLogout}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 p-4">
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
