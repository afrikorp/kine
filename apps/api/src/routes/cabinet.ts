import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import { getCabinet, mapCabinet } from "../db/queries.js";
import { optionalString, requireString } from "../lib/http.js";

export const cabinetRoutes = new Hono<AppEnv>();

cabinetRoutes.get("/", async (c) => {
  const row = await getCabinet(c.env.DB);
  return c.json(row ? mapCabinet(row) : null);
});

cabinetRoutes.put("/", async (c) => {
  const body = await c.req.json();
  const nom = requireString(body.nom, "nom");
  const codeCnamPraticien = requireString(body.codeCnamPraticien, "codeCnamPraticien");
  const cleCnamPraticien = requireString(body.cleCnamPraticien, "cleCnamPraticien");

  await c.env.DB.prepare(
    `INSERT INTO cabinet (id, nom, adresse, telephone, rc, matricule_fiscal, rib, code_cnam_praticien, cle_cnam_praticien)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       nom = excluded.nom, adresse = excluded.adresse, telephone = excluded.telephone,
       rc = excluded.rc, matricule_fiscal = excluded.matricule_fiscal, rib = excluded.rib,
       code_cnam_praticien = excluded.code_cnam_praticien, cle_cnam_praticien = excluded.cle_cnam_praticien`,
  )
    .bind(
      nom,
      optionalString(body.adresse),
      optionalString(body.telephone),
      optionalString(body.rc),
      optionalString(body.matriculeFiscal),
      optionalString(body.rib),
      codeCnamPraticien,
      cleCnamPraticien,
    )
    .run();

  const row = await getCabinet(c.env.DB);
  return c.json(mapCabinet(row!));
});
