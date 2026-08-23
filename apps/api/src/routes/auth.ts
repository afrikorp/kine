import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../types.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createSession, destroySession, sessionCookieMaxAge, SESSION_COOKIE_NAME } from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, requireString } from "../lib/http.js";
import type { UserRow } from "../db/schema.js";

export const authRoutes = new Hono<AppEnv>();

function cookieOptions(c: { req: { url: string } }) {
  const isHttps = new URL(c.req.url).protocol === "https:";
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: isHttps,
    path: "/",
    maxAge: sessionCookieMaxAge(),
  };
}

/**
 * Bootstrap : crée le seul utilisateur de l'app. Refuse si un utilisateur
 * existe déjà (l'app démarre à vide, mais un seul compte est nécessaire —
 * un seul cabinet, pas de multi-tenant).
 */
authRoutes.post("/setup", async (c) => {
  const existing = await c.env.DB.prepare("SELECT count(*) as n FROM users").first<{ n: number }>();
  if (existing && existing.n > 0) {
    badRequest("Un utilisateur existe déjà — utilisez /api/auth/login.");
  }

  const body = await c.req.json();
  const username = requireString(body.username, "username");
  const password = requireString(body.password, "password");
  if (password.length < 8) badRequest("Le mot de passe doit faire au moins 8 caractères");

  const passwordHash = await hashPassword(password);
  const result = await c.env.DB.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id")
    .bind(username, passwordHash)
    .first<{ id: number }>();

  const token = await createSession(c.env, { userId: result!.id, username });
  setCookie(c, SESSION_COOKIE_NAME, token, cookieOptions(c));
  return c.json({ id: result!.id, username });
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const username = requireString(body.username, "username");
  const password = requireString(body.password, "password");

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Identifiants invalides" }, 401);
  }

  const token = await createSession(c.env, { userId: user.id, username: user.username });
  setCookie(c, SESSION_COOKIE_NAME, token, cookieOptions(c));
  return c.json({ id: user.id, username: user.username });
});

authRoutes.post("/logout", requireAuth, async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (token) await destroySession(c.env, token);
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({ id: user.userId, username: user.username });
});
