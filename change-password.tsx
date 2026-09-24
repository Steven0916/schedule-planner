"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false); setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setError("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmation) { setError("兩次輸入的新密碼不相同。"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "無法更新密碼，請重試。");
      window.location.assign("/?changed=1");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "無法更新密碼，請重試。"); setBusy(false); }
  }

  return <><button onClick={() => setOpen(true)} className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-[#d2e5e8] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">變更密碼</button>
    <Dialog open={open} onOpenChange={next => { if (!next && !busy) close(); else if (next) setOpen(true); }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>變更網站密碼</DialogTitle><DialogDescription>設定後，所有已登入的人都需要以新密碼重新進入。</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">目前密碼<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label>
      <label className="block text-sm font-semibold">新密碼<input type="password" autoComplete="new-password" required minLength={6} maxLength={10} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/><span className="mt-1 block text-xs font-normal text-[#68808a]">6 至 10 個字元</span></label>
      <label className="block text-sm font-semibold">再次輸入新密碼<input type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cddcde] px-3 text-base outline-none focus:border-[#126f75]"/></label>
      {error && <p role="alert" className="text-sm text-[#b8353f]">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={busy} onClick={close} className="rounded-lg px-4 py-2.5 font-medium">取消</button><button disabled={busy} className="rounded-lg bg-[#126f75] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "更新中…" : "更新密碼"}</button></div>
    </form></DialogContent></Dialog></>;
}
