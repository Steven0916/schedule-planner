import { env } from "cloudflare:workers";

export const COOKIE_NAME = "schedule_access";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const ITERATIONS = 100_000;
type PasswordSource = { kind: "initial" | "stored"; value: string };

function secrets() {
  if (!env.SITE_PASSWORD || !env.SITE_SESSION_KEY || !env.DB) throw new Error("Site security is not configured");
  return { initialPassword: env.SITE_PASSWORD, signingKey: env.SITE_SESSION_KEY, db: env.DB };
}

function bytes(value: string): Uint8Array<ArrayBuffer> { return new TextEncoder().encode(value); }
function hex(value: Uint8Array): string { return Array.from(value, byte => byte.toString(16).padStart(2, "0")).join(""); }
function unhex(value: string): Uint8Array<ArrayBuffer> { return new Uint8Array(value.match(/.{2}/g)!.map(part => parseInt(part, 16))); }
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
async function sha256(value: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(value))); }
async function passwordSource(): Promise<PasswordSource> {
  const { initialPassword, db } = secrets();
  const row = await db.prepare("SELECT value FROM site_settings WHERE key = ?").bind("password_hash").first<{ value: string }>();
  return row ? { kind: "stored", value: row.value } : { kind: "initial", value: initialPassword };
}
async function derivePassword(value: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", bytes(value), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" }, key, 256));
}
async function verifyPassword(value: string, source: PasswordSource): Promise<boolean> {
  if (source.kind === "initial") return constantTimeEqual(await sha256(value), await sha256(source.value));
  const parts = source.value.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256" || Number(parts[1]) !== ITERATIONS || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  return constantTimeEqual(await derivePassword(value, unhex(parts[2])), unhex(parts[3]));
}
export async function checkPassword(value: string): Promise<boolean> {
  return verifyPassword(value, await passwordSource());
}
export async function changePassword(current: string, next: string): Promise<"ok" | "incorrect" | "unchanged" | "conflict"> {
  const source = await passwordSource();
  if (!(await verifyPassword(current, source))) return "incorrect";
  if (await verifyPassword(next, source)) return "unchanged";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const replacement = `pbkdf2_sha256$${ITERATIONS}$${hex(salt)}$${hex(await derivePassword(next, salt))}`;
  const { db } = secrets();
  const result = source.kind === "stored"
    ? await db.prepare("UPDATE site_settings SET value = ? WHERE key = ? AND value = ?").bind(replacement, "password_hash", source.value).run()
    : await db.prepare("INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind("password_hash", replacement).run();
  return result.meta.changes ? "ok" : "conflict";
}
async function signature(expires: number): Promise<string> {
  const { signingKey } = secrets();
  const source = await passwordSource();
  const verifier = source.kind === "stored" ? source.value : hex(await sha256(source.value));
  const key = await crypto.subtle.importKey("raw", bytes(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(`schedule-session:${expires}:${verifier}`))));
}
export async function createSession(): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${expires}.${await signature(expires)}`;
}
export async function validSession(value: string | undefined): Promise<boolean> {
  if (!value || !/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expiry, supplied] = value.split(".");
  const expires = Number(expiry);
  if (expires <= Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + SESSION_SECONDS) return false;
  return constantTimeEqual(bytes(supplied), bytes(await signature(expires)));
}
export async function requestHasAccess(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie")?.split(/;\s*/).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return validSession(cookie);
}
export function unauthorized() {
  return Response.json({ error: "請先輸入網站密碼。" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
export function sessionCookie(value: string): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}
