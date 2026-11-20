"use client";

import { useCallback, useState } from "react";
import { Button, Input, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { adminActions, useAdminData, type AuditLogItem } from "@/hooks/use-admin";
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

const ACTION_TAGS: Record<string, { color: string; label: string }> = {
  CREATE_STAFF_USER: { color: "green", label: "Tạo nhân viên" },
  UPDATE_STAFF_USER: { color: "blue", label: "Cập nhật nhân viên" },
  TOGGLE_USER_STATUS: { color: "orange", label: "Đổi trạng thái tài khoản" },
  ADMIN_RESET_PASSWORD: { color: "red", label: "Reset mật khẩu" },
  CREATE_SCHEDULE: { color: "cyan", label: "Phân ca bác sĩ" },
  DELETE_SCHEDULE: { color: "volcano", label: "Hủy ca bác sĩ" },
  CREATE_RECEPTION_SHIFT: { color: "purple", label: "Phân ca quầy tiếp đón" },
  DELETE_RECEPTION_SHIFT: { color: "volcano", label: "Hủy ca quầy tiếp đón" },
  UPDATE_DEPARTMENT: { color: "geekblue", label: "Cập nhật phòng khám" },
  UPDATE_SYSTEM_CONFIG: { color: "gold", label: "Cập nhật cấu hình" },
  CREATE_TRIAGE_RULE: { color: "lime", label: "Tạo rule sàng lọc" },
  UPDATE_TRIAGE_RULE: { color: "blue", label: "Cập nhật rule sàng lọc" },
  DELETE_TRIAGE_RULE: { color: "red", label: "Xóa rule sàng lọc" },
};

export function AdminAuditSection() {
  const [action, setAction] = useState<string | undefined>();
  const [actorRole, setActorRole] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadData = useCallback(() => {
    return adminActions.getAuditLogs({
      action: action || undefined,
      actorRole: actorRole || undefined,
      search: search.trim() || undefined,
      page,
      limit,
    });
  }, [action, actorRole, search, page, limit]);

  const { data, loading, refresh } = useAdminData(loadData, 20_000);

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm:ss"),
    },
    {
      title: "Vai trò tác nhân",
      dataIndex: "actorRole",
      key: "actorRole",
      width: 150,
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role] || "default"}>{role || "SYSTEM"}</Tag>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 220,
      render: (act: string) => {
        const item = ACTION_TAGS[act] || { color: "default", label: act };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: "Đối tượng tác động",
      key: "target",
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: 600 }}>{row.targetEntityType}</span>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.targetEntityId}</div>
        </div>
      ),
    },
    {
      title: "Địa chỉ IP",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 130,
      render: (ip?: string) => ip || "—",
    },
    {
      title: "Chi tiết",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, row) => (
        <Button size="small" onClick={() => setSelectedLog(row)}>
          Xem
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className={styles.breadcrumb}>Quản trị hệ thống › Nhật ký kiểm toán hoạt động</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Nhật Ký Hoạt Động (Audit Trail)</h1>
          <p>
            Ghi nhận toàn bộ vết thao tác hệ thống theo tiêu chuẩn an toàn y tế và truy vết phân
            quyền.
          </p>
        </div>
        <div className={styles.quickActions}>
          <Button onClick={() => void refresh()}>Làm mới</Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Input.Search
            placeholder="Tìm theo hành động / đối tượng..."
            allowClear
            style={{ width: 280 }}
            onSearch={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />

          <Select
            placeholder="Lọc vai trò tác nhân"
            allowClear
            style={{ width: 180 }}
            value={actorRole}
            onChange={(val) => {
              setActorRole(val);
              setPage(1);
            }}
            options={[
              { label: "ADMIN (Quản trị)", value: "ADMIN" },
              { label: "DOCTOR (Bác sĩ)", value: "DOCTOR" },
              { label: "NURSE (Điều dưỡng)", value: "NURSE" },
              { label: "RECEPTIONIST (Lễ tân)", value: "RECEPTIONIST" },
            ]}
          />

          <Select
            placeholder="Lọc loại hành động"
            allowClear
            style={{ width: 220 }}
            value={action}
            onChange={(val) => {
              setAction(val);
              setPage(1);
            }}
            options={Object.entries(ACTION_TAGS).map(([key, val]) => ({
              label: val.label,
              value: key,
            }))}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <Table
          dataSource={data?.items || []}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.total || 0,
            showTotal: (total) => `Tổng ${total} nhật ký hoạt động`,
            onChange: (p) => setPage(p),
          }}
          bordered
        />
      </div>

      <Modal
        title="Chi Tiết Thao Tác (Audit Log Payload)"
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedLog(null)}>
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedLog && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <strong>Thời điểm:</strong>{" "}
              {dayjs(selectedLog.createdAt).format("DD/MM/YYYY HH:mm:ss")}
            </div>
            <div>
              <strong>Tác nhân:</strong>{" "}
              <Tag color={ROLE_COLORS[selectedLog.actorRole || ""] || "default"}>
                {selectedLog.actorRole || "SYSTEM"}
              </Tag>{" "}
              <span style={{ fontSize: 12, color: "#64748b" }}>
                ID: {selectedLog.actorId || "Hệ thống"}
              </span>
            </div>
            <div>
              <strong>Hành động:</strong>{" "}
              <Tag color={ACTION_TAGS[selectedLog.action]?.color || "default"}>
                {selectedLog.action}
              </Tag>
            </div>
            <div>
              <strong>Đối tượng:</strong> {selectedLog.targetEntityType} (ID:{" "}
              {selectedLog.targetEntityId})
            </div>
            <div>
              <Title level={5} style={{ marginTop: 8, marginBottom: 4 }}>
                Metadata (Dữ liệu thay đổi):
              </Title>
              <pre className={styles.jsonViewer}>
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
