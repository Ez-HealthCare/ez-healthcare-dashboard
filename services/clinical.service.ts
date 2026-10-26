import { http } from "@/lib/api/http";
import type {
  ClinicQueue,
  CurrentVisit,
  Department,
  IntakeInput,
  PatientProfile,
  ReceptionRequest,
  ReceptionRequestDraft,
  UpdatePatientProfileInput,
  NotificationItem,
  AppointmentCheckInResult,
  AppointmentStatus,
  ReceptionAppointment,
  ReceptionPatient,
  ReceptionVisit,
} from "@/lib/types/clinical";

const path = (value: string) => `/clinical/${value}`;
const key = () =>
  Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");

export const clinicalService = {
  currentReceptionRequest: () =>
    http.get<ReceptionRequest | null>(path("reception-requests/me/current")).then((r) => r.data),
  pendingReceptionRequests: (search?: string) =>
    http
      .get<ReceptionRequest[]>(path("reception-requests/reception/pending"), {
        params: search ? { search } : undefined,
      })
      .then((r) => r.data),
  confirmReceptionRequest: (id: string) =>
    http.post(path(`reception-requests/reception/${id}/confirm`)).then((r) => r.data),
  rejectReceptionRequest: (id: string, reason: string) =>
    http.put(path(`reception-requests/reception/${id}/reject`), { reason }).then((r) => r.data),
  saveReceptionRequestDraft: (input: ReceptionRequestDraft) =>
    http.put<ReceptionRequest>(path("reception-requests/me/draft"), input).then((r) => r.data),
  submitReceptionRequest: () =>
    http.post<ReceptionRequest>(path("reception-requests/me/submit")).then((r) => r.data),
  cancelReceptionRequest: () =>
    http.put<ReceptionRequest>(path("reception-requests/me/cancel")).then((r) => r.data),
  myProfile: () => http.get<PatientProfile>(path("users/me/profile")).then((r) => r.data),
  updateMyProfile: (input: UpdatePatientProfileInput) =>
    http.put<PatientProfile>(path("users/me/profile"), input).then((r) => r.data),
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
  receptionAppointments: (params?: { search?: string; status?: AppointmentStatus }) =>
    http
      .get<ReceptionAppointment[]>(path("appointments/reception/today"), { params })
      .then((r) => r.data),
  checkInAppointment: (appointmentId: string) =>
    http
      .post<AppointmentCheckInResult>(
        path(`appointments/${appointmentId}/reception/check-in`),
        {},
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
  cancelAppointment: (appointmentId: string, reason: string) =>
    http.put(path(`appointments/${appointmentId}/cancel`), { reason }).then((r) => r.data),
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
  verify: (visitId: string, insuranceCardNumber?: string) =>
    http
      .put(path(`visits/${visitId}/verify`), { nationalIdVerified: true, insuranceCardNumber })
      .then((r) => r.data),
  rejectVerification: (visitId: string, reason: string) =>
    http.put(path(`visits/${visitId}/reject-verification`), { reason }).then((r) => r.data),
  callReceptionTicket: (visitId: string) =>
    http.put(path(`visits/${visitId}/reception/call`)).then((r) => r.data),
  callNextReceptionTicket: () => http.post(path("visits/reception/call-next")).then((r) => r.data),
  pauseReceptionTicket: (visitId: string, reason: string) =>
    http.put(path(`visits/${visitId}/reception/pause`), { reason }).then((r) => r.data),
  recallReceptionTicket: (visitId: string) =>
    http.put(path(`visits/${visitId}/reception/recall`)).then((r) => r.data),
  findPatientByNationalId: (nationalId: string) =>
    http
      .get<ReceptionPatient>(path(`users/audit/national-id/${encodeURIComponent(nationalId)}`))
      .then((r) => r.data),
  createWalkInTicket: (patientId: string) =>
    http
      .post(
        path("visits/reception/walk-in"),
        { patientId },
        { headers: { "Idempotency-Key": key() } }
      )
      .then((r) => r.data),
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
