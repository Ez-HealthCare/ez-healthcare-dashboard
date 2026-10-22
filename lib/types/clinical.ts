export type VisitStatus =
  | "HALL_WAITING"
  | "RECEPTION_VERIFIED"
  | "TRIAGE_PENDING"
  | "CLINIC_WAITING"
  | "CLINIC_CALLED"
  | "TEMPORARILY_ABSENT"
  | "IN_EXAMINATION"
  | "PARACLINICAL_PENDING"
  | "RE_EXAM_CALLING"
  | "COMPLETED"
  | "EMERGENCY_DISPATCHED"
  | "CANCELLED";

export interface CurrentVisit {
  visitId: string;
  hallTicketNumber: string;
  clinicTicketNumber?: string;
  status: VisitStatus;
  room?: { code: string; name: string } | null;
  canPatientReissue: boolean;
  intakeCompleted: boolean;
  ticketStatus?: "ACTIVE" | "PAUSED" | "EXPIRED";
  businessDate?: string;
  expiresAt?: string;
}

export interface ReceptionVisit {
  visitId: string;
  hallTicketNumber: string;
  clinicTicketNumber?: string;
  status: VisitStatus;
  ticketKind?: "HALL" | "CLINIC";
  patient: {
    id: string;
    name: string;
    dateOfBirth?: string;
    nationalId?: string;
    insuranceCardNumber?: string;
    allergies?: string[];
  };
  chiefComplaint?: string;
  intakeCompleted: boolean;
  isPriority: boolean;
  priorityReason?: string;
  createdAt: string;
  room?: { code: string; name: string } | null;
  ticketStatus?: "ACTIVE" | "PAUSED" | "EXPIRED";
  callAttempts?: number;
  lastCalledAt?: string;
  businessDate?: string;
  expiresAt?: string;
}

export interface ClinicQueueItem {
  visitId: string;
  clinicTicketNumber: string;
  hallTicketNumber: string;
  patientName: string;
  chiefComplaint?: string;
  status: VisitStatus;
  isPriority: boolean;
  priorityReason?: string;
  queuedAt: string;
  callAttempts: number;
  vitals?: { bp: string; hr: number; temp: number; spo2: number; isRedFlag: boolean } | null;
}

export interface ClinicQueue {
  departmentCode: string;
  departmentName: string;
  queueLength: number;
  queue: ClinicQueueItem[];
}

export interface Department {
  id: string;
  code: string;
  name: string;
  roomType: string;
}

export interface ReceptionPatient {
  id: string;
  name: string;
  role: string;
  dateOfBirth?: string;
  nationalId?: string;
  insuranceCardNumber?: string;
}

export type AppointmentStatus = "BOOKED" | "CHECKED_IN" | "CANCELLED" | "NO_SHOW";

export interface ReceptionAppointment {
  id: string;
  appointmentCode: string;
  scheduledAt: string;
  status: AppointmentStatus;
  chiefComplaint?: string;
  checkedInAt?: string;
  visitId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  patient: {
    id: string;
    name: string;
    nationalId?: string;
    insuranceCardNumber?: string;
    dateOfBirth?: string;
  };
  department?: { id: string; code: string; name: string } | null;
}

export interface AppointmentCheckInResult {
  visitId: string;
  hallTicketNumber: string;
  status: VisitStatus;
  ticket: {
    id: string;
    number: string;
    status: string;
    businessDate: string;
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export interface IntakeInput {
  chiefComplaint: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  spo2: number;
  respiratoryRate: number;
  symptomOnset?: string;
  symptomDuration?: string;
  symptomSeverity?: string;
  allergies?: string[];
  weightKg?: number;
  heightCm?: number;
  notes?: string;
  isPriority?: boolean;
  priorityReason?: string;
}

// Legacy doctor widgets still compile while Phase B routes use ClinicQueueItem.
export interface PatientInfo {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  allergies?: string[];
  dateOfBirth?: string;
}

export interface VisitQueueItem {
  id: string;
  ticketNumber: string;
  status: "WAITING" | "IN_SERVICE" | "COMPLETED";
  chiefComplaint: string;
  createdAt: string;
  patient: PatientInfo;
}

export interface DagStep {
  id: string;
  departmentCode: string;
  departmentName: string;
  floor: number;
  sequenceOrder: number;
  status: string;
  prerequisiteCode?: string;
}

export interface DagEdge {
  from: string;
  to: string;
  type: string;
  reason: string;
}

export interface DagResponse {
  visitId: string;
  ticketNumber: string;
  isAcyclic: boolean;
  isStat: boolean;
  vertices: string[];
  edges: DagEdge[];
  sortedOrder: string[];
  safetyAlerts: string[];
  steps: DagStep[];
}
