import { parseScheduleInput, attendeesExist } from "@/lib/schedule-input";
import { requestHasAccess, unauthorized } from "@/lib/site-auth";
import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  if (!(await requestHasAccess(request))) return unauthorized();
  try {
    const input = parseScheduleInput(await request.json().catch(() => null));
    if (!input) return Response.json({ error: "請檢查排程名稱與起迄時間。" }, { status: 400 });
    const { title, note, startAt, endAt, personIds } = input;
    const db = env.DB!;
    if (!(await attendeesExist(db, personIds))) return Response.json({ error: "與會人員資料已變更，請重新整理。" }, { status: 400 });
    const id = crypto.randomUUID();
    await db.batch([
      db.prepare("INSERT INTO schedules (id, title, start_at, end_at, note) VALUES (?, ?, ?, ?, ?)").bind(id, title, startAt, endAt, note),
      ...personIds.map(personId => db.prepare("INSERT INTO attendees (schedule_id, person_id) VALUES (?, ?)").bind(id, personId)),
    ]);
    return Response.json({ id, title, startAt, endAt, note }, { status: 201 });
  } catch (error) {
    console.error("Unable to add schedule", error);
    return Response.json({ error: "新增排程失敗，請重試。" }, { status: 503 });
  }
}
