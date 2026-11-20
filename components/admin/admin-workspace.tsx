"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { StaffWorkspaceShell } from "@/components/layout/staff-workspace-shell";
import {
  adminActions,
  useAdminData,
  type AdminDepartmentItem,
  type AdminScheduleItem,
  type AdminUserItem,
  type ReceptionShiftItem,
  type SystemConfigItem,
  type TriageRuleItem,
} from "@/hooks/use-admin";
import { AdminAnalyticsSection } from "./admin-analytics-section";
import { AdminAuditSection } from "./admin-audit-section";
import styles from "./admin-workspace.module.css";

const { Title } = Typography;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "magenta",
  DOCTOR: "purple",
  NURSE: "cyan",
  RECEPTIONIST: "orange",
  LAB_TECHNICIAN: "blue",
  EMERGENCY_STAFF: "volcano",
  PATIENT: "green",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng",
  RECEPTIONIST: "Lễ tân tiếp đón",
  LAB_TECHNICIAN: "KTV Cận lâm sàng",
  EMERGENCY_STAFF: "Nhân viên Cấp cứu",
  PATIENT: "Bệnh nhân",
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Phòng khám tư vấn",
  PARACLINICAL: "Phòng cận lâm sàng",
  EMERGENCY: "Phòng cấp cứu",
  TRIAGE: "Buồng sàng lọc",
};

interface CreateStaffFormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  nationalId?: string;
  gender?: string;
}

interface UpdateStaffFormValues {
  name?: string;
  phone?: string;
  role?: string;
  nationalId?: string;
  gender?: string;
  isActive?: boolean;
}

interface DepartmentFormValues {
  code?: string;
  name: string;
  roomType: string;
  floor?: number;
  avgServiceTimeMin?: number;
  maxQuotaPerSlot?: number;
  isActive?: boolean;
}

interface ScheduleFormValues {
  doctorId: string;
  departmentCode: string;
  shiftDate: Dayjs;
  shiftType: string;
  maxQuota?: number;
}

interface ReceptionShiftFormValues {
  receptionistId: string;
  deskCode: string;
  businessDate: Dayjs;
  shiftType: string;
}

export function AdminWorkspace({ section }: { section: string }) {
  return (
    <StaffWorkspaceShell
      workspace="admin"
      section={section}
      stationLabel="Trung tâm Quản trị Hệ thống"
    >
      <div className={styles.container}>
        {section === "" && <AdminOverviewSection />}
        {section === "users" && <AdminUsersSection />}
        {section === "departments" && <AdminDepartmentsSection />}
        {section === "schedules" && <AdminSchedulesSection />}
        {section === "analytics" && <AdminAnalyticsSection />}
        {section === "audit-logs" && <AdminAuditSection />}
        {section === "settings" && <AdminSettingsSection />}
      </div>
    </StaffWorkspaceShell>
  );
}

// -------------------------------------------------------------
// 1. OVERVIEW SECTION
// -------------------------------------------------------------
function AdminOverviewSection() {
  const { data: stats, loading, refresh } = useAdminData(adminActions.getStats, 30_000);

  if (loading && !stats) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Bàn làm việc tổng quan</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Tổng Quan Trung Tâm Quản Trị</h1>
          <p>Giám sát tổng thể nhân sự y tế, phân bổ khoa/phòng và các ca trực hoạt động.</p>
        </div>
        <div className={styles.quickActions}>
          <Link href="/dashboard/admin/users">
            <Button type="primary">+ Thêm Nhân Viên</Button>
          </Link>
          <Link href="/dashboard/admin/departments">
            <Button>+ Thêm Khoa / Phòng</Button>
          </Link>
          <Link href="/dashboard/admin/schedules">
            <Button>+ Phân Lịch Trực</Button>
          </Link>
          <Link href="/dashboard/admin/analytics">
            <Button>Báo Cáo & Phân Tích</Button>
          </Link>
          <Button onClick={() => void refresh()}>Làm mới</Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Tổng nhân sự y tế</span>
          <span className={styles.statValue}>{stats?.users.total || 0}</span>
          <span className={styles.statDesc}>
            {stats?.users.active || 0} tài khoản đang hoạt động
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Bác sĩ chuyên khoa</span>
          <span className={styles.statValue}>{stats?.users.byRole?.DOCTOR || 0}</span>
          <span className={styles.statDesc}>Sẵn sàng tiếp nhận bệnh nhân</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Điều dưỡng & Lễ tân</span>
          <span className={styles.statValue}>
            {(stats?.users.byRole?.NURSE || 0) + (stats?.users.byRole?.RECEPTIONIST || 0)}
          </span>
          <span className={styles.statDesc}>
            {stats?.users.byRole?.NURSE || 0} điều dưỡng · {stats?.users.byRole?.RECEPTIONIST || 0}{" "}
            tiếp đón
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statTitle}>Khoa / Phòng hoạt động</span>
          <span className={styles.statValue}>{stats?.departments.active || 0}</span>
          <span className={styles.statDesc}>
            Trên tổng số {stats?.departments.total || 0} phòng danh mục
          </span>
        </div>
      </div>

      <div className={styles.tableCard}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
          Phân bổ Nhân sự theo Vai trò (RBAC)
        </Title>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {Object.entries(stats?.users.byRole || {}).map(([role, count]) => (
            <Tag
              key={role}
              color={ROLE_COLORS[role] || "default"}
              style={{ padding: "6px 14px", fontSize: "14px", borderRadius: "8px" }}
            >
              <strong>{ROLE_LABELS[role] || role}:</strong> {count} nhân sự
            </Tag>
          ))}
        </div>
      </div>

      <div className={styles.tableCard}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
          Đảm Bảo Tuân Thủ Y Tế & Phân Quyền (Medical Compliance)
        </Title>
        <p style={{ color: "#64748b", margin: 0, lineHeight: "1.6" }}>
          Role Admin được thiết kế chuyên biệt cho việc quản trị danh mục, phân bổ nhân sự, lịch
          trực và cấu hình hệ thống. Mọi thao tác sửa chữa hồ sơ bệnh án hoặc chỉ định đơn thuốc đều
          bị chặn theo đúng quy định phân quyền của Bộ Y tế và tiêu chuẩn bảo mật dữ liệu sức khỏe.
        </p>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 2. USERS MANAGEMENT SECTION
