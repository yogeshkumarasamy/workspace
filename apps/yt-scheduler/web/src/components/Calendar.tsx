import { useMemo, useState } from "react";
import { Button, Tabs } from "@repo/ui/shadcn";
import { api } from "../api";
import type { Job } from "../api";
import { useApp } from "../state";
import { dayKey, fmt, fromWall, tzLabel, wall } from "../time";
import { canMove } from "./StatusBadge";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00–23:00
const color: Record<string, string> = {
  queued: "bg-slate-600", uploading: "bg-amber-600", processing: "bg-amber-600", scheduled: "bg-blue-600", published: "bg-emerald-700", failed: "bg-red-700", cancelled: "bg-zinc-700 line-through",
};

export function Calendar({ onOpen, onCreateAt }: { onOpen(j: Job): void; onCreateAt(iso: string): void }) {
  const { jobs, tz, refresh, toast, channelById } = useApp();
  const [view, setView] = useState<"month" | "week">("month");
  const now = wall(new Date(), tz);
  const [anchor, setAnchor] = useState(() => new Date(Date.UTC(now.y, now.m - 1, now.d)));
  const [drag, setDrag] = useState<string | null>(null);

  const days = useMemo(() => {
    const a = new Date(anchor);
    if (view === "week") { a.setUTCDate(a.getUTCDate() - a.getUTCDay()); return Array.from({ length: 7 }, (_, i) => new Date(a.getTime() + i * 864e5)); }
    const first = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
    const start = new Date(first.getTime() - first.getUTCDay() * 864e5);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 864e5));
  }, [anchor, view]);

  const byDay = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const j of jobs) {
      if (!j.publishAt) continue;
      const w = wall(new Date(j.publishAt), tz);
      const k = dayKey(w.y, w.m, w.d);
      m.set(k, [...(m.get(k) ?? []), j].sort((a, b) => a.publishAt!.localeCompare(b.publishAt!)));
    }
    return m;
  }, [jobs, tz]);

  async function drop(day: Date, hour?: number) {
    const j = jobs.find((x) => x.id === drag);
    setDrag(null);
    if (!j?.publishAt) return;
    const cur = wall(new Date(j.publishAt), tz);
    const iso = fromWall(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour ?? cur.hh, hour === undefined ? cur.mm : 0, tz).toISOString();
    if (iso === new Date(j.publishAt).toISOString()) return;
    try { await api(`/jobs/${j.id}/reschedule`, { method: "POST", json: { publishAt: iso } }); toast(`Moved “${j.metadata.title}” to ${fmt(iso, tz)}${j.youtubeVideoId ? " (YouTube updated)" : ""}`); await refresh(); }
    catch (e) { toast((e as Error).message, "err"); }
  }

  const move = (n: number) => { const a = new Date(anchor); if (view === "week") a.setUTCDate(a.getUTCDate() + 7 * n); else a.setUTCMonth(a.getUTCMonth() + n, 1); setAnchor(a); };
  const title = view === "month" ? new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor)
    : `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(days[0]!)} – ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(days[6]!)}`;
  const todayKey = dayKey(now.y, now.m, now.d);
  const chip = (j: Job) => (
    <div key={j.id} draggable={canMove(j.status)} onDragStart={() => setDrag(j.id)} onClick={(e) => { e.stopPropagation(); onOpen(j); }}
      title={`${j.metadata.title} · ${j.status} · ${channelById(j.channelId)?.title ?? ""}`}
      className={`mb-1 cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] text-white ${color[j.status]} ${canMove(j.status) ? "active:cursor-grabbing" : "opacity-80"}`}>
      {j.metadata.type === "short" ? "▮ " : "▬ "}{fmt(j.publishAt, tz, { timeStyle: "short" })} {j.metadata.title}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => move(-1)}>‹</Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(new Date(Date.UTC(now.y, now.m - 1, now.d)))}>Today</Button>
        <Button variant="outline" size="sm" onClick={() => move(1)}>›</Button>
        <h2 className="ml-2 text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">({tzLabel(tz)}) · drag a video to reschedule · click a day to add</span>
        <span className="flex-1" />
        <Tabs value={view} onValueChange={setView} items={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }]} />
      </div>
      {view === "month" ? (
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
          {DOW.map((d) => <div key={d} className="border-b bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{d}</div>)}
          {days.map((d) => {
            const k = dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
            const other = d.getUTCMonth() !== anchor.getUTCMonth();
            return (
              <div key={k} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(d)}
                onClick={() => onCreateAt(fromWall(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 7, 0, tz).toISOString())}
                className={`min-h-[108px] cursor-pointer border-b border-r p-1 hover:bg-muted/40 ${other ? "bg-black/30 text-muted-foreground" : ""}`}>
                <div className={`mb-1 text-xs ${k === todayKey ? "inline-block rounded-full bg-primary px-1.5 text-white" : ""}`}>{d.getUTCDate()}</div>
                {(byDay.get(k) ?? []).map(chip)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b bg-muted text-xs">
            <div />{days.map((d) => { const k = dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); return <div key={k} className={`px-2 py-1 font-medium ${k === todayKey ? "text-primary" : "text-muted-foreground"}`}>{DOW[d.getUTCDay()]} {d.getUTCDate()}</div>; })}
          </div>
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b last:border-0">
              <div className="px-2 py-1 text-[11px] text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
              {days.map((d) => {
                const k = dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
                const items = (byDay.get(k) ?? []).filter((j) => wall(new Date(j.publishAt!), tz).hh === h);
                return <div key={k} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(d, h)} onClick={() => onCreateAt(fromWall(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, 0, tz).toISOString())} className="min-h-[34px] cursor-pointer border-l p-0.5 hover:bg-muted/40">{items.map(chip)}</div>;
              })}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{Object.entries(color).map(([s, c]) => <span key={s} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded ${c}`} />{s}</span>)}<span>▮ short · ▬ long</span></div>
    </div>
  );
}
