import { http } from "@/lib/api/http";
import type {
  ClinicQueue,
  CurrentVisit,
  Department,
  IntakeInput,
  NotificationItem,
  ReceptionVisit,
} from "@/lib/types/clinical";

const path = (value: string) => `/clinical/${value}`;
const key = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");

export const clinicalService = {
  currentVisit: () => http.get<CurrentVisit | null>(path("visits/me/current")).then((r) => r.data),
  requestHallTicket: () =>
    http
      .post<CurrentVisit>(path("visits/hall-ticket"), {}, { headers: { "Idempotency-Key": key() } })
      .then((r) => r.data),
  reissueHallTicket: (visitId: string) =>
    http
      .post<CurrentVisit>(
        path(`visits/${visitId}/reissue`),
        { kind: "HALL" },
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
  receptionQueue: () =>
    http.get<ReceptionVisit[]>(path("visits/reception/queue")).then((r) => r.data),
  expiredReceptionQueue: (businessDate?: string) =>
    http
      .get<ReceptionVisit[]>(path("visits/reception/expired"), {
        params: businessDate ? { businessDate } : undefined,
      })
      .then((r) => r.data),
  doctorRooms: () =>
    http
      .get<Array<{ code: string; name: string; shiftType: string }>>(path("visits/doctor/rooms"))
      .then((r) => r.data),
  verify: (visitId: string) =>
    http.put(path(`visits/${visitId}/verify`), { nationalIdVerified: true }).then((r) => r.data),
  intake: (visitId: string, input: IntakeInput) =>
    http.put(path(`visits/${visitId}/intake`), input).then((r) => r.data),
  assign: (visitId: string, departmentCode: string) =>
    http
      .post(
        path(`visits/${visitId}/assign-clinic`),
        { departmentCode },
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
  reissueClinicTicket: (visitId: string, reason: string) =>
    http
      .post(
        path(`visits/${visitId}/reissue`),
        { kind: "CLINIC", reason },
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
  reissueExpiredTicket: (visitId: string, kind: "HALL" | "CLINIC", reason: string) =>
    http
      .post(
        path(`visits/${visitId}/reissue`),
        { kind, reason },
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
  departments: () => http.get<Department[]>(path("departments")).then((r) => r.data),
  roomQueue: (code: string) =>
    http.get<ClinicQueue>(path(`visits/queue/${encodeURIComponent(code)}`)).then((r) => r.data),
  call: (visitId: string) => http.put(path(`visits/${visitId}/call`)).then((r) => r.data),
  startExam: (visitId: string) =>
    http.post(path(`visits/${visitId}/start-exam`)).then((r) => r.data),
  requeue: (visitId: string, reason: string) =>
    http.post(path(`visits/${visitId}/requeue`), { reason }).then((r) => r.data),
  createOrders: (
    visitId: string,
    data: {
      orders: string[];
      workingDiagnosis?: string;
      pregnancySuspected?: boolean;
      symptoms?: string[];
      doctorNotes?: string;
    }
  ) =>
    http
      .post<{
        isStatEmergency: boolean;
        isAcyclic: boolean;
        sortedOrder: string[];
        stepsCount: number;
      }>(path(`visits/${visitId}/orders`), data)
      .then((r) => r.data),
  conclude: (
    visitId: string,
    data: {
      icd10Code: string;
      icd10Name: string;
      doctorNotes?: string;
      revisitDate?: string;
      items: Array<{
        medicationName: string;
        dosage: string;
        route: string;
        frequency: string;
        durationDays: number;
        quantity: number;
        instructions?: string;
      }>;
    }
  ) => http.post(path(`visits/${visitId}/conclusion`), data).then((r) => r.data),
  notifications: () => http.get<NotificationItem[]>(path("notifications")).then((r) => r.data),
  markAllRead: () => http.patch(path("notifications/read-all")).then((r) => r.data),
};
