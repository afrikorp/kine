import type {
  BordereauDetail,
  BordereauSummary,
  Cabinet,
  Decision,
  Facture,
  FactureAvecPatient,
  JourFerie,
  Patient,
  SeanceDate,
  Tarif,
} from "./types.js";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // pas de corps JSON
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const authApi = {
  setup: (username: string, password: string) => post<{ id: number; username: string }>("/api/auth/setup", { username, password }),
  login: (username: string, password: string) => post<{ id: number; username: string }>("/api/auth/login", { username, password }),
  logout: () => post<{ ok: true }>("/api/auth/logout"),
  me: () => get<{ id: number; username: string }>("/api/auth/me"),
};

export const cabinetApi = {
  get: () => get<Cabinet | null>("/api/cabinet"),
  save: (cabinet: Omit<Cabinet, "updatedAt">) => put<Cabinet>("/api/cabinet", cabinet),
};

export const parametresApi = {
  listTarifs: () => get<Tarif[]>("/api/parametres/tarif"),
  tarifActuel: (date?: string) => get<{ prixUnitaire: number; tauxTva: number }>(`/api/parametres/tarif/actuel${date ? `?date=${date}` : ""}`),
  addTarif: (t: { prixUnitaire: number; tauxTva: number; dateEffet: string }) => post<Tarif>("/api/parametres/tarif", t),
  listJoursFeries: (annee?: number) => get<JourFerie[]>(`/api/parametres/jours-feries${annee ? `?annee=${annee}` : ""}`),
  addJourFerie: (j: { date: string; libelle: string }) => post<JourFerie>("/api/parametres/jours-feries", j),
  deleteJourFerie: (id: number) => del<{ ok: true }>(`/api/parametres/jours-feries/${id}`),
};

export const patientsApi = {
  list: (q?: string) => get<Patient[]>(`/api/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: number) => get<Patient>(`/api/patients/${id}`),
  create: (data: Partial<Patient>) => post<Patient>("/api/patients", data),
  update: (id: number, data: Partial<Patient>) => put<Patient>(`/api/patients/${id}`, data),
  remove: (id: number) => del<{ ok: true }>(`/api/patients/${id}`),
};

export const decisionsApi = {
  listForPatient: (patientId: number) => get<Decision[]>(`/api/patients/${patientId}/decisions`),
  create: (patientId: number, data: { bureau: string; annee: number; numeroOrdre: number }) =>
    post<Decision>(`/api/patients/${patientId}/decisions`, data),
  get: (id: number) => get<Decision>(`/api/decisions/${id}`),
  remove: (id: number) => del<{ ok: true }>(`/api/decisions/${id}`),
};

export interface FactureInput {
  decisionId: number;
  dateDebut: string;
  dateFin: string;
  nbSeances: number;
  seancesParSemaine: 2 | 3 | 4;
  dateEdition: string;
  prestation?: string;
  prixUnitaire?: number;
  tauxTva?: number;
  numero?: number;
  anneeFacture?: number;
}

export const facturesApi = {
  list: (filters: { annee?: number; patientId?: number; bordereauId?: number; sansBordereau?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (filters.annee) params.set("annee", String(filters.annee));
    if (filters.patientId) params.set("patientId", String(filters.patientId));
    if (filters.bordereauId) params.set("bordereauId", String(filters.bordereauId));
    if (filters.sansBordereau) params.set("sansBordereau", "true");
    const qs = params.toString();
    return get<FactureAvecPatient[]>(`/api/factures${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => get<Facture>(`/api/factures/${id}`),
  create: (data: FactureInput) => post<Facture>("/api/factures", data),
  update: (id: number, data: FactureInput) => put<Facture>(`/api/factures/${id}`, data),
  remove: (id: number) => del<{ ok: true }>(`/api/factures/${id}`),
  memoireSeances: (id: number) => get<SeanceDate[]>(`/api/factures/${id}/memoire-seances`),
};

export const bordereauxApi = {
  list: () => get<BordereauSummary[]>("/api/bordereaux"),
  get: (id: number) => get<BordereauDetail>(`/api/bordereaux/${id}`),
  create: (data: { numero: number; annee: number; factureIds: number[] }) =>
    post<{ id: number; numero: number; annee: number; nbFactures: number }>("/api/bordereaux", data),
  cnamFileUrl: (id: number) => `${BASE_URL}/api/bordereaux/${id}/cnam-file`,
  downloadCnamFile: async (id: number): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(`${BASE_URL}/api/bordereaux/${id}/cnam-file`, { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      throw new ApiError(res.status, body.error ?? res.statusText);
    }
    const disposition = res.headers.get("content-disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob: await res.blob(), filename: match?.[1] ?? `bordereau-${id}.txt` };
  },
};
