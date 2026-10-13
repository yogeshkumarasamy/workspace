import { useMemo, useState } from "react";
import { Button, Checkbox, Input, Select, Table, TBody, TD, TH, THead, TR } from "@repo/ui/shadcn";
import { api } from "../api";
import type { Job } from "../api";
import { useApp } from "../state";
import { fmt, fromInput, tzLabel } from "../time";
import { STATUSES, StatusBadge } from "./StatusBadge";
import { useNarrow } from "../pwa";

export function JobsTable({ onOpen }: { onOpen(j: Job): void }) {
  const { jobs, tz, refresh, toast, channelById, channelId } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState("");
  const narrow = useNarrow();
  const rows = useMemo(() => jobs.filter((j) =>
    (!status || j.status === status) && (!type || j.metadata.type === type) &&
    (!q || `${j.metadata.title} ${j.idempotencyKey} ${j.metadata.tags.join(" ")} ${j.youtubeVideoId ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [jobs, q, status, type]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = rows.length > 0 && rows.every((r) => sel.has(r.id));

  async function bulk(action: "cancel" | "retry" | "reschedule" | "autoslot") {
    const publishAt = action === "reschedule" ? fromInput(when, tz) : undefined;
    if (action === "reschedule" && !publishAt) return toast("Pick a date/time first", "err");
    const r = await api<{ results: { ok: boolean; error?: string }[] }>("/jobs/bulk", { method: "POST", json: { ids: [...sel], action, publishAt } });
    const bad = r.results.filter((x) => !x.ok);
    toast(`${action}: ${r.results.length - bad.length} ok${bad.length ? `, ${bad.length} failed (${bad[0]!.error})` : ""}`, bad.length ? "err" : "ok");
    setSel(new Set()); await refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="w-full sm:max-w-xs" placeholder="Search title, tag, key, video id…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="flex-1 sm:w-40 sm:flex-none" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select className="flex-1 sm:w-32 sm:flex-none" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option><option value="short">Shorts</option><option value="long">Long</option></Select>
        <span className="self-center text-xs text-muted-foreground">{rows.length} jobs</span>
      </div>
      {sel.size > 0 && (
        <div className="sticky top-[7.5rem] z-30 flex flex-wrap items-center gap-2 rounded-lg border bg-muted p-2 text-sm sm:static sm:bg-muted/50">
          <b>{sel.size} selected</b>
          <Button size="sm" variant="outline" onClick={() => bulk("cancel")}>Cancel</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("retry")}>Retry</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("autoslot")}>Auto-slot</Button>
          <Input type="datetime-local" className="h-8 w-52" value={when} onChange={(e) => setWhen(e.target.value)} />
          <Button size="sm" onClick={() => bulk("reschedule")}>Reschedule ({tzLabel(tz)})</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}
      {narrow ? (
        <ul className="divide-y rounded-lg border">
          {rows.map((j) => (
            <li key={j.id} className="flex items-start gap-3 px-3 py-3">
              <span className="pt-1"><Checkbox aria-label="select" checked={sel.has(j.id)} onCheckedChange={() => toggle(j.id)} /></span>
              <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(j)}>
                <div className="truncate text-sm font-medium">{j.metadata.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><StatusBadge status={j.status} /><span>{j.metadata.type}</span><span>{fmt(j.publishAt, tz)}</span>{!channelId && <span>{channelById(j.channelId)?.title}</span>}</div>
                {j.lastError && <div className="mt-1 truncate text-xs text-red-400">{j.lastError}</div>}
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No jobs</li>}
        </ul>
      ) : (
      <div className="rounded-lg border">
        <Table>
          <THead><TR><TH className="w-8"><Checkbox checked={all} onCheckedChange={(v) => setSel(v ? new Set(rows.map((r) => r.id)) : new Set())} /></TH><TH>Title</TH>{!channelId && <TH>Channel</TH>}<TH>Type</TH><TH>Status</TH><TH>Publish ({tzLabel(tz)})</TH><TH>YouTube</TH></TR></THead>
          <TBody>
            {rows.map((j) => (
              <TR key={j.id} className="cursor-pointer" onClick={() => onOpen(j)}>
                <TD onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.has(j.id)} onCheckedChange={() => toggle(j.id)} /></TD>
                <TD><div className="font-medium">{j.metadata.title}</div>{j.lastError && <div className="max-w-md truncate text-xs text-red-400">{j.lastError}</div>}{j.warnings.length > 0 && <div className="text-xs text-amber-400">⚠ {j.warnings.length} warning(s)</div>}</TD>
                {!channelId && <TD className="text-xs">{channelById(j.channelId)?.title}</TD>}
                <TD className="text-xs">{j.metadata.type}</TD>
                <TD><StatusBadge status={j.status} />{j.attempts > 0 && <span className="ml-1 text-xs text-muted-foreground">×{j.attempts}</span>}</TD>
                <TD className="whitespace-nowrap text-xs">{fmt(j.publishAt, tz)}</TD>
                <TD className="text-xs">{j.youtubeVideoId ? <a onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer" href={`https://studio.youtube.com/video/${j.youtubeVideoId}/edit`}>{j.youtubeVideoId}</a> : "—"}</TD>
              </TR>
            ))}
            {rows.length === 0 && <TR><TD colSpan={7} className="py-8 text-center text-muted-foreground">No jobs</TD></TR>}
          </TBody>
        </Table>
      </div>
      )}
    </div>
  );
}
