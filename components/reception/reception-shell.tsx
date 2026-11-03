"use client";

import { StaffWorkspaceShell } from "@/components/layout/staff-workspace-shell";
import { ReceptionRecords } from "./reception-records";
import { ReceptionWorkspace } from "./reception-workspace";
import { ReceptionPendingRequests } from "./reception-pending-requests";
import { ReceptionAppointments } from "./reception-appointments";
import styles from "./reception-workspace.module.css";

export function ReceptionShell({ section }: { section: string }) {
  return (
    <StaffWorkspaceShell workspace="receptionist" section={section}>
      {section === "records" ? (
        <ReceptionRecords />
      ) : section === "requests" || section === "appointments" ? (
        <div className={styles.workspace}>
          <div className={styles.breadcrumb}>
            Khu tiếp đón trung tâm › {section === "requests" ? "Yêu cầu tiếp nhận" : "Lịch hẹn"}
          </div>
          <div className={styles.pageHeading}>
            <h1>{section === "requests" ? "Yêu cầu tiếp nhận" : "Lịch hẹn hôm nay"}</h1>
            <p>
              {section === "requests"
                ? "Duyệt thông tin đăng ký và cấp số tiếp nhận. Sau đó gọi bệnh nhân tại Bàn tiếp nhận hoặc Hàng đợi để xác minh giấy tờ."
                : "Tra cứu lịch hẹn, xác nhận đến khám và cấp số tiếp nhận."}
            </p>
          </div>
          {section === "requests" ? <ReceptionPendingRequests /> : <ReceptionAppointments />}
        </div>
      ) : (
        <ReceptionWorkspace section={section} />
      )}
    </StaffWorkspaceShell>
  );
}
