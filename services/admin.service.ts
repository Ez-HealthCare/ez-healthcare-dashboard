import { http } from "@/lib/api/http";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  nationalId?: string;
  gender?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  departments: {
    total: number;
    active: number;
  };
  schedules: {
    total: number;
  };
  visits?: {
    total: number;
  };
}

export interface AdminDepartmentItem {
  id: string;
  code: string;
  name: string;
  roomType: string;
  floor: number;
  avgServiceTimeMin: number;
  maxQuotaPerSlot: number;
  isActive: boolean;
}

export interface AdminScheduleItem {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  shiftDate: string;
  shiftType: string;
  maxQuota: number;
  createdAt: string;
}

export interface ReportSummary {
  totalVisits: number;
  uniquePatients: number;
  statEmergencyCount: number;
  emergencyRate: number;
  byStatus: Record<string, number>;
}

export interface DepartmentReportItem {
  id: string;
  code: string;
  name: string;
  roomType: string;
  floor: number;
  totalInitialVisits: number;
  totalCurrentVisits: number;
  completedVisits: number;
  avgServiceTimeMin: number;
}

export interface EtaPerformanceReport {
  totalForecasts: number;
  evaluatedCount: number;
  maeMinutes: number;
  avgActualWaitMinutes: number;
  avgEstimatedWaitMinutes: number;
  within3MinCount: number;
  within3MinRate: number;
  within5MinCount: number;
  within5MinRate: number;
  distribution: {
    under3Min: number;
    from3To5Min: number;
    from5To10Min: number;
    over10Min: number;
  };
}

