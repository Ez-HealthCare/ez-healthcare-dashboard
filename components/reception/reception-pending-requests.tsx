"use client";

import { Alert, Button, Input, List, Modal, Space, Tag, message } from "antd";
import Link from "next/link";
import { useRef, useState } from "react";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import type { ReceptionRequest } from "@/lib/types/clinical";

export function ReceptionPendingRequests() {
  const [search, setSearch] = useState("");
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Input.Search
        aria-label="Tìm yêu cầu tiếp nhận"
        placeholder="Tên, CCCD hoặc số điện thoại"
        onSearch={setSearch}
        allowClear
        enterButton="Tìm kiếm"
      />
      <PendingList key={search} search={search} />
    </div>
  );
}

function PendingList({ search }: { search: string }) {
  const requests = useClinicalData(() => clinicalActions.pendingReceptionRequests(search), 8_000);
  const [reason, setReason] = useState("");
  const [rejectId, setRejectId] = useState<string>();
  const [confirm, setConfirm] = useState<ReceptionRequest>();
  const [issued, setIssued] = useState<{ hallTicketNumber: string }>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [toast, context] = message.useMessage();
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setRejectId(undefined);
      setConfirm(undefined);
      setReason("");
      await requests.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section style={{ background: "#fff", borderRadius: 20, padding: 24 }}>
      {context}
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Button onClick={() => void requests.refresh()} loading={requests.loading}>
          ↻ Làm mới yêu cầu
        </Button>
        {requests.error ? (
          <Alert
            type="error"
            title="Không tải được yêu cầu tiếp nhận"
            description={requests.error}
          />
        ) : (
          <List
            loading={requests.loading}
            dataSource={requests.data || []}
            locale={{ emptyText: "Không có yêu cầu chờ cấp số" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="confirm"
                    type="primary"
                    disabled={busy}
                    onClick={() => setConfirm(item)}
                  >
                    Duyệt & cấp số tiếp nhận
                  </Button>,
                  <Button key="reject" danger disabled={busy} onClick={() => setRejectId(item.id)}>
                    Từ chối
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <strong>{item.patient?.name || "Chưa có tên"}</strong>
                      <Tag color="blue">Chờ cấp số</Tag>
                    </Space>
                  }
                  description={
                    <span>
                      CCCD: {item.patient?.nationalId || "—"} ·{" "}
                      {item.chiefComplaint || "Chưa có lý do khám"}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Space>
      <Modal
        title="Duyệt yêu cầu & Cấp số tiếp nhận"
        open={!!confirm}
        okText="Cấp số và đưa vào hàng đợi"
        cancelText="Quay lại"
        confirmLoading={busy}
        okButtonProps={{ disabled: busy }}
        onCancel={() => {
          if (!busy) setConfirm(undefined);
        }}
        onOk={() =>
          confirm &&
          void run(async () => {
            const result = await clinicalActions.confirmReceptionRequest(confirm.id);
            setIssued(result);
          }, "Đã cấp số tiếp nhận và đưa bệnh nhân vào hàng đợi.")
        }
      >
        <p>
          <strong>{confirm?.patient?.name}</strong> · CCCD: {confirm?.patient?.nationalId || "—"}
        </p>
        <p>{confirm?.chiefComplaint || "Chưa có lý do khám"}</p>
      </Modal>
      <Modal
        open={!!issued}
        title="Đã đưa bệnh nhân vào hàng đợi"
        onCancel={() => setIssued(undefined)}
        footer={
          <Space>
            <Button onClick={() => setIssued(undefined)}>Tiếp tục duyệt yêu cầu</Button>
            <Link href="/dashboard/receptionist/queue">
              <Button type="primary">Đến hàng đợi tiếp nhận</Button>
            </Link>
          </Space>
        }
      >
        <p>
          Số tiếp nhận: <strong>{issued?.hallTicketNumber}</strong>
        </p>
        <p>Bạn có thể gọi người bệnh tại Bàn tiếp nhận hoặc Hàng đợi.</p>
      </Modal>
      <Modal
        open={!!rejectId}
        title="Từ chối yêu cầu tiếp nhận"
        okText="Xác nhận từ chối"
        cancelText="Quay lại"
        confirmLoading={busy}
        okButtonProps={{ danger: true, disabled: busy || !reason.trim() }}
        onCancel={() => {
          if (!busy) {
            setRejectId(undefined);
            setReason("");
          }
        }}
        onOk={() =>
          rejectId &&
          void run(
            () => clinicalActions.rejectReceptionRequest(rejectId, reason.trim()),
            "Đã từ chối yêu cầu."
          )
        }
      >
        <Input.TextArea
          aria-label="Lý do từ chối yêu cầu"
          rows={3}
          value={reason}
          disabled={busy}
          maxLength={2000}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do từ chối yêu cầu"
        />
      </Modal>
    </section>
  );
}
