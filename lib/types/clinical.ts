// Clinical response models; this file does not define a React hook.
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
