import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types.js";
import { HttpError } from "./lib/http.js";
import { requireAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { cabinetRoutes } from "./routes/cabinet.js";
import { parametresRoutes } from "./routes/parametres.js";
import { patientsRoutes } from "./routes/patients.js";
import { decisionsRoutes } from "./routes/decisions.js";
import { facturesRoutes } from "./routes/factures.js";
import { bordereauxRoutes } from "./routes/bordereaux.js";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN;
  return cors({
    origin: origin ?? ((requestOrigin) => requestOrigin),
    credentials: true,
  })(c, next);
});

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status as 400 | 401 | 404 | 409);
  }
  const message = err instanceof Error ? err.message : "Erreur inconnue";
  if (message.includes("UNIQUE constraint failed")) {
    return c.json({ error: "Cette ressource existe déjà" }, 409);
  }
  console.error(err);
  return c.json({ error: "Erreur interne" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", authRoutes);

app.use("/api/*", requireAuth);
app.route("/api/cabinet", cabinetRoutes);
app.route("/api/parametres", parametresRoutes);
app.route("/api/patients", patientsRoutes);
app.route("/api", decisionsRoutes);
app.route("/api/factures", facturesRoutes);
app.route("/api/bordereaux", bordereauxRoutes);

export default app;
