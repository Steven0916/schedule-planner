"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import ChangePassword from "@/components/change-password";

type Person = { id: string; name: string };
type Schedule = { id: string; title: string; startAt: string; endAt: string; note: string };
type Attendee = { scheduleId: string; personId: string };
type Data = { people: Person[]; schedules: Schedule[]; attendees: Attendee[] };
const blank: Data = { people: [], schedules: [], attendees: [] };

function formatDay(value: string) { return new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "short" }).format(new Date(value)); }
function formatTime(value: string) { return value.slice(11, 16); }
function initials(name: string) { return Array.from(name).slice(0, 1).join(""); }

export default function Home() {
  const [data, setData] = useState<Data>(blank);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"schedule" | "person" | null>(null);
  const [deleting, setDeleting] = useState<{ type: "schedule" | "person"; id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [note, setNote] = useState("");
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      const body = await res.json() as Data & { error?: string };
      if (res.status === 401) { window.location.assign("/"); return; }
      if (!res.ok) throw new Error(body.error || "載入失敗");
      setData(body); setLoadFailed(false); setError("");
    } catch (err) { setLoadFailed(true); setError(err instanceof Error ? err.message : "載入失敗"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: object) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error); } catch (error) { console.error(error); } };
    register({
      name: "create_attendee", title: "新增與會人員", description: "新增一位與會人員並更新名單。",
      inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false },
      annotations: { readOnlyHint: false },
      async execute(input: unknown) {
        const name = (input as { name?: unknown })?.name;
        if (typeof name !== "string" || !name.trim() || name.length > 80) throw new Error("請輸入有效姓名");
        const response = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
        const result = await response.json() as { id: string; name?: string; title?: string; error?: string };
        if (!response.ok) throw new Error(result.error);
        await load(); return { id: result.id, name: result.name };
      },
    });
    register({
      name: "create_schedule", title: "新增排程", description: "建立排程並更新排程列表。時間格式為 YYYY-MM-DDTHH:mm。",
      inputSchema: { type: "object", properties: { title: { type: "string" }, startAt: { type: "string" }, endAt: { type: "string" }, note: { type: "string" }, personIds: { type: "array", items: { type: "string" } } }, required: ["title", "startAt", "endAt"], additionalProperties: false },
      annotations: { readOnlyHint: false },
      async execute(input: unknown) {
        const value = input as { title?: unknown; startAt?: unknown; endAt?: unknown; note?: unknown; personIds?: unknown };
        if (typeof value?.title !== "string" || !value.title.trim() || typeof value.startAt !== "string" || typeof value.endAt !== "string" || value.endAt <= value.startAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value.startAt) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value.endAt)) throw new Error("請輸入有效排程與起迄時間");
        const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
        const result = await response.json() as { id: string; name?: string; title?: string; error?: string };
        if (!response.ok) throw new Error(result.error);
        await load(); return { id: result.id, title: result.title };
      },
    });
    register({
      name: "update_schedule", title: "編輯排程", description: "以完整欄位更新指定排程，personIds 是更新後的完整與會人員 ID 名單。",
      inputSchema: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, startAt: { type: "string" }, endAt: { type: "string" }, note: { type: "string" }, personIds: { type: "array", items: { type: "string" } } }, required: ["id", "title", "startAt", "endAt", "personIds"], additionalProperties: false },
      annotations: { readOnlyHint: false },
      async execute(input: unknown) {
        const value = input as { id?: unknown; title?: unknown; startAt?: unknown; endAt?: unknown; note?: unknown; personIds?: unknown };
        if (typeof value?.id !== "string" || !value.id || typeof value.title !== "string" || !value.title.trim() || typeof value.startAt !== "string" || typeof value.endAt !== "string" || value.endAt <= value.startAt || !Array.isArray(value.personIds) || value.personIds.some(id => typeof id !== "string")) throw new Error("請提供有效的排程資料與完整與會名單");
        const response = await fetch(`/api/schedules/${encodeURIComponent(value.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
        const result = await response.json() as { id?: string; title?: string; error?: string };
        if (!response.ok) throw new Error(result.error);
        await load(); return { id: result.id, title: result.title };
      },
    });
    return () => lifecycle.abort();
  }, [load]);

  function openNewSchedule() {
    setEditingId(null); setTitle(""); setStartAt(""); setEndAt(""); setNote(""); setPersonIds([]);
    setError(""); setDialog("schedule");
  }
  function openEditSchedule(item: Schedule) {
    setEditingId(item.id); setTitle(item.title); setStartAt(item.startAt); setEndAt(item.endAt); setNote(item.note);
    setPersonIds(data.attendees.filter(attendee => attendee.scheduleId === item.id).map(attendee => attendee.personId));
    setError(""); setDialog("schedule");
  }
  async function submit(url: string, body: object, method: "POST" | "PATCH" = "POST") {
    setBusy(true); setError("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json() as { error?: string };
      if (res.status === 401) { window.location.assign("/"); return; }
      if (!res.ok) throw new Error(payload.error || "儲存失敗");
      await load(); setDialog(null);
      setTitle(""); setStartAt(""); setEndAt(""); setNote(""); setPersonIds([]); setEditingId(null); setName("");
    } catch (err) { setError(err instanceof Error ? err.message : "儲存失敗"); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/${deleting.type === "person" ? "people" : "schedules"}/${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      const payload = await res.json() as { error?: string };
      if (res.status === 401) { window.location.assign("/"); return; }
      if (!res.ok) throw new Error(payload.error || "刪除失敗");
      await load(); setDeleting(null);
    } catch (err) { setError(err instanceof Error ? err.message : "刪除失敗"); setDeleting(null); }
    finally { setBusy(false); }
  }
  const groups = data.schedules.reduce<{ day: string; items: Schedule[] }[]>((result, item) => {
    const day = item.startAt.slice(0, 10); const last = result[result.length - 1];
    if (last?.day === day) last.items.push(item); else result.push({ day, items: [item] });
    return result;
  }, []);

  return <div className="min-h-screen">
    <header className="bg-[#153d50] text-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-5 sm:px-8">
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#2b7780] text-[#f9c76a]"><CalendarDays size={22} strokeWidth={2.2}/></div>
      <div><div className="text-lg font-bold tracking-wide">期程排程</div><div className="text-xs text-[#b9d4db]">排程與與會人員管理</div></div><ChangePassword/><button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/"); }} className=" rounded-lg px-3 py-2 text-sm font-medium text-[#d2e5e8] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">登出</button>
    </div></header>
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold tracking-[.16em] text-[#18868a]">SCHEDULE</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">我的排程</h1><p className="mt-2 text-[#5f7580]">集中查看時間安排與參與名單。</p></div>
        <button onClick={openNewSchedule} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#126f75] px-5 font-semibold text-white shadow-sm transition hover:bg-[#0f5b60] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126f75]"><Plus size={18}/>新增排程</button></div>
      {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><span>{error}</span><button onClick={() => { setError(""); void load(); }} className="font-semibold underline">重試</button></div>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="schedule-heading" className="min-w-0 rounded-2xl border border-[#d9e4e6] bg-white shadow-[0_12px_32px_rgba(19,61,80,.04)]">
          <div className="flex items-center justify-between border-b border-[#e5eeee] px-5 py-5 sm:px-7"><div><h2 id="schedule-heading" className="text-xl font-bold">排程列表</h2><p className="mt-1 text-sm text-[#68808a]">依開始時間排序</p></div><span className="rounded-full bg-[#eaf4f4] px-3 py-1 text-sm font-bold text-[#126f75]">{data.schedules.length} 筆</span></div>
          {loading ? <div className="p-8 text-[#5f7580]">載入中…</div> : loadFailed ? <div className="p-8 text-[#5f7580]">排程資料暫時無法顯示，請點選上方「重試」。</div> : groups.length === 0 ? <div className="flex flex-col items-center px-6 py-16 text-center"><div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#eaf4f4] text-[#126f75]"><CalendarDays size={30}/></div><h3 className="text-lg font-bold">還沒有排程</h3><p className="mt-2 text-[#68808a]">新增第一筆排程，安排時間與與會人員。</p><button onClick={openNewSchedule} className="mt-5 font-semibold text-[#126f75] underline underline-offset-4">新增排程</button></div> : <div className="px-5 pb-6 sm:px-7">{groups.map(group => <div key={group.day} className="pt-6"><h3 className="mb-4 text-sm font-bold tracking-wide text-[#47717b]">{formatDay(group.day + "T00:00")}</h3><div className="space-y-3">{group.items.map(item => {
            const attendees = data.attendees.filter(a => a.scheduleId === item.id).map(a => data.people.find(p => p.id === a.personId)).filter((p): p is Person => Boolean(p));
            return <article key={item.id} className="group relative rounded-xl border border-[#e0e9e9] bg-[#fcfefe] p-4 transition hover:border-[#a4ccce] sm:p-5"><div className="flex gap-4"><div className="hidden w-1 shrink-0 rounded-full bg-[#2b9292] sm:block"/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h4 className="text-lg font-bold break-words">{item.title}</h4><div className="flex shrink-0 items-center gap-1"><button aria-label={`編輯排程：${item.title}`} title="編輯排程" onClick={() => openEditSchedule(item)} className="flex size-9 items-center justify-center rounded-lg text-[#47717b] hover:bg-[#eaf4f4] hover:text-[#126f75] focus-visible:outline-2 focus-visible:outline-[#126f75]"><Pencil size={17}/></button><button aria-label={`刪除排程：${item.title}`} title="刪除排程" onClick={() => setDeleting({ type:"schedule", id:item.id, name:item.title })} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#788e96] hover:bg-red-50 hover:text-[#b8353f] focus-visible:outline-2 focus-visible:outline-[#126f75]"><Trash2 size={17}/></button></div></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#4a6975]"><span className="inline-flex items-center gap-1.5"><Clock3 size={16}/>{formatTime(item.startAt)} – {item.endAt.slice(0,10) === item.startAt.slice(0,10) ? formatTime(item.endAt) : `${formatDay(item.endAt)} ${formatTime(item.endAt)}`}</span><span className="inline-flex items-center gap-1.5"><Users size={16}/>{attendees.length} 位與會人員</span></div>{item.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[#617985]">{item.note}</p>}{attendees.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{attendees.map(p => <span key={p.id} className="rounded-full bg-[#eaf4f4] px-3 py-1 text-sm font-medium text-[#246c72]">{p.name}</span>)}</div>}</div></div></article>;
          })}</div></div>)}</div>}
        </section>
        <aside aria-labelledby="people-heading" className="rounded-2xl border border-[#d9e4e6] bg-white shadow-[0_12px_32px_rgba(19,61,80,.04)]"><div className="flex items-center justify-between gap-3 border-b border-[#e5eeee] px-5 py-5"><div><h2 id="people-heading" className="text-xl font-bold">與會人員</h2><p className="mt-1 text-sm text-[#68808a]">共 {data.people.length} 位</p></div><button onClick={() => { setError(""); setDialog("person"); }} aria-label="新增與會人員" className="flex size-10 items-center justify-center rounded-xl bg-[#eaf4f4] text-[#126f75] hover:bg-[#d4ebeb] focus-visible:outline-2 focus-visible:outline-[#126f75]"><Plus size={21}/></button></div>
          {loading ? <div className="p-6 text-[#5f7580]">載入中…</div> : loadFailed ? <div className="p-6 text-[#5f7580]">人員資料暫時無法顯示。</div> : data.people.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-[#68808a]">尚無與會人員</p><button onClick={() => setDialog("person")} className="mt-3 font-semibold text-[#126f75] underline underline-offset-4">新增人員</button></div> : <ul className="divide-y divide-[#edf2f2] px-5">{data.people.map(p => <li key={p.id} className="flex items-center gap-3 py-3.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d5eceb] font-bold text-[#126f75]">{initials(p.name)}</span><span className="min-w-0 flex-1 truncate font-medium">{p.name}</span><button title="刪除人員" aria-label={`刪除與會人員：${p.name}`} onClick={() => setDeleting({type:"person", id:p.id, name:p.name})} className="flex size-9 items-center justify-center rounded-lg text-[#788e96] hover:bg-red-50 hover:text-[#b8353f] focus-visible:outline-2 focus-visible:outline-[#126f75]"><Trash2 size={17}/></button></li>)}</ul>}
        </aside>
      </div>
    </main>
    <Dialog open={dialog === "person"} onOpenChange={open => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>新增與會人員</DialogTitle><DialogDescription>新增後即可在排程中選取。</DialogDescription></DialogHeader><form onSubmit={event => { event.preventDefault(); void submit("/api/people", { name }); }} className="space-y-5">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<label className="block text-sm font-semibold">姓名<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="例如：王小明" className="mt-2 h-11 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label><div className="flex justify-end gap-3"><button type="button" onClick={() => setDialog(null)} className="rounded-lg px-4 py-2.5 font-medium">取消</button><button disabled={busy} className="rounded-lg bg-[#126f75] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "儲存中…" : "新增人員"}</button></div></form></DialogContent></Dialog>
    <Dialog open={dialog === "schedule"} onOpenChange={open => !open && setDialog(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editingId ? "編輯排程" : "新增排程"}</DialogTitle><DialogDescription>{editingId ? "修改時間、備註與與會人員。" : "填寫時間，並選擇要參與的人員。"}</DialogDescription></DialogHeader><form onSubmit={event => { event.preventDefault(); if (endAt <= startAt) { setError("結束時間必須晚於開始時間。"); return; } void submit(editingId ? `/api/schedules/${encodeURIComponent(editingId)}` : "/api/schedules", { title, startAt, endAt, note, personIds }, editingId ? "PATCH" : "POST"); }} className="space-y-5">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<label className="block text-sm font-semibold">排程名稱<input autoFocus required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：專案討論" className="mt-2 h-11 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">開始時間<input required type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label><label className="block text-sm font-semibold">結束時間<input required type="datetime-local" min={startAt} value={endAt} onChange={e => setEndAt(e.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label></div><label className="block text-sm font-semibold">備註（選填）<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="地點或討論事項" className="mt-2 w-full resize-y rounded-lg border border-[#cddcde] px-3 py-2 text-base outline-none focus:border-[#126f75]"/></label><fieldset><legend className="text-sm font-semibold">與會人員（選填）</legend>{data.people.length ? <div className="mt-2 grid max-h-36 gap-1 overflow-y-auto rounded-lg border border-[#d9e4e6] p-2 sm:grid-cols-2">{data.people.map(p => <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-[#eaf4f4]"><Checkbox checked={personIds.includes(p.id)} onCheckedChange={checked => setPersonIds(ids => checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}/>{p.name}</label>)}</div> : <p className="mt-2 text-sm text-[#68808a]">尚無人員，可先建立排程後再新增人員。</p>}</fieldset><div className="flex justify-end gap-3"><button type="button" onClick={() => setDialog(null)} className="rounded-lg px-4 py-2.5 font-medium">取消</button><button disabled={busy} className="rounded-lg bg-[#126f75] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "儲存中…" : editingId ? "儲存修改" : "建立排程"}</button></div></form></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>確定刪除{deleting?.type === "person" ? "與會人員" : "排程"}？</AlertDialogTitle><AlertDialogDescription>「{deleting?.name}」刪除後無法復原。{deleting?.type === "person" && "此人也會從相關排程的與會名單移除。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void remove(); }} className="bg-[#b8353f] text-white hover:bg-[#982630]">刪除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
