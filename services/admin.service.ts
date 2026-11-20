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
};
