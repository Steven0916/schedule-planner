export type ScheduleInput = { title: string; startAt: string; endAt: string; note: string; personIds: string[] };

function validDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) && date.getHours() === Number(value.slice(11, 13)) && date.getMinutes() === Number(value.slice(14, 16));
}

export function parseScheduleInput(body: unknown): ScheduleInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const note = typeof value.note === "string" ? value.note.trim() : "";
  const startAt = typeof value.startAt === "string" ? value.startAt : "";
  const endAt = typeof value.endAt === "string" ? value.endAt : "";
  const personIds = Array.isArray(value.personIds) ? [...new Set(value.personIds)] : [];
  if (!title || title.length > 120 || note.length > 500 || !validDateTime(startAt) || !validDateTime(endAt) || endAt <= startAt || personIds.length > 100 || personIds.some(id => typeof id !== "string")) return null;
  return { title, startAt, endAt, note, personIds };
}

export async function attendeesExist(db: D1Database, personIds: string[]): Promise<boolean> {
  if (!personIds.length) return true;
  const found = await db.prepare(`SELECT id FROM people WHERE id IN (${personIds.map(() => "?").join(",")})`).bind(...personIds).all();
  return found.results.length === personIds.length;
}