export interface TriageRiskReport {
  totalVitals: number;
  riskTiers: {
    low: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    high: { count: number; percentage: number };
  };
  redFlags: {
    count: number;
    percentage: number;
    reasons: Record<string, number>;
  };
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  targetEntityType: string;
  targetEntityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemConfigItem {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TriageRuleItem {
  id: string;
  symptomCode: string;
  symptomName: string;
  targetDepartmentId: string;
  targetDepartment?: {
    id: string;
    code: string;
    name: string;
  };
  isRedFlag: boolean;
  contraindicationTags?: string[];
  priorityWeight: number;
}

export interface ReceptionShiftItem {
  id: string;
  businessDate: string;
  shiftType: string;
  deskCode: string;
  receptionistId: string;
  receptionist?: {
    id: string;
    name: string;
    email: string;
  };
  acceptingCalls: boolean;
}

const path = (value: string) => `/clinical/${value}`;

export const adminService = {
  getStats: () => http.get<AdminStats>(path("admin/stats")).then((r) => r.data),

  getUsers: (params: {
    search?: string;
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => http.get<AdminUsersResponse>(path("admin/users"), { params }).then((r) => r.data),

  createStaffUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    nationalId?: string;
    gender?: string;
  }) => http.post<AdminUserItem>(path("admin/users"), payload).then((r) => r.data),

  updateStaffUser: (
    id: string,
    payload: {
      name?: string;
      phone?: string;
      role?: string;
      nationalId?: string;
      gender?: string;
      isActive?: boolean;
    }
  ) => http.put<AdminUserItem>(path(`admin/users/${id}`), payload).then((r) => r.data),

  toggleUserStatus: (id: string, isActive: boolean) =>
    http
      .patch<{ id: string; isActive: boolean }>(path(`admin/users/${id}/status`), { isActive })
      .then((r) => r.data),

  resetUserPassword: (id: string, newPassword: string) =>
    http
      .post<{ message: string; userId: string }>(path(`admin/users/${id}/reset-password`), {
        newPassword,
      })
      .then((r) => r.data),

  getDepartments: () =>
    http.get<AdminDepartmentItem[]>(path("admin/departments")).then((r) => r.data),

  createDepartment: (payload: {
    code: string;
    name: string;
    roomType: string;
    floor?: number;
    avgServiceTimeMin?: number;
    maxQuotaPerSlot?: number;
  }) => http.post<AdminDepartmentItem>(path("admin/departments"), payload).then((r) => r.data),

  updateDepartment: (
    id: string,
    payload: {
      name?: string;
      roomType?: string;
      floor?: number;
      avgServiceTimeMin?: number;
      maxQuotaPerSlot?: number;
      isActive?: boolean;
    }
  ) => http.put<AdminDepartmentItem>(path(`admin/departments/${id}`), payload).then((r) => r.data),

  getSchedules: (shiftDate?: string, departmentCode?: string) =>
    http
      .get<AdminScheduleItem[]>(path("admin/schedules"), { params: { shiftDate, departmentCode } })
      .then((r) => r.data),

  createSchedule: (payload: {
    doctorId: string;
    departmentCode: string;
    shiftDate: string;
    shiftType: string;
    maxQuota?: number;
  }) => http.post<AdminScheduleItem>(path("admin/schedules"), payload).then((r) => r.data),

  deleteSchedule: (id: string) =>
    http.delete<{ message: string; id: string }>(path(`admin/schedules/${id}`)).then((r) => r.data),

  // ---------------------------------------------------------
  // RECEPTION DESK SHIFTS
  // ---------------------------------------------------------

  getReceptionShifts: (businessDate?: string) =>
    http
      .get<ReceptionShiftItem[]>(path("admin/reception-shifts"), { params: { businessDate } })
      .then((r) => r.data),

  createReceptionShift: (payload: {
    businessDate: string;
    shiftType: string;
    deskCode: string;
    receptionistId: string;
    acceptingCalls?: boolean;
  }) => http.post<ReceptionShiftItem>(path("admin/reception-shifts"), payload).then((r) => r.data),

  deleteReceptionShift: (id: string) =>
    http
      .delete<{ message: string; id: string }>(path(`admin/reception-shifts/${id}`))
      .then((r) => r.data),

  // ---------------------------------------------------------
  // CONFIGS & TRIAGE RULES
  // ---------------------------------------------------------

  getConfigs: () => http.get<SystemConfigItem[]>(path("admin/configs")).then((r) => r.data),

  updateConfig: (key: string, payload: { configValue: string; description?: string }) =>
    http.put<SystemConfigItem>(path(`admin/configs/${key}`), payload).then((r) => r.data),

  getTriageRules: () => http.get<TriageRuleItem[]>(path("admin/triage-rules")).then((r) => r.data),

  createTriageRule: (payload: {
    symptomCode: string;
    symptomName: string;
    targetDepartmentId: string;
    isRedFlag?: boolean;
    contraindicationTags?: string[];
    priorityWeight?: number;
  }) => http.post<TriageRuleItem>(path("admin/triage-rules"), payload).then((r) => r.data),

  updateTriageRule: (
    id: string,
    payload: {
      symptomName?: string;
      targetDepartmentId?: string;
      isRedFlag?: boolean;
      contraindicationTags?: string[];
      priorityWeight?: number;
    }
  ) => http.put<TriageRuleItem>(path(`admin/triage-rules/${id}`), payload).then((r) => r.data),

  deleteTriageRule: (id: string) =>
    http
      .delete<{ message: string; id: string }>(path(`admin/triage-rules/${id}`))
      .then((r) => r.data),

  // ---------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------

  getAuditLogs: (params: {
    action?: string;
    actorRole?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => http.get<AuditLogsResponse>(path("admin/audit-logs"), { params }).then((r) => r.data),

  // ---------------------------------------------------------
  // HOSPITAL ANALYTICS & REPORTS
  // ---------------------------------------------------------

  getReportSummary: (params?: { startDate?: string; endDate?: string; departmentId?: string }) =>
    http.get<ReportSummary>(path("admin/reports/summary"), { params }).then((r) => r.data),

  getDepartmentReports: (params?: { startDate?: string; endDate?: string }) =>
    http
      .get<DepartmentReportItem[]>(path("admin/reports/departments"), { params })
      .then((r) => r.data),

  getEtaPerformance: (params?: { startDate?: string; endDate?: string }) =>
    http
      .get<EtaPerformanceReport>(path("admin/reports/eta-performance"), { params })
      .then((r) => r.data),

  getTriageRiskReport: (params?: { startDate?: string; endDate?: string }) =>
    http.get<TriageRiskReport>(path("admin/reports/triage-risk"), { params }).then((r) => r.data),

  exportReportCsv: (params?: { startDate?: string; endDate?: string }) =>
    http
      .get(path("admin/reports/export"), {
        params,
        responseType: "text",
      })
      .then((r) => r.data as string),
};
