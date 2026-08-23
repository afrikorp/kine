import { cabinetApi, decisionsApi, facturesApi, patientsApi } from "@/lib/api.js";
import type { Cabinet, Decision, Facture, Patient } from "@/lib/types.js";

export interface FactureContext {
  facture: Facture;
  decision: Decision;
  patient: Patient;
  cabinet: Cabinet;
}

export async function loadFactureContext(factureId: number): Promise<FactureContext> {
  const facture = await facturesApi.get(factureId);
  const decision = await decisionsApi.get(facture.decisionId);
  const [patient, cabinet] = await Promise.all([patientsApi.get(decision.patientId), cabinetApi.get()]);
  if (!cabinet) {
    throw new Error("Le cabinet n'est pas configuré — renseignez-le dans Paramètres avant d'imprimer.");
  }
  return { facture, decision, patient, cabinet };
}
