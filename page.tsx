import { cookies } from "next/headers";
import { validSession, COOKIE_NAME } from "@/lib/site-auth";
import Planner from "./planner";
import PasswordGate from "./password-gate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  const allowed = await validSession(cookie);
  return allowed ? <Planner /> : <PasswordGate />;
}
