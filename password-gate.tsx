"use client";

import { useEffect, useState } from "react";
import { CalendarDays, LockKeyhole } from "lucide-react";

export default function PasswordGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  useEffect(() => { setChanged(new URLSearchParams(window.location.search).has("changed")); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "無法驗證密碼，請重試。");
      window.location.assign("/");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "無法驗證密碼，請重試。"); setBusy(false); }
  }

  return <main className="flex min-h-screen flex-col bg-[#f3f6f6]">
    <header className="bg-[#153d50] px-5 py-5 text-white"><div className="mx-auto flex max-w-7xl items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#2b7780] text-[#f9c76a]"><CalendarDays size={22}/></div><div className="text-lg font-bold">期程排程</div></div></header>
    <div className="flex flex-1 items-center justify-center px-5 py-12"><div className="w-full max-w-md rounded-2xl border border-[#d9e4e6] bg-white p-7 shadow-[0_18px_50px_rgba(19,61,80,.08)] sm:p-9"><div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-[#eaf4f4] text-[#126f75]"><LockKeyhole size={23}/></div><h1 className="text-2xl font-bold">輸入網站密碼</h1><p className="mt-2 text-[#5f7580]">輸入共同密碼即可查看與管理排程。</p>{changed && <p role="status" className="mt-4 rounded-lg bg-[#eaf4f4] p-3 text-sm text-[#126f75]">密碼已更新，請使用新密碼登入。</p>}<form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold" htmlFor="site-password">網站密碼</label><input id="site-password" type="password" autoComplete="current-password" autoFocus required value={password} onChange={event => setPassword(event.target.value)} className="-mt-3 h-12 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75] focus:ring-2 focus:ring-[#d2eeed]"/>{error && <p role="alert" className="text-sm text-[#b8353f]">{error}</p>}<button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#126f75] px-5 font-semibold text-white transition hover:bg-[#0f5b60] disabled:opacity-60">{busy ? "驗證中…" : "進入排程"}</button></form></div></div>
  </main>;
}
