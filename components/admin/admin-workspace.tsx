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
} from "@/hooks/use-admin";
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
    </>
  );
}

// -------------------------------------------------------------
// 2. USERS MANAGEMENT SECTION
// -------------------------------------------------------------
function AdminUsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  const [createForm] = Form.useForm<CreateStaffFormValues>();
  const [editForm] = Form.useForm<UpdateStaffFormValues>();
  const [resetForm] = Form.useForm<{ newPassword: string }>();

  const usersState = useAdminData(
    () =>
      adminActions.getUsers({
        search: search.trim() || undefined,
        role: roleFilter,
        isActive: statusFilter,
        page,
        limit: 15,
      }),
    15_000
  );

  const handleSearch = () => {
    setPage(1);
    void usersState.refresh();
  };

  const handleCreateStaff = async (values: CreateStaffFormValues) => {
    try {
      await adminActions.createStaffUser(values);
      message.success("Thêm nhân viên y tế mới thành công!");
      setCreateModalOpen(false);
      createForm.resetFields();
      void usersState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi tạo tài khoản nhân viên.";
      message.error(msg);
    }
  };

  const handleUpdateStaff = async (values: UpdateStaffFormValues) => {
    if (!selectedUser) return;
    try {
      await adminActions.updateStaffUser(selectedUser.id, values);
      message.success("Cập nhật thông tin nhân viên thành công!");
      setEditDrawerOpen(false);
      void usersState.refresh();
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
        nextStatus ? `Đã mở khóa tài khoản ${user.name}` : `Đã khóa tài khoản ${user.name}`
      );
      void usersState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg =
        errorCandidate.response?.data?.message || "Không thể thay đổi trạng thái tài khoản.";
      message.error(msg);
    }
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!selectedUser) return;
    try {
      await adminActions.resetUserPassword(selectedUser.id, values.newPassword);
      message.success(`Đã đổi mật khẩu cho tài khoản ${selectedUser.name}!`);
      setResetModalOpen(false);
      resetForm.resetFields();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Không thể đặt lại mật khẩu.";
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
        <Tag color={ROLE_COLORS[role] || "default"} style={{ fontWeight: 600 }}>
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string) => phone || "—",
    },
    {
      title: "Số CCCD",
      dataIndex: "nationalId",
      key: "nationalId",
      render: (id: string) => id || "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Đang hoạt động" />
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
              setSelectedUser(record);
              editForm.setFieldsValue({
                name: record.name,
                phone: record.phone,
                role: record.role,
                nationalId: record.nationalId,
                gender: record.gender,
                isActive: record.isActive,
              });
              setEditDrawerOpen(true);
            }}
          >
            Sửa
          </Button>

          <Button
            size="small"
            onClick={() => {
              setSelectedUser(record);
              resetForm.resetFields();
              setResetModalOpen(true);
            }}
          >
            Đổi mật khẩu
          </Button>

          <Popconfirm
            title={record.isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
            description={
              record.isActive
                ? `Nhân viên ${record.name} sẽ bị đăng xuất khỏi tất cả phiên làm việc.`
                : `Cho phép ${record.name} đăng nhập lại hệ thống.`
            }
            onConfirm={() => void handleToggleStatus(record)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button size="small" danger={record.isActive}>
              {record.isActive ? "Khóa" : "Mở khóa"}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Quản lý tài khoản nhân sự</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Tài Khoản & Phân Quyền (RBAC)</h1>
          <p>
            Quản lý hồ sơ bác sĩ, điều dưỡng, tiếp đón, cấp mật khẩu ban đầu và kiểm soát phiên đăng
            nhập.
          </p>
        </div>
        <Button type="primary" onClick={() => setCreateModalOpen(true)}>
          + Thêm Nhân Viên Mới
        </Button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Input.Search
            placeholder="Tìm theo tên, email, SĐT, CCCD..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 280 }}
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
            placeholder="Trạng thái"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { label: "Đang hoạt động", value: true },
              { label: "Đã khóa", value: false },
            ]}
          />
        </div>
        <Button onClick={() => void usersState.refresh()}>Làm mới</Button>
      </div>

      <div className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={usersState.data?.items || []}
          loading={usersState.loading}
          pagination={{
            current: page,
            pageSize: 15,
            total: usersState.data?.total || 0,
            onChange: (p) => setPage(p),
            showTotal: (t) => `Tổng cộng ${t} người dùng`,
          }}
        />
      </div>

      {/* CREATE STAFF MODAL */}
      <Modal
        title="Thêm Mới Nhân Sự Bệnh Viện"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={(vals) => void handleCreateStaff(vals)}>
          <Form.Item
            name="name"
            label="Họ và tên nhân viên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input placeholder="Ví dụ: BS. Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Địa chỉ Email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không đúng định dạng" },
            ]}
          >
            <Input placeholder="bacsi.nguyenvana@hospital.vn" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu ban đầu"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu ban đầu" },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò (Role)"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select
              placeholder="Chọn vai trò phân quyền"
              options={[
                { label: "Bác sĩ (DOCTOR)", value: "DOCTOR" },
                { label: "Điều dưỡng (NURSE)", value: "NURSE" },
                { label: "Lễ tân tiếp đón (RECEPTIONIST)", value: "RECEPTIONIST" },
                { label: "Kỹ thuật viên Cận lâm sàng (LAB_TECHNICIAN)", value: "LAB_TECHNICIAN" },
                { label: "Nhân viên Cấp cứu (EMERGENCY_STAFF)", value: "EMERGENCY_STAFF" },
                { label: "Quản trị viên (ADMIN)", value: "ADMIN" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại liên lạc">
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
            <Button onClick={() => setCreateModalOpen(false)}>Hủy bỏ</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Tạo Tài Khoản
            </Button>
          </div>
        </Form>
      </Modal>

      {/* EDIT STAFF DRAWER */}
      <Drawer
        title={`Chỉnh Sửa Nhân Sự: ${selectedUser?.name}`}
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        width={420}
      >
        <Form form={editForm} layout="vertical" onFinish={(vals) => void handleUpdateStaff(vals)}>
          <Form.Item
            name="name"
            label="Họ và tên"
            rules={[{ required: true, message: "Không được để trống họ tên" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Bác sĩ (DOCTOR)", value: "DOCTOR" },
                { label: "Điều dưỡng (NURSE)", value: "NURSE" },
                { label: "Lễ tân tiếp đón (RECEPTIONIST)", value: "RECEPTIONIST" },
                { label: "Kỹ thuật viên Cận lâm sàng (LAB_TECHNICIAN)", value: "LAB_TECHNICIAN" },
                { label: "Nhân viên Cấp cứu (EMERGENCY_STAFF)", value: "EMERGENCY_STAFF" },
                { label: "Quản trị viên (ADMIN)", value: "ADMIN" },
                { label: "Bệnh nhân (PATIENT)", value: "PATIENT" },
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

          <div style={{ marginTop: "32px", display: "flex", gap: "8px" }}>
            <Button type="primary" htmlType="submit" block>
              Lưu Thay Đổi
            </Button>
          </div>
        </Form>
      </Drawer>

      {/* RESET PASSWORD MODAL */}
      <Modal
        title={`Đặt Lại Mật Khẩu: ${selectedUser?.name}`}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          message="Lưu ý quan trọng"
          description="Sau khi đổi mật khẩu, toàn bộ phiên đăng nhập hiện tại của người dùng này sẽ bị thu hồi và họ phải đăng nhập lại bằng mật khẩu mới."
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
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button onClick={() => setResetModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Đổi Mật Khẩu
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 3. DEPARTMENTS MANAGEMENT SECTION
// -------------------------------------------------------------
function AdminDepartmentsSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<AdminDepartmentItem | null>(null);

  const [form] = Form.useForm<DepartmentFormValues>();

  const deptsState = useAdminData(adminActions.getDepartments, 30_000);

  const handleSubmit = async (values: DepartmentFormValues) => {
    try {
      if (editingDept) {
        await adminActions.updateDepartment(editingDept.id, values);
        message.success("Cập nhật thông tin phòng thành công!");
      } else {
        await adminActions.createDepartment({
          code: values.code || "",
          name: values.name,
          roomType: values.roomType,
          floor: values.floor,
          avgServiceTimeMin: values.avgServiceTimeMin,
          maxQuotaPerSlot: values.maxQuotaPerSlot,
        });
        message.success("Thêm khoa/phòng mới thành công!");
      }
      setModalOpen(false);
      form.resetFields();
      void deptsState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi lưu thông tin khoa/phòng.";
      message.error(msg);
    }
  };

  const columns: ColumnsType<AdminDepartmentItem> = [
    {
      title: "Mã phòng",
      dataIndex: "code",
      key: "code",
      render: (code: string) => (
        <Tag color="blue" style={{ fontWeight: 700 }}>
          {code}
        </Tag>
      ),
    },
    {
      title: "Tên Khoa / Phòng",
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
      render: (min: number) => `${min} phút/ca`,
    },
    {
      title: "Quota tối đa/ca",
      dataIndex: "maxQuotaPerSlot",
      key: "maxQuotaPerSlot",
      render: (quota: number) => `${quota} lượt`,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Badge status="success" text="Đang mở" />
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
          Chỉnh sửa
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Danh mục Khoa & Phòng khám</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Danh Mục Khoa & Phòng Khám</h1>
          <p>
            Thiết lập danh mục buồng khám, phòng cận lâm sàng và thời gian phục vụ ảnh hưởng tới dự
            báo ETA.
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditingDept(null);
            form.resetFields();
            form.setFieldsValue({
              floor: 1,
              avgServiceTimeMin: 15,
              maxQuotaPerSlot: 40,
              isActive: true,
            });
            setModalOpen(true);
          }}
        >
          + Thêm Khoa / Phòng Mới
        </Button>
      </div>

      <div className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={deptsState.data || []}
          loading={deptsState.loading}
          pagination={{ pageSize: 15 }}
        />
      </div>

      <Modal
        title={editingDept ? `Chỉnh Sửa Phòng: ${editingDept.code}` : "Thêm Mới Khoa / Phòng"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(vals) => void handleSubmit(vals)}>
          {!editingDept && (
            <Form.Item
              name="code"
              label="Mã phòng (duy nhất)"
              rules={[{ required: true, message: "Vui lòng nhập mã phòng (VD: P.109)" }]}
            >
              <Input placeholder="P.109" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Tên Khoa / Phòng khám"
            rules={[{ required: true, message: "Vui lòng nhập tên phòng" }]}
          >
            <Input placeholder="Phòng Khám Da Liễu" />
          </Form.Item>

          <Form.Item
            name="roomType"
            label="Loại phòng"
            rules={[{ required: true, message: "Vui lòng chọn loại phòng" }]}
          >
            <Select
              options={[
                { label: "Phòng khám tư vấn (CONSULTATION)", value: "CONSULTATION" },
                { label: "Phòng cận lâm sàng (PARACLINICAL)", value: "PARACLINICAL" },
                { label: "Phòng cấp cứu (EMERGENCY)", value: "EMERGENCY" },
                { label: "Buồng sàng lọc (TRIAGE)", value: "TRIAGE" },
              ]}
            />
          </Form.Item>

          <Form.Item name="floor" label="Tầng">
            <InputNumber min={0} max={20} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="avgServiceTimeMin" label="Thời gian phục vụ trung bình (phút)">
            <InputNumber min={1} max={120} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="maxQuotaPerSlot" label="Định mức tối đa (lượt/ca)">
            <InputNumber min={1} max={200} style={{ width: "100%" }} />
          </Form.Item>

          {editingDept && (
            <Form.Item name="isActive" label="Trạng thái mở cửa" valuePropName="checked">
              <Switch checkedChildren="Mở" unCheckedChildren="Đóng" />
            </Form.Item>
          )}

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}
          >
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 4. SCHEDULES MANAGEMENT SECTION
// -------------------------------------------------------------
function AdminSchedulesSection() {
  const [modalOpen, setModalOpen] = useState(false);

  const [form] = Form.useForm<ScheduleFormValues>();

  const schedulesState = useAdminData(adminActions.getSchedules, 15_000);
  const doctorsState = useAdminData(
    () => adminActions.getUsers({ role: "DOCTOR", isActive: true, limit: 100 }),
    60_000
  );
  const deptsState = useAdminData(adminActions.getDepartments, 60_000);

  const doctors = doctorsState.data?.items || [];
  const departments = (deptsState.data || []).filter(
    (d) => d.roomType === "CONSULTATION" && d.isActive
  );

  const handleCreateSchedule = async (values: ScheduleFormValues) => {
    try {
      await adminActions.createSchedule({
        doctorId: values.doctorId,
        departmentCode: values.departmentCode,
        shiftDate: values.shiftDate.format("YYYY-MM-DD"),
        shiftType: values.shiftType,
        maxQuota: values.maxQuota,
      });
      message.success("Phân công ca trực cho bác sĩ thành công!");
      setModalOpen(false);
      form.resetFields();
      void schedulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Lỗi khi phân ca trực.";
      message.error(msg);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await adminActions.deleteSchedule(id);
      message.success("Đã hủy phân công ca trực.");
      void schedulesState.refresh();
    } catch (err: unknown) {
      const errorCandidate = err as { response?: { data?: { message?: string } } };
      const msg = errorCandidate.response?.data?.message || "Không thể hủy ca trực.";
      message.error(msg);
    }
  };

  const columns: ColumnsType<AdminScheduleItem> = [
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
          onConfirm={() => void handleDeleteSchedule(record.id)}
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
      <div className={styles.breadcrumb}>Quản trị hệ thống › Lịch trực & Phân ca bác sĩ</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Lịch Trực Phòng Khám</h1>
          <p>
            Phân công bác sĩ trực khám tại các buồng chuyên khoa và định mức số lượng tiếp nhận mỗi
            ca.
          </p>
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Phân Công Ca Trực Mới
        </Button>
      </div>

      <div className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={schedulesState.data || []}
          loading={schedulesState.loading}
          pagination={{ pageSize: 15 }}
        />
      </div>

      <Modal
        title="Phân Công Bác Sĩ Vào Ca Trực"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(vals) => void handleCreateSchedule(vals)}>
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
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Xác Nhận Phân Ca
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// 5. SETTINGS SECTION
// -------------------------------------------------------------
function AdminSettingsSection() {
  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Cấu hình vận hành</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Cấu Hình Vận Hành & Hàng Đợi</h1>
          <p>
            Các tham số cốt lõi quy định thời gian phát số tự động, mô hình ETA và các cờ tính năng.
          </p>
        </div>
      </div>

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
          Thời gian chờ dự kiến được tính toán động dựa trên mô hình xếp hàng đa quầy:
        </p>
        <ul style={{ lineHeight: "1.8", color: "#334155" }}>
          <li>
            <strong>Thời gian phục vụ trung bình tại sảnh:</strong> 5 phút / lượt tiếp nhận.
          </li>
          <li>
            <strong>Cơ chế khóa đa quầy:</strong> Sử dụng PostgreSQL Advisory Transaction Lock để
            chống tranh chấp vé.
          </li>
          <li>
            <strong>Ưu tiên người cao tuổi:</strong> Bệnh nhân từ 75 tuổi trở lên được tự động xếp
            ưu tiên trong hàng đợi phòng khám.
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
            <strong>Điểm NEWS2 ≥ 7 hoặc Cờ đỏ F.A.S.T:</strong> Tự động điều phối khẩn sang buồng
            Cấp cứu P.001.
          </li>
          <li>
            <strong>Chống chỉ định bức xạ:</strong> Tự động chặn chụp X-quang P.302 đối với bệnh
            nhân nghi ngờ mang thai.
          </li>
          <li>
            <strong>Thứ tự sinh lý học:</strong> Tự động khóa Xét nghiệm nước tiểu P.203 cho đến khi
            Siêu âm bụng P.104 hoàn tất.
          </li>
        </ul>
      </div>
    </>
  );
}
