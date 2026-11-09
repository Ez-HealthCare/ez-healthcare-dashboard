"use client";
import { Alert, Button, Skeleton, Tag } from "antd";
import Link from "next/link";
import { useClinicalData } from "@/hooks/use-clinical";
import { formatDate, formatDateTime } from "@/lib/display-format";
import { visitStatusLabel } from "@/lib/visit-status";
import type { VisitDossier } from "@/lib/types/doctor";
import { RecordIdentifier } from "./record-identifier";
import { PatientIcon } from "../patient/patient-icon";
import styles from "./visit-record.module.css";
export function ReadOnlyVisitRecord({
  visitId,
  load,
  backHref,
  backLabel,
  patientView = false,
}: {
  visitId: string;
  load: (id: string) => Promise<VisitDossier>;
  backHref: string;
  backLabel: string;
  patientView?: boolean;
}) {
  const dossier = useClinicalData(() => load(visitId), 8_000);
  const data = dossier.data;
  const prescription = data?.prescription;
  return (
    <section
      className={styles.section}
      data-detail="true"
      data-patient={patientView || undefined}
      aria-label="Chi tiết hồ sơ khám bệnh"
    >
      <div className={styles.heading}>
        <div>
          <Link className={styles.openLink} href={backHref}>
            ← {backLabel}
          </Link>
          <h1>{data?.status === "COMPLETED" ? "Kết luận & Đơn thuốc" : "Chi tiết lượt khám"}</h1>
          <p className={styles.muted}>
            {data?.status === "COMPLETED"
              ? "Kết luận, đơn thuốc và hướng dẫn đã được lưu trong hồ sơ."
              : "Thông tin lượt khám và các bước được ghi nhận trong hồ sơ của bạn."}
          </p>
        </div>
        <Button onClick={() => void dossier.refresh()}>Làm mới hồ sơ</Button>
      </div>
      {dossier.error && (
        <Alert
          type="error"
          showIcon
          title="Không mở được hồ sơ"
          description={dossier.error}
          action={<Button onClick={() => void dossier.refresh()}>Thử lại</Button>}
        />
      )}
      {dossier.loading && !data ? <Skeleton active /> : null}
      {data && (
        <>
          {patientView && (
            <nav className={styles.recordNavigation} aria-label="Điều hướng hồ sơ">
              <a href="#record-summary">Thông tin lượt khám</a>
              {prescription && (
                <>
                  <a href="#record-conclusion">Kết luận</a>
                  <a href="#record-prescription">Đơn thuốc</a>
                  <a href="#record-followup">Tái khám</a>
                </>
              )}
            </nav>
          )}
          <section
            id={patientView ? "record-summary" : undefined}
            className={`${styles.card} ${styles.summaryCard}`}
          >
            <div className={styles.heading}>
              <div className={styles.identity}>
                <span className={styles.patientAvatar}>
                  <PatientIcon name="user" />
                </span>
                <div>
                  <span className={styles.eyebrow}>Thông tin người bệnh</span>
                  <h2>{data.patient.name}</h2>
                </div>
              </div>
              <Tag color={data.status === "COMPLETED" ? "green" : "blue"}>
                {visitStatusLabel(data.status)}
              </Tag>
            </div>
            <dl className={`${styles.details} ${styles.summaryDetails}`}>
              <div>
                <dt>Số khám / tiếp nhận</dt>
                <dd>{data.clinicTicketNumber || data.hallTicketNumber}</dd>
              </div>
              <div>
                <dt>Ngày khám</dt>
                <dd>{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt>Phòng khám</dt>
                <dd>
                  {data.currentDepartment
                    ? `${data.currentDepartment.code} · ${data.currentDepartment.name}`
                    : "Chưa phân phòng"}
                </dd>
              </div>
              <div>
                <dt>Bác sĩ</dt>
                <dd>
                  {prescription?.doctor?.name || data.currentDoctor?.name || "Chưa tiếp nhận khám"}
                </dd>
              </div>
            </dl>
            <RecordIdentifier label="Mã lượt" value={data.visitId} />
            <p className={styles.preformatted}>
              <strong>Lý do khám: </strong>
              {data.chiefComplaint || "Chưa ghi nhận"}
            </p>
          </section>
          <div className={styles.recordGrid}>
            <div className={styles.recordMain}>
              {data.status === "COMPLETED" && !prescription && (
                <Alert
                  type="warning"
                  showIcon
                  title="Chưa tải được kết luận và đơn thuốc của lượt đã hoàn tất"
                  description="Vui lòng thử làm mới hoặc liên hệ cơ sở y tế để kiểm tra hồ sơ."
                />
              )}
              {prescription ? (
                <>
                  <section
                    id={patientView ? "record-conclusion" : undefined}
                    className={styles.card}
                    aria-label="Kết luận khám"
                  >
                    <h2>Kết luận chẩn đoán</h2>
                    <p>
                      <Tag>{prescription.icd10Code}</Tag> {prescription.icd10Name}
                    </p>
                    <p className={styles.muted}>
                      Đã lưu lúc {formatDateTime(prescription.signedAt || data.updatedAt)}
                    </p>
                    {prescription.notes && (
                      <>
                        <h4>Ghi nhận & Lời dặn của bác sĩ</h4>
                        <p className={styles.preformatted}>{prescription.notes}</p>
                      </>
                    )}
                  </section>
                  <section
                    id={patientView ? "record-prescription" : undefined}
                    className={styles.card}
                    aria-label="Đơn thuốc đã lưu"
                  >
                    <h2>
                      Đơn thuốc{" "}
                      <span className={styles.muted}>
                        ({prescription.items?.length || 0} thuốc)
                      </span>
                    </h2>
                    {prescription.items?.length ? (
                      <ol className={styles.medications}>
                        {prescription.items.map((item, index) => (
                          <li key={index}>
                            <h4>
                              {index + 1}. {item.medicationName}
                            </h4>
                            <dl className={styles.details}>
                              <div>
                                <dt>Hàm lượng / Liều dùng</dt>
                                <dd>{item.dosage || "—"}</dd>
                              </div>
                              <div>
                                <dt>Đường dùng</dt>
                                <dd>
                                  {{
                                    ORAL: "Đường uống",
                                    TOPICAL: "Dùng ngoài",
                                    INJECTION: "Đường tiêm",
                                  }[item.route] ||
                                    item.route ||
                                    "—"}
                                </dd>
                              </div>
                              <div>
                                <dt>Tần suất</dt>
                                <dd>{item.frequency || "—"}</dd>
                              </div>
                              <div>
                                <dt>Thời gian dùng</dt>
                                <dd>
                                  {item.durationDays == null ? "—" : `${item.durationDays} ngày`}
                                </dd>
                              </div>
                              <div>
                                <dt>Số lượng</dt>
                                <dd>{item.quantity == null ? "—" : `${item.quantity} đơn vị`}</dd>
                              </div>
                            </dl>
                            {item.instructions && (
                              <p className={styles.preformatted}>
                                <strong>Hướng dẫn dùng: </strong>
                                {item.instructions}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>Bác sĩ không kê thuốc cho lượt khám này.</p>
                    )}
                  </section>
                </>
              ) : data.status !== "COMPLETED" ? (
                <Alert
                  type="info"
                  showIcon
                  title="Chưa có kết luận cuối và đơn thuốc"
                  description="Hồ sơ sẽ được cập nhật sau khi bác sĩ hoàn tất khám."
                />
              ) : null}
            </div>
            <aside className={styles.recordAside} aria-label="Thông tin theo dõi sau khám">
              {prescription && (
                <section
                  id={patientView ? "record-followup" : undefined}
                  className={`${styles.card} ${styles.followUp}`}
                >
                  <span className={styles.sideIcon}>
                    <PatientIcon name="calendar" />
                  </span>
                  <h2>Hẹn tái khám</h2>
                  <p className={styles.revisitDate}>
                    {prescription.revisitDate
                      ? formatDate(prescription.revisitDate)
                      : "Không hẹn tái khám"}
                  </p>
                  {prescription.revisitDate && (
                    <p className={styles.muted}>Ngày tái khám được bác sĩ ghi trong hồ sơ.</p>
                  )}
                </section>
              )}
              {!!data.steps?.length && (
                <section className={styles.card}>
                  <h2>Tiến trình cận lâm sàng & Tái khám</h2>
                  <ul className={styles.steps}>
                    {data.steps.map((step) => (
                      <li key={step.stepId}>
                        <span>
                          {step.isReExam ? "Tái khám" : step.department?.name || "Dịch vụ CLS"}
                          {step.department?.code ? ` · ${step.department.code}` : ""}
                        </span>
                        {!(data.status === "COMPLETED" && step.status === "COMPLETED") && (
                          <Tag color={step.status === "COMPLETED" ? "green" : "blue"}>
                            {{
                              COMPLETED: "Đã hoàn tất",
                              IN_PROGRESS: "Đang thực hiện",
                              SKIPPED: "Đã bỏ qua",
                            }[step.status] || "Đang chờ"}
                          </Tag>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
