export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  FILES: R2Bucket;
  /** Origine du frontend Cloudflare Pages, pour restreindre le CORS. */
  ALLOWED_ORIGIN?: string;
}
