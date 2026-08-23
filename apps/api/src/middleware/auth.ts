import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { getSession, SESSION_COOKIE_NAME } from "../lib/session.js";
import type { AppEnv } from "../types.js";

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return c.json({ error: "Non authentifié" }, 401);

  const session = await getSession(c.env, token);
  if (!session) return c.json({ error: "Session invalide ou expirée" }, 401);

  c.set("user", session);
  await next();
}