// -------------------------------------------------------------
function AdminUsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUserItem | null>(null);

  const [createForm] = Form.useForm<CreateStaffFormValues>();
  const [editForm] = Form.useForm<UpdateStaffFormValues>();
  const [resetForm] = Form.useForm<{ newPassword: string }>();

  const loadUsers = () =>
    adminActions.getUsers({
      search: search.trim() || undefined,
      role: roleFilter,
      isActive: statusFilter,
      page,
      limit,
    });

  const { data, loading, refresh } = useAdminData(loadUsers, 20_000);

  const handleCreateStaff = async (values: CreateStaffFormValues) => {
    try {
      await adminActions.createStaffUser(values);
      message.success("Tạo tài khoản nhân viên y tế thành công!");
      setCreateModalOpen(false);
      createForm.resetFields();
      void refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi tạo tài khoản nhân viên.";
      message.error(msg);
    }
  };

  const handleUpdateStaff = async (values: UpdateStaffFormValues) => {
    if (!editingUser) return;
    try {
      await adminActions.updateStaffUser(editingUser.id, values);
      message.success("Cập nhật thông tin nhân viên thành công!");
      setEditingUser(null);
      void refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi cập nhật thông tin.";
      message.error(msg);
    }
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    try {
      const nextStatus = !user.isActive;
      await adminActions.toggleUserStatus(user.id, nextStatus);
      message.success(
        nextStatus ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản và thu hồi phiên làm việc"
      );
      void refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi đổi trạng thái.";
      message.error(msg);
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!resettingUser) return;
    try {
      await adminActions.resetUserPassword(resettingUser.id, values.newPassword);
      message.success("Đổi mật khẩu thành công và đã thu hồi phiên đăng nhập cũ.");
      setResettingUser(null);
      resetForm.resetFields();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi đặt lại mật khẩu.";
      message.error(msg);
    }
  };

  const columns: ColumnsType<AdminUserItem> = [
    {
      title: "Họ và tên",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <strong>{name}</strong>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role] || "default"}>{ROLE_LABELS[role] || role}</Tag>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (p?: string) => p || "—",
    },
    {
      title: "CCCD / Định danh",
      dataIndex: "nationalId",
      key: "nationalId",
      render: (nid?: string) => nid || "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Badge status="success" text="Hoạt động" />
        ) : (
          <Badge status="error" text="Đã khóa" />
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button
            size="small"
            onClick={() => {
              setEditingUser(record);
              editForm.setFieldsValue({
                name: record.name,
                phone: record.phone,
                role: record.role,
                nationalId: record.nationalId,
                gender: record.gender,
                isActive: record.isActive,
              });
            }}
          >
            Sửa
          </Button>
          <Button size="small" onClick={() => setResettingUser(record)}>
            Đổi mật khẩu
          </Button>
          <Popconfirm
            title={record.isActive ? "Khóa tài khoản này?" : "Kích hoạt lại tài khoản này?"}
            description={
              record.isActive
                ? "Nhân viên sẽ bị đăng xuất ngay lập tức khỏi mọi thiết bị."
                : "Cho phép nhân viên tiếp tục đăng nhập hệ thống."
            }
            onConfirm={() => void handleToggleStatus(record)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button size="small" danger={record.isActive}>
              {record.isActive ? "Khóa" : "Mở"}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Danh sách người dùng & nhân sự</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Quản Lý Nhân Sự & Người Dùng</h1>
          <p>Tạo tài khoản cán bộ y tế, cấp phát vai trò RBAC và kiểm soát bảo mật truy cập.</p>
        </div>
        <Button type="primary" onClick={() => setCreateModalOpen(true)}>
          + Tạo Tài Khoản Nhân Viên
        </Button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Input.Search
            placeholder="Tìm theo tên, email, SĐT, CCCD..."
            allowClear
            style={{ width: 280 }}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
          <Select
            placeholder="Lọc theo vai trò"
            allowClear
            style={{ width: 180 }}
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
            options={[
              { label: "Bác sĩ", value: "DOCTOR" },
              { label: "Điều dưỡng", value: "NURSE" },
              { label: "Lễ tân tiếp đón", value: "RECEPTIONIST" },
              { label: "KTV Cận lâm sàng", value: "LAB_TECHNICIAN" },
              { label: "Quản trị viên", value: "ADMIN" },
              { label: "Bệnh nhân", value: "PATIENT" },
            ]}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { label: "Đang hoạt động", value: true },
              { label: "Đã khóa / Tạm dừng", value: false },
            ]}
          />
        </div>
        <Button onClick={() => void refresh()}>Làm mới</Button>
      </div>

      <div className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.items || []}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.total || 0,
            showTotal: (total) => `Tổng số ${total} người dùng`,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* CREATE STAFF MODAL */}
      <Modal
        title="Tạo Tài Khoản Nhân Viên Y Tế Mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={(vals) => void handleCreateStaff(vals)}>
          <Form.Item
            name="name"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input placeholder="BS. Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email công vụ"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không đúng định dạng" },
            ]}
          >
            <Input placeholder="doctor.a@hospital.vn" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu khởi tạo"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò hệ thống (RBAC)"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select
              placeholder="Chọn vai trò"
              options={[
                { label: "Bác sĩ khám bệnh (DOCTOR)", value: "DOCTOR" },
                { label: "Điều dưỡng sàng lọc (NURSE)", value: "NURSE" },
                { label: "Lễ tân tiếp đón sảnh (RECEPTIONIST)", value: "RECEPTIONIST" },
                { label: "Kỹ thuật viên Cận lâm sàng (LAB_TECHNICIAN)", value: "LAB_TECHNICIAN" },
                { label: "Quản trị viên hệ thống (ADMIN)", value: "ADMIN" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại liên hệ">
            <Input placeholder="0912345678" />
          </Form.Item>

          <Form.Item name="nationalId" label="Số CCCD / CMND">
            <Input placeholder="079201000123" />
          </Form.Item>

          <Form.Item name="gender" label="Giới tính">
            <Radio.Group>
              <Radio value="Nam">Nam</Radio>
              <Radio value="Nữ">Nữ</Radio>
              <Radio value="Khác">Khác</Radio>
            </Radio.Group>
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Tạo
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT STAFF DRAWER */}
      <Drawer
        title="Chỉnh Sửa Thông Tin Nhân Viên"
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        width={420}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={(vals) => void handleUpdateStaff(vals)}>
          <Form.Item
            name="name"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò hệ thống"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select
              options={[
                { label: "Bác sĩ (DOCTOR)", value: "DOCTOR" },
                { label: "Điều dưỡng (NURSE)", value: "NURSE" },
                { label: "Lễ tân tiếp đón (RECEPTIONIST)", value: "RECEPTIONIST" },
                { label: "Kỹ thuật viên (LAB_TECHNICIAN)", value: "LAB_TECHNICIAN" },
                { label: "Quản trị viên (ADMIN)", value: "ADMIN" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>

          <Form.Item name="nationalId" label="Số CCCD">
            <Input />
          </Form.Item>

          <Form.Item name="gender" label="Giới tính">
            <Radio.Group>
              <Radio value="Nam">Nam</Radio>
              <Radio value="Nữ">Nữ</Radio>
              <Radio value="Khác">Khác</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái tài khoản" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setEditingUser(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Thay Đổi
            </Button>
          </div>
        </Form>
      </Drawer>

      {/* RESET PASSWORD MODAL */}
      <Modal
        title={`Đặt Lại Mật Khẩu: ${resettingUser?.name || ""}`}
        open={!!resettingUser}
        onCancel={() => setResettingUser(null)}
        footer={null}
        destroyOnClose
      >
        <Alert
          message="Lưu ý bảo mật"
          description="Đổi mật khẩu sẽ lập tức thu hồi mọi phiên làm việc cũ của nhân viên này trên tất cả thiết bị."
          type="warning"
          showIcon
          style={{ marginBottom: "16px" }}
        />
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={(vals) => void handleResetPassword(vals)}
        >
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setResettingUser(null)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit">
              Xác Nhận Đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 3. DEPARTMENTS SECTION
// -------------------------------------------------------------
function AdminDepartmentsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<AdminDepartmentItem | null>(null);

  const [form] = Form.useForm<DepartmentFormValues>();
  const { data: departments, loading, refresh } = useAdminData(adminActions.getDepartments, 30_000);

  const handleSaveDepartment = async (values: DepartmentFormValues) => {
    try {
      if (editingDept) {
        await adminActions.updateDepartment(editingDept.id, values);
        message.success("Cập nhật phòng khám thành công!");
      } else {
        await adminActions.createDepartment({
          code: values.code!,
          name: values.name,
          roomType: values.roomType,
          floor: values.floor,
          avgServiceTimeMin: values.avgServiceTimeMin,
          maxQuotaPerSlot: values.maxQuotaPerSlot,
        });
        message.success("Thêm phòng khám mới thành công!");
      }
      setModalOpen(false);
      setEditingDept(null);
      form.resetFields();
      void refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi lưu phòng khám.";
      message.error(msg);
    }
  };

  const columns: ColumnsType<AdminDepartmentItem> = [
    {
      title: "Mã phòng",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Tên phòng / khoa",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: "Loại phòng",
      dataIndex: "roomType",
      key: "roomType",
      render: (type: string) => ROOM_TYPE_LABELS[type] || type,
    },
    {
      title: "Tầng",
      dataIndex: "floor",
      key: "floor",
      render: (floor: number) => `Tầng ${floor}`,
    },
    {
      title: "Thời gian phục vụ TB",
      dataIndex: "avgServiceTimeMin",
      key: "avgServiceTimeMin",
      render: (min: number) => `${min} phút`,
    },
    {
      title: "Định mức tối đa / ca",
      dataIndex: "maxQuotaPerSlot",
      key: "maxQuotaPerSlot",
      render: (q: number) => `${q} bệnh nhân`,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Badge status="success" text="Hoạt động" />
        ) : (
          <Badge status="default" text="Tạm đóng" />
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingDept(record);
            form.setFieldsValue({
              code: record.code,
              name: record.name,
              roomType: record.roomType,
              floor: record.floor,
              avgServiceTimeMin: record.avgServiceTimeMin,
              maxQuotaPerSlot: record.maxQuotaPerSlot,
              isActive: record.isActive,
            });
            setModalOpen(true);
          }}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>
        Quản trị hệ thống › Danh mục buồng khám & cận lâm sàng
      </div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Danh Mục Khoa & Buồng Khám</h1>
          <p>
            Cấu hình buồng khám lâm sàng, phòng xét nghiệm, chụp chiếu và chỉ tiêu tiếp nhận định
            mức.
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditingDept(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          + Thêm Buồng Khám Mới
        </Button>
      </div>

      <div className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={departments || []}
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </div>

      <Modal
        title={editingDept ? `Chỉnh Sửa Phòng: ${editingDept.code}` : "Thêm Buồng Khám Mới"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingDept(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(vals) => void handleSaveDepartment(vals)}>
          {!editingDept && (
            <Form.Item
              name="code"
              label="Mã phòng (duy nhất)"
              rules={[{ required: true, message: "Vui lòng nhập mã phòng (vd: P.109)" }]}
            >
              <Input placeholder="P.109" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Tên phòng khám / cận lâm sàng"
            rules={[{ required: true, message: "Vui lòng nhập tên phòng" }]}
          >
            <Input placeholder="Phòng Khám Da Liễu" />
          </Form.Item>

          <Form.Item
            name="roomType"
            label="Loại phòng chức năng"
            rules={[{ required: true, message: "Vui lòng chọn loại phòng" }]}
          >
            <Select
              options={[
                { label: "Phòng khám tư vấn (CONSULTATION)", value: "CONSULTATION" },
                { label: "Phòng cận lâm sàng (PARACLINICAL)", value: "PARACLINICAL" },
                { label: "Phòng cấp cứu khẩn (EMERGENCY)", value: "EMERGENCY" },
                { label: "Buồng sàng lọc (TRIAGE)", value: "TRIAGE" },
              ]}
            />
          </Form.Item>

          <Form.Item name="floor" label="Tầng">
            <InputNumber min={0} max={20} style={{ width: "100%" }} defaultValue={1} />
          </Form.Item>

          <Form.Item name="avgServiceTimeMin" label="Thời gian phục vụ TB (phút)">
            <InputNumber min={1} max={120} style={{ width: "100%" }} defaultValue={15} />
          </Form.Item>

          <Form.Item name="maxQuotaPerSlot" label="Định mức tiếp nhận tối đa / ca">
            <InputNumber min={1} max={200} style={{ width: "100%" }} defaultValue={40} />
          </Form.Item>

          {editingDept && (
            <Form.Item name="isActive" label="Trạng thái hoạt động" valuePropName="checked">
              <Switch checkedChildren="Mở cửa" unCheckedChildren="Đóng cửa" />
            </Form.Item>
          )}

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button
              onClick={() => {
                setModalOpen(false);
                setEditingDept(null);
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu Cấu Hình
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 4. SCHEDULES SECTION (DOCTORS & RECEPTION DESKS)
// -------------------------------------------------------------
function AdminSchedulesSection() {
  const [scheduleTab, setScheduleTab] = useState<"doctor" | "reception">("doctor");

  // Doctor schedules state
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [doctorForm] = Form.useForm<ScheduleFormValues>();
  const schedulesState = useAdminData(() => adminActions.getSchedules(), 30_000);
  const doctorsState = useAdminData(
    () => adminActions.getUsers({ role: "DOCTOR", isActive: true, limit: 100 }),
    60_000
  );
  const deptsState = useAdminData(adminActions.getDepartments, 60_000);

  // Reception shifts state
  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [receptionForm] = Form.useForm<ReceptionShiftFormValues>();
  const receptionShiftsState = useAdminData(() => adminActions.getReceptionShifts(), 30_000);
  const receptionistsState = useAdminData(
    () => adminActions.getUsers({ role: "RECEPTIONIST", isActive: true, limit: 100 }),
    60_000
  );

  const doctors = doctorsState.data?.items || [];
  const receptionists = receptionistsState.data?.items || [];
  const departments = (deptsState.data || []).filter(
    (d) => d.roomType === "CONSULTATION" && d.isActive
  );

  const handleCreateDoctorSchedule = async (values: ScheduleFormValues) => {
    try {
      await adminActions.createSchedule({
        doctorId: values.doctorId,
        departmentCode: values.departmentCode,
        shiftDate: values.shiftDate.format("YYYY-MM-DD"),
        shiftType: values.shiftType,
        maxQuota: values.maxQuota,
      });
      message.success("Phân công ca trực cho bác sĩ thành công!");
      setDoctorModalOpen(false);
      doctorForm.resetFields();
      void schedulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi phân ca trực bác sĩ.";
      message.error(msg);
    }
  };

  const handleDeleteDoctorSchedule = async (id: string) => {
    try {
      await adminActions.deleteSchedule(id);
      message.success("Đã hủy phân công ca trực bác sĩ.");
      void schedulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Không thể hủy ca trực.";
      message.error(msg);
    }
  };

  const handleCreateReceptionShift = async (values: ReceptionShiftFormValues) => {
    try {
      await adminActions.createReceptionShift({
        receptionistId: values.receptionistId,
        deskCode: values.deskCode,
        businessDate: values.businessDate.format("YYYY-MM-DD"),
        shiftType: values.shiftType,
      });
      message.success("Phân công quầy tiếp đón thành công!");
      setReceptionModalOpen(false);
      receptionForm.resetFields();
      void receptionShiftsState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi phân quầy tiếp đón.";
      message.error(msg);
    }
  };

  const handleDeleteReceptionShift = async (id: string) => {
    try {
      await adminActions.deleteReceptionShift(id);
      message.success("Đã hủy phân công quầy tiếp đón.");
      void receptionShiftsState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Không thể hủy ca quầy.";
      message.error(msg);
    }
  };

  const doctorColumns: ColumnsType<AdminScheduleItem> = [
    {
      title: "Ngày trực",
      dataIndex: "shiftDate",
      key: "shiftDate",
      render: (d: string) => new Date(d).toLocaleDateString("vi-VN"),
    },
    {
      title: "Ca trực",
      dataIndex: "shiftType",
      key: "shiftType",
      render: (type: string) => (
        <Tag color={type === "MORNING" ? "gold" : "blue"}>
          {type === "MORNING" ? "Ca Sáng (07:00 - 11:30)" : "Ca Chiều (13:00 - 17:00)"}
        </Tag>
      ),
    },
    {
      title: "Bác sĩ phụ trách",
      dataIndex: "doctorName",
      key: "doctorName",
      render: (name: string, record) => (
        <div>
          <strong>{name}</strong>
          <div style={{ fontSize: "12px", color: "#64748b" }}>{record.doctorEmail}</div>
        </div>
      ),
    },
    {
      title: "Phòng khám",
      dataIndex: "departmentName",
      key: "departmentName",
      render: (name: string, record) => (
        <span>
          <Tag color="cyan">{record.departmentCode}</Tag> {name}
        </span>
      ),
    },
    {
      title: "Quota lượt khám",
      dataIndex: "maxQuota",
      key: "maxQuota",
      render: (q: number) => `${q} bệnh nhân`,
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Hủy ca trực này?"
          description="Bác sĩ sẽ không còn phụ trách phòng khám trong ca này."
          onConfirm={() => void handleDeleteDoctorSchedule(record.id)}
          okText="Đồng ý"
          cancelText="Hủy"
        >
          <Button size="small" danger>
            Hủy phân công
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const receptionColumns: ColumnsType<ReceptionShiftItem> = [
    {
      title: "Ngày trực",
      dataIndex: "businessDate",
      key: "businessDate",
      render: (d: string) => new Date(d).toLocaleDateString("vi-VN"),
    },
    {
      title: "Ca trực",
      dataIndex: "shiftType",
      key: "shiftType",
      render: (type: string) => (
        <Tag color={type === "MORNING" ? "gold" : "blue"}>
          {type === "MORNING" ? "Ca Sáng (07:00 - 11:30)" : "Ca Chiều (13:00 - 17:00)"}
        </Tag>
      ),
    },
    {
      title: "Mã Quầy Sảnh",
      dataIndex: "deskCode",
      key: "deskCode",
      render: (code: string) => <Tag color="purple">Quầy {code}</Tag>,
    },
    {
      title: "Lễ tân phụ trách",
      key: "receptionist",
      render: (_, record) => (
        <div>
          <strong>{record.receptionist?.name || "Lễ tân"}</strong>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {record.receptionist?.email || record.receptionistId}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái quầy",
      dataIndex: "acceptingCalls",
      key: "acceptingCalls",
      render: (accepting: boolean) =>
        accepting ? (
          <Badge status="success" text="Đang tiếp nhận số" />
        ) : (
          <Badge status="default" text="Tạm ngưng" />
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Hủy phân ca quầy này?"
          description="Lễ tân sẽ không còn phụ trách quầy tiếp đón trong ca này."
          onConfirm={() => void handleDeleteReceptionShift(record.id)}
          okText="Đồng ý"
          cancelText="Hủy"
        >
          <Button size="small" danger>
            Hủy phân công
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Lịch trực & Phân ca lâm sàng</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Lịch Trực Bác Sĩ & Quầy Tiếp Đón</h1>
          <p>
            Phân công bác sĩ khám bệnh tại các buồng chuyên khoa và bố trí nhân viên trực quầy sảnh.
          </p>
        </div>
        <div>
          {scheduleTab === "doctor" ? (
            <Button type="primary" onClick={() => setDoctorModalOpen(true)}>
              + Phân Ca Bác Sĩ Mới
            </Button>
          ) : (
            <Button type="primary" onClick={() => setReceptionModalOpen(true)}>
              + Phân Ca Quầy Tiếp Đón Mới
            </Button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={scheduleTab}
          onChange={(e) => setScheduleTab(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="doctor">Lịch Trực Bác Sĩ Phòng Khám</Radio.Button>
          <Radio.Button value="reception">Ca Trực Quầy Tiếp Đón Sảnh</Radio.Button>
        </Radio.Group>
      </div>

      <div className={styles.tableCard}>
        {scheduleTab === "doctor" ? (
          <Table
            rowKey="id"
            columns={doctorColumns}
            dataSource={schedulesState.data || []}
            loading={schedulesState.loading}
            pagination={{ pageSize: 15 }}
          />
        ) : (
          <Table
            rowKey="id"
            columns={receptionColumns}
            dataSource={receptionShiftsState.data || []}
            loading={receptionShiftsState.loading}
            pagination={{ pageSize: 15 }}
          />
        )}
      </div>

      {/* DOCTOR SCHEDULE MODAL */}
      <Modal
        title="Phân Công Bác Sĩ Vào Ca Trực"
        open={doctorModalOpen}
        onCancel={() => setDoctorModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={doctorForm}
          layout="vertical"
          onFinish={(vals) => void handleCreateDoctorSchedule(vals)}
        >
          <Form.Item
            name="doctorId"
            label="Bác sĩ phụ trách"
            rules={[{ required: true, message: "Vui lòng chọn bác sĩ" }]}
          >
            <Select
              placeholder="Chọn bác sĩ"
              options={doctors.map((d) => ({
                label: `${d.name} (${d.email})`,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="departmentCode"
            label="Phòng khám chuyên khoa"
            rules={[{ required: true, message: "Vui lòng chọn phòng khám" }]}
          >
            <Select
              placeholder="Chọn phòng khám"
              options={departments.map((dept) => ({
                label: `${dept.code} - ${dept.name}`,
                value: dept.code,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="shiftDate"
            label="Ngày trực"
            rules={[{ required: true, message: "Vui lòng chọn ngày trực" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="shiftType"
            label="Ca trực"
            rules={[{ required: true, message: "Vui lòng chọn ca trực" }]}
          >
            <Select
              options={[
                { label: "Ca Sáng (07:00 - 11:30)", value: "MORNING" },
                { label: "Ca Chiều (13:00 - 17:00)", value: "AFTERNOON" },
              ]}
            />
          </Form.Item>

          <Form.Item name="maxQuota" label="Định mức tối đa (lượt khám)">
            <InputNumber min={1} max={100} style={{ width: "100%" }} defaultValue={40} />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setDoctorModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Phân Ca
            </Button>
          </div>
        </Form>
      </Modal>

      {/* RECEPTION SHIFT MODAL */}
      <Modal
        title="Phân Công Ca Trực Quầy Tiếp Đón"
        open={receptionModalOpen}
        onCancel={() => setReceptionModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={receptionForm}
          layout="vertical"
          onFinish={(vals) => void handleCreateReceptionShift(vals)}
        >
          <Form.Item
            name="receptionistId"
            label="Nhân viên lễ tân"
            rules={[{ required: true, message: "Vui lòng chọn lễ tân" }]}
          >
            <Select
              placeholder="Chọn nhân viên lễ tân"
              options={receptionists.map((r) => ({
                label: `${r.name} (${r.email})`,
                value: r.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="deskCode"
            label="Mã quầy sảnh"
            rules={[{ required: true, message: "Vui lòng chọn mã quầy" }]}
          >
            <Select
              options={[
                { label: "Quầy 01 (Cửa tiếp nhận chính)", value: "01" },
                { label: "Quầy 02 (Tiếp nhận tiêu chuẩn)", value: "02" },
                { label: "Quầy 03 (Ưu tiên người già & thai sản)", value: "03" },
                { label: "Quầy 04 (Xác nhận đặt hẹn online)", value: "04" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="businessDate"
            label="Ngày trực"
            rules={[{ required: true, message: "Vui lòng chọn ngày trực" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="shiftType"
            label="Ca trực"
            rules={[{ required: true, message: "Vui lòng chọn ca trực" }]}
          >
            <Select
              options={[
                { label: "Ca Sáng (07:00 - 11:30)", value: "MORNING" },
                { label: "Ca Chiều (13:00 - 17:00)", value: "AFTERNOON" },
              ]}
            />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setReceptionModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Phân Quầy
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 5. SETTINGS SECTION (DYNAMIC CONFIGS & TRIAGE RULES)
// -------------------------------------------------------------
function AdminSettingsSection() {
  const configsState = useAdminData(adminActions.getConfigs, 60_000);
  const triageRulesState = useAdminData(adminActions.getTriageRules, 60_000);
  const departmentsState = useAdminData(adminActions.getDepartments, 60_000);

  // Config editing state
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [configForm] = Form.useForm<{ configValue: string; description?: string }>();

  // Triage rule state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TriageRuleItem | null>(null);
  const [ruleForm] = Form.useForm<{
    symptomCode?: string;
    symptomName: string;
    targetDepartmentId: string;
    isRedFlag?: boolean;
    priorityWeight?: number;
  }>();

  const handleUpdateConfig = async (values: { configValue: string; description?: string }) => {
    if (!editingConfig) return;
    try {
      await adminActions.updateConfig(editingConfig.configKey, values);
      message.success("Cập nhật tham số cấu hình thành công!");
      setEditingConfig(null);
      void configsState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi lưu cấu hình.";
      message.error(msg);
    }
  };

  const handleSaveTriageRule = async (values: {
    symptomCode?: string;
    symptomName: string;
    targetDepartmentId: string;
    isRedFlag?: boolean;
    priorityWeight?: number;
  }) => {
    try {
      if (editingRule) {
        await adminActions.updateTriageRule(editingRule.id, values);
        message.success("Cập nhật quy tắc sàng lọc thành công!");
      } else {
        await adminActions.createTriageRule({
          symptomCode: values.symptomCode!,
          symptomName: values.symptomName,
          targetDepartmentId: values.targetDepartmentId,
          isRedFlag: values.isRedFlag,
          priorityWeight: values.priorityWeight,
        });
        message.success("Tạo quy tắc sàng lọc mới thành công!");
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      ruleForm.resetFields();
      void triageRulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi lưu quy tắc sàng lọc.";
      message.error(msg);
    }
  };

  const handleDeleteTriageRule = async (id: string) => {
    try {
      await adminActions.deleteTriageRule(id);
      message.success("Đã xóa quy tắc sàng lọc.");
      void triageRulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Không thể xóa quy tắc.";
      message.error(msg);
    }
  };

  const configColumns: ColumnsType<SystemConfigItem> = [
    {
      title: "Mã Cấu Hình (Key)",
      dataIndex: "configKey",
      key: "configKey",
      width: 220,
      render: (key: string) => <Tag color="blue">{key}</Tag>,
    },
    {
      title: "Giá Trị Cấu Hình (Value)",
      dataIndex: "configValue",
      key: "configValue",
      render: (val: string) => (
        <code style={{ fontSize: 12, background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>
          {val.length > 80 ? `${val.substring(0, 80)}...` : val}
        </code>
      ),
    },
    {
      title: "Mô tả tham số",
      dataIndex: "description",
      key: "description",
      render: (desc?: string) => desc || "—",
    },
    {
      title: "Phiên bản",
      dataIndex: "version",
      key: "version",
      width: 90,
      align: "center",
      render: (v: number) => `v${v}`,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingConfig(record);
            configForm.setFieldsValue({
              configValue: record.configValue,
              description: record.description,
            });
          }}
        >
          Sửa
        </Button>
      ),
    },
  ];

  const triageColumns: ColumnsType<TriageRuleItem> = [
    {
      title: "Mã triệu chứng",
      dataIndex: "symptomCode",
      key: "symptomCode",
      width: 170,
      render: (code: string) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: "Tên triệu chứng lâm sàng",
      dataIndex: "symptomName",
      key: "symptomName",
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: "Khoa tiếp nhận chỉ định",
      key: "targetDept",
      render: (_, record) =>
        record.targetDepartment ? (
          <span>
            <Tag color="geekblue">{record.targetDepartment.code}</Tag>{" "}
            {record.targetDepartment.name}
          </span>
        ) : (
          record.targetDepartmentId
        ),
    },
    {
      title: "Cấp cứu STAT",
      dataIndex: "isRedFlag",
      key: "isRedFlag",
      width: 140,
      align: "center",
      render: (red: boolean) =>
        red ? <Tag color="red">CỜ ĐỎ (STAT)</Tag> : <Tag color="green">Tiêu chuẩn</Tag>,
    },
    {
      title: "Trọng số ưu tiên",
      dataIndex: "priorityWeight",
      key: "priorityWeight",
      width: 130,
      align: "center",
      sorter: (a, b) => a.priorityWeight - b.priorityWeight,
      render: (w: number) => <Tag color="gold">Mức {w}</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button
            size="small"
            onClick={() => {
              setEditingRule(record);
              ruleForm.setFieldsValue({
                symptomName: record.symptomName,
                targetDepartmentId: record.targetDepartmentId,
                isRedFlag: record.isRedFlag,
                priorityWeight: record.priorityWeight,
              });
              setRuleModalOpen(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa quy tắc này?"
            description="Hệ thống sẽ không còn dùng rule này khi phân luồng sàng lọc."
            onConfirm={() => void handleDeleteTriageRule(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const items = [
    {
      key: "configs",
      label: "Cấu Hình Động Hệ Thống",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Table
            dataSource={configsState.data || []}
            columns={configColumns}
            rowKey="id"
            loading={configsState.loading}
            pagination={false}
            bordered
          />
        </div>
      ),
    },
    {
      key: "triage-rules",
      label: "Quy Tắc Sàng Lọc Lâm Sàng (Triage Rules)",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              onClick={() => {
                setEditingRule(null);
                ruleForm.resetFields();
                setRuleModalOpen(true);
              }}
            >
              + Thêm Quy Tắc Sàng Lọc
            </Button>
          </div>
          <Table
            dataSource={triageRulesState.data || []}
            columns={triageColumns}
            rowKey="id"
            loading={triageRulesState.loading}
            pagination={{ pageSize: 15 }}
            bordered
          />
        </div>
      ),
    },
    {
      key: "docs",
      label: "Tiêu Chuẩn & Quy Chuẩn Y Tế",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={styles.configCard}>
            <Title level={4} style={{ marginTop: 0 }}>
              1. Khung Giờ Phát Số Thứ Tự Tự Động
            </Title>
            <p style={{ color: "#64748b" }}>
              Hệ thống chỉ phát số thứ tự tiếp nhận khi cơ sở y tế đang trong khung giờ làm việc:
            </p>
            <ul style={{ lineHeight: "1.8", color: "#334155" }}>
              <li>
                <strong>Ca Sáng:</strong> 06:30 - 11:15 (Giờ tiếp nhận: 07:00 - 11:30)
              </li>
              <li>
                <strong>Ca Chiều:</strong> 12:45 - 16:30 (Giờ tiếp nhận: 13:00 - 17:00)
              </li>
            </ul>
          </div>

          <div className={styles.configCard}>
            <Title level={4} style={{ marginTop: 0 }}>
              2. Tham Số Thuật Toán Dự Báo ETA Sảnh (Queue Simulation)
            </Title>
            <p style={{ color: "#64748b" }}>
              Thời gian chờ dự kiến được tính toán động dựa trên mô hình xếp hàng đa quầy $M/M/c$:
            </p>
            <ul style={{ lineHeight: "1.8", color: "#334155" }}>
              <li>
                <strong>Thời gian phục vụ trung bình tại sảnh:</strong> 5 phút / lượt tiếp nhận.
              </li>
              <li>
                <strong>Cơ chế khóa đa quầy:</strong> Sử dụng PostgreSQL Advisory Transaction Lock
                để chống tranh chấp vé.
              </li>
              <li>
                <strong>Ưu tiên người cao tuổi:</strong> Bệnh nhân từ 75 tuổi trở lên được tự động
                xếp ưu tiên trong hàng đợi phòng khám.
              </li>
            </ul>
          </div>

          <div className={styles.configCard}>
            <Title level={4} style={{ marginTop: 0 }}>
              3. Động Cơ Sàng Lọc Lâm Sàng (NEWS2 & F.A.S.T)
            </Title>
            <p style={{ color: "#64748b" }}>Phân tầng rủi ro tự động theo chuẩn y tế quốc tế:</p>
            <ul style={{ lineHeight: "1.8", color: "#334155" }}>
              <li>
                <strong>Điểm NEWS2 ≥ 7 hoặc Cờ đỏ F.A.S.T:</strong> Tự động điều phối khẩn sang
                buồng Cấp cứu P.001.
              </li>
              <li>
                <strong>Chống chỉ định bức xạ:</strong> Tự động chặn chụp X-quang P.302 đối với bệnh
                nhân nghi ngờ mang thai.
              </li>
              <li>
                <strong>Thứ tự sinh lý học:</strong> Tự động khóa Xét nghiệm nước tiểu P.203 cho đến
                khi Siêu âm bụng P.104 hoàn tất.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Cấu hình vận hành & quy tắc</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Cấu Hình Vận Hành & Quy Tắc Lâm Sàng</h1>
          <p>
            Quản trị tham số thuật toán hàng đợi ETA, điều chỉnh quy tắc phân luồng sàng lọc bệnh
            nhân.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <Tabs items={items} />
      </div>

      {/* EDIT CONFIG MODAL */}
      <Modal
        title={`Chỉnh Sửa Tham Số: ${editingConfig?.configKey || ""}`}
        open={!!editingConfig}
        onCancel={() => setEditingConfig(null)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={configForm}
          layout="vertical"
          onFinish={(vals) => void handleUpdateConfig(vals)}
        >
          <Form.Item
            name="configValue"
            label="Giá trị cấu hình (Text hoặc chuỗi JSON)"
            rules={[{ required: true, message: "Vui lòng nhập giá trị cấu hình" }]}
          >
            <Input.TextArea
              rows={5}
              placeholder='{"alphaWaitWeight": 0.7, "betaDistanceWeight": 0.3}'
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả nghiệp vụ">
            <Input.TextArea
              rows={2}
              placeholder="Ý nghĩa hoặc tài liệu tham khảo của tham số này"
            />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setEditingConfig(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Cấu Hình
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CREATE / EDIT TRIAGE RULE MODAL */}
      <Modal
        title={
          editingRule ? `Sửa Quy Tắc: ${editingRule.symptomCode}` : "Thêm Quy Tắc Sàng Lọc Mới"
        }
        open={ruleModalOpen}
        onCancel={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={ruleForm}
          layout="vertical"
          onFinish={(vals) => void handleSaveTriageRule(vals)}
        >
          {!editingRule && (
            <Form.Item
              name="symptomCode"
              label="Mã triệu chứng (duy nhất)"
              rules={[{ required: true, message: "Vui lòng nhập mã triệu chứng (vd: SYM_FEVER)" }]}
            >
              <Input placeholder="SYM_CHEST_PAIN" />
            </Form.Item>
          )}

          <Form.Item
            name="symptomName"
            label="Tên triệu chứng lâm sàng"
            rules={[{ required: true, message: "Vui lòng nhập tên triệu chứng" }]}
          >
            <Input placeholder="Đau thắt ngực cấp tính" />
          </Form.Item>

          <Form.Item
            name="targetDepartmentId"
            label="Phòng khám chuyên khoa chỉ định"
            rules={[{ required: true, message: "Vui lòng chọn phòng khám" }]}
          >
            <Select
              placeholder="Chọn phòng khám"
              options={(departmentsState.data || []).map((d) => ({
                label: `${d.code} - ${d.name} (${ROOM_TYPE_LABELS[d.roomType] || d.roomType})`,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="isRedFlag"
            label="Phân loại cấp cứu STAT (Cờ đỏ)"
            valuePropName="checked"
          >
            <Switch checkedChildren="STAT Cấp cứu" unCheckedChildren="Khám thường" />
          </Form.Item>

          <Form.Item name="priorityWeight" label="Trọng số ưu tiên sàng lọc (1 - 10)">
            <InputNumber min={1} max={10} style={{ width: "100%" }} defaultValue={1} />
          </Form.Item>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button
              onClick={() => {
                setRuleModalOpen(false);
                setEditingRule(null);
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu Quy Tắc
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
