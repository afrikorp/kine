/**
 * Placeholder Worker — sert uniquement à garder wrangler.toml valide et à
 * vérifier que les bindings D1/KV/R2 sont bien câblés. Le routing et les
 * handlers CRUD arrivent à l'étape 4 (API Workers).
 */
export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  FILES: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const { results } = await env.DB.prepare("SELECT count(*) as n FROM patients").all();
      return Response.json({ status: "ok", patients: results?.[0]?.n ?? 0 });
    }
    return new Response("KINE.CNAM API — pas encore implémentée (étape 4)", { status: 501 });
  },
};
