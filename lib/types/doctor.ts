import type { ClinicQueueItem, VisitStatus } from "./clinical";

export interface PrescriptionItem {
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions?: string;
}

export interface VisitDossier {
  visitId: string;
  hallTicketNumber: string;
  clinicTicketNumber?: string;
  status: VisitStatus;
  chiefComplaint?: string;
  symptomOnset?: string;
  symptomDuration?: string;
  symptomSeverity?: string | number;
  createdAt: string;
  updatedAt?: string;
  isVerified: boolean;
  patient: {
    id: string;
    name: string;
    dateOfBirth?: string;
    gender?: string;
    allergies?: string[];
  };
  currentDepartment?: { id: string; code: string; name: string };
  currentDoctor?: { id: string; name: string };
  vital?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    spo2?: number;
    respiratoryRate?: number;
    isRedFlag?: boolean;
    redFlagReason?: string;
    notes?: string;
  };
  steps?: Array<{
    stepId: string;
    sequenceOrder: number;
    status: string;
    isReExam: boolean;
    department?: { code: string; name: string; roomType?: string };
  }>;
  prescription?: {
    id: string;
    signedAt?: string;
    doctor?: { id: string; name: string };
    icd10Code?: string;
    icd10Name?: string;
    notes?: string;
    revisitDate?: string;
    digitalSignature?: string;
    items?: PrescriptionItem[];
  };
}

export interface PatientVisitHistory {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    visitId: string;
    createdAt: string;
    updatedAt: string;
    status: VisitStatus;
    hallTicketNumber: string;
    clinicTicketNumber?: string;
    chiefComplaint?: string;
    room?: { code: string; name: string } | null;
    doctor?: { id: string; name: string } | null;
    conclusion?: { icd10Code: string; icd10Name: string; signedAt: string } | null;
  }>;
}

export interface DoctorVisitHistory {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    visitId: string;
    patientName: string;
    createdAt: string;
    completedAt: string;
    hallTicketNumber: string;
    clinicTicketNumber?: string;
    room?: { code: string; name: string } | null;
    icd10Code: string;
    icd10Name: string;
  }>;
}

export interface DiagnosticResult {
  resultId: string;
  stepId: string;
  serviceName: string;
  quantitativeValues?: Record<string, unknown>;
  findings?: string;
  isPanicValue: boolean;
  panicAlertDetails?: string;
  dicomImageUrls?: string[];
  approvedAt?: string;
  stepStatus?: string;
  technician?: { id: string; name: string };
}

export interface DoctorCompletion {
  patient: ClinicQueueItem;
  title: string;
  description: string;
}
