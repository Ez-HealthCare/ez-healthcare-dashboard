import type { IntakeInput } from "./types/clinical";

// Matches api/src/visit/news2-calculator.ts: five measured parameters, SpO2 Scale 1.
// Oxygen therapy and consciousness are not collected by the current intake contract.
export function news2Preview(input: Partial<IntakeInput>) {
  const {
    respiratoryRate: rr,
    spo2,
    bloodPressureSystolic: bp,
    heartRate: hr,
    temperature: t,
  } = input;
  const redFlag = (typeof spo2 === "number" && spo2 < 90) || (typeof bp === "number" && bp < 90);
  if (
    ![rr, spo2, bp, hr, t].every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    return { score: null, risk: redFlag ? "HIGH" : null };
  }
  const score =
    (rr! <= 8 ? 3 : rr! <= 11 ? 1 : rr! <= 20 ? 0 : rr! <= 24 ? 2 : 3) +
    (spo2! <= 91 ? 3 : spo2! <= 93 ? 2 : spo2! <= 95 ? 1 : 0) +
    (bp! <= 90 ? 3 : bp! <= 100 ? 2 : bp! <= 110 ? 1 : bp! < 220 ? 0 : 3) +
    (hr! <= 40 ? 3 : hr! <= 50 ? 1 : hr! <= 90 ? 0 : hr! <= 110 ? 1 : hr! <= 130 ? 2 : 3) +
    (t! <= 35 ? 3 : t! <= 36 ? 1 : t! <= 38 ? 0 : t! <= 39 ? 1 : 2);
  return { score, risk: redFlag || score >= 7 ? "HIGH" : score >= 5 ? "MEDIUM" : "LOW" };
}
