import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";
import { api, setupAndLogin } from "./helpers.js";

describe("auth", () => {
  it("une route protégée refuse l'accès sans session", async () => {
    const res = await SELF.fetch("http://example.com/api/patients");
    expect(res.status).toBe(401);
  });

  it("setup crée le premier utilisateur et ouvre une session", async () => {
    const cookie = await setupAndLogin("praticien");
    const res = await api(cookie, "GET", "/api/auth/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ username: "praticien" });
  });

  it("setup refuse de créer un second utilisateur", async () => {
    await setupAndLogin("praticien");
    const res = await SELF.fetch("http://example.com/api/auth/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "autre", password: "un-mot-de-passe-solide" }),
    });
    expect(res.status).toBe(400);
  });

  it("login avec le bon mot de passe ouvre une session utilisable", async () => {
    await setupAndLogin("praticien");
    const res = await SELF.fetch("http://example.com/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "praticien", password: "un-mot-de-passe-solide" }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    const me = await api(cookie, "GET", "/api/auth/me");
    expect(me.status).toBe(200);
  });

  it("login avec un mauvais mot de passe est rejeté", async () => {
    await setupAndLogin("praticien");
    const res = await SELF.fetch("http://example.com/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "praticien", password: "mauvais-mot-de-passe" }),
    });
    expect(res.status).toBe(401);
  });

  it("logout invalide la session", async () => {
    const cookie = await setupAndLogin("praticien");
    const logout = await api(cookie, "POST", "/api/auth/logout");
    expect(logout.status).toBe(200);
    const me = await api(cookie, "GET", "/api/auth/me");
    expect(me.status).toBe(401);
  });
});
