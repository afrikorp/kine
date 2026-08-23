import type { Env } from "../env.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours
export const SESSION_COOKIE_NAME = "kine_session";

export interface SessionData {
  userId: number;
  username: string;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(env: Env, data: SessionData): Promise<string> {
  const token = randomToken();
  await env.SESSIONS.put(`session:${token}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function getSession(env: Env, token: string): Promise<SessionData | null> {
  const raw = await env.SESSIONS.get(`session:${token}`);
  return raw ? (JSON.parse(raw) as SessionData) : null;
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.SESSIONS.delete(`session:${token}`);
}

export function sessionCookieMaxAge(): number {
  return SESSION_TTL_SECONDS;
}
