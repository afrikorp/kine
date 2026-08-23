import { SELF } from "cloudflare:test";

export async function setupAndLogin(username = "kine"): Promise<string> {
  const res = await SELF.fetch("http://example.com/api/auth/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "un-mot-de-passe-solide" }),
  });
  if (res.status !== 200) {
    throw new Error(`setupAndLogin a échoué (${res.status}): ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Pas de cookie de session renvoyé");
  return setCookie.split(";")[0];
}

export async function api(
  cookie: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return SELF.fetch(`http://example.com${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function createPatient(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await api(cookie, "POST", "/api/patients", {
    nom: "Trabelsi",
    prenom: "Ali",
    numeroAssureRacine: "9875710",
    numeroAssureCle: "0",
    qualiteBeneficiaire: "assure",
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`createPatient a échoué (${res.status}): ${await res.text()}`);
  return res.json() as Promise<any>;
}

export async function createDecision(cookie: string, patientId: number, overrides: Record<string, unknown> = {}) {
  const res = await api(cookie, "POST", `/api/patients/${patientId}/decisions`, {
    bureau: "40",
    annee: 2025,
    numeroOrdre: 10836,
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`createDecision a échoué (${res.status}): ${await res.text()}`);
  return res.json() as Promise<any>;
}
