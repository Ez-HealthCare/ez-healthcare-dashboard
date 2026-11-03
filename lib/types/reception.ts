import type { ReceptionVisit } from "./clinical";

export interface ReceptionRecord extends ReceptionVisit {
  updatedAt: string;
  isVerified: boolean;
  ticketHistory: Array<{
    id: string;
    kind: "HALL" | "CLINIC";
    number: string;
    status: string;
    businessDate: string;
    createdAt: string;
    queuedAt: string;
    lastCalledAt?: string;
    callAttempts: number;
    reissueReason?: string;
  }>;
}
export interface ReceptionRecordsPage {
  items: ReceptionRecord[];
  total: number;
  businessDate: string;
  page: number;
  pageSize: number;
}
