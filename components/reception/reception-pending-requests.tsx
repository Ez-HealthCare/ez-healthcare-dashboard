"use client";

import { Button, Input, List, Modal, Space, Tag, message } from "antd";
import { useState } from "react";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { clinicalErrorMessage } from "@/lib/clinical-error";

export function ReceptionPendingRequests() {
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [rejectId, setRejectId] = useState<string>();
  const [toast, context] = message.useMessage();
  const requests = useClinicalData(() => clinicalActions.pendingReceptionRequests(search), 8_000);
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      setRejectId(undefined);
      setReason("");
      await requests.refresh();
    } catch (error) {
      toast.error(clinicalErrorMessage(error));
    }
  };
  return (
    <section
      style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e8e8f5" }}
    >
      {context}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Input.Search
          placeholder="Tên, CCCD hoặc số điện thoại"
          onSearch={(value) => setSearch(value)}
          allowClear
        />
        <List
          loading={requests.loading}
          dataSource={requests.data || []}
          locale={{ emptyText: "Không có yêu cầu chờ xác minh" }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="confirm"
                  type="primary"
                  onClick={() =>
                    void run(
                      () => clinicalActions.confirmReceptionRequest(item.id),
                      "Đã cấp số tiếp nhận."
                    )
                  }
                >
                  Cấp số HALL
                </Button>,
                <Button key="reject" danger onClick={() => setRejectId(item.id)}>
                  Từ chối
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <strong>{item.patient?.name || "Patient"}</strong>
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
      </Space>
      <Modal
        open={!!rejectId}
        title="Từ chối yêu cầu tiếp nhận"
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onCancel={() => setRejectId(undefined)}
        onOk={() =>
          rejectId &&
          void run(
            () => clinicalActions.rejectReceptionRequest(rejectId, reason),
            "Đã từ chối yêu cầu."
          )
        }
      >
        <Input.TextArea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Lý do không thể đối chiếu hồ sơ"
        />
      </Modal>
    </section>
  );
}
