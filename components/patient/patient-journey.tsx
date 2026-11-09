"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { VisitDossier } from "@/lib/types/doctor";
import { useRouter } from "next/navigation";
import { Alert, Button, Skeleton } from "antd";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import type { CurrentVisit } from "@/lib/types/clinical";
import { formatDate, formatDateTime } from "@/lib/display-format";
import { isFinalVisit, patientRecordLink } from "@/lib/visit-status";
import {
  patientJourneyFocus,
  patientJourneyStepState,
  patientVisitStatus,
  patientStepDescription,
} from "@/lib/patient-journey";
import { ROUTES } from "@/lib/constants/routes";
import { PatientIcon } from "./patient-icon";
import { PatientReturnNotice } from "./patient-return-notice";
import styles from "./patient-journey.module.css";

type VisitFlowProps = {
  visit: CurrentVisit | null | undefined;
  loading: boolean;
  error?: string;
  requestStatus?: string;
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export function PatientVisitFlow({ children, ...props }: VisitFlowProps) {
  const dossier = useClinicalData(
    () => (props.visit ? clinicalActions.visitDossier(props.visit.visitId) : Promise.resolve(null)),
    8_000
  );
  const [selectedStep, setSelectedStep] = useState<string>();
  const data = dossier.data?.visitId === props.visit?.visitId ? dossier.data : undefined;
  const refresh = async () => {
    await Promise.all([props.onRefresh(), dossier.refresh()]);
  };
  return (
    <>
      <PatientVisitOverview
        {...props}
        onRefresh={refresh}
        dossier={dossier.error || props.error ? undefined : data}
        onSelectStep={setSelectedStep}
      />
      <div className={styles.journeyGrid}>
        <PatientJourney
          visit={props.visit}
          loading={props.loading}
          error={props.error}
          dossier={data}
          dossierLoading={dossier.loading}
          dossierError={dossier.error}
          onRefresh={dossier.refresh}
          selectedStep={selectedStep}
          onSelectStep={setSelectedStep}
        />
        {children}
      </div>
    </>
  );
}

export function PatientVisitOverview({
  visit,
  loading,
  error,
  requestStatus,
  onRefresh,
  dossier,
  onSelectStep,
}: {
  visit: CurrentVisit | null | undefined;
  loading: boolean;
  error?: string;
  requestStatus?: string;
  onRefresh: () => Promise<void>;
  dossier?: VisitDossier | null;
  onSelectStep: (id: string) => void;
}) {
  const router = useRouter();
  if (loading)
    return (
      <section className={styles.overview} aria-label="Đang tải lượt khám">
        <Skeleton active />
      </section>
    );
  if (!visit && error)
    return (
      <section className={`${styles.overview} ${styles.empty}`} aria-label="Lượt khám hiện tại">
        <h2>Chưa thể xác định lượt khám</h2>
        <p>Thử tải lại để kiểm tra lượt khám hiện tại trước khi tạo yêu cầu mới.</p>
        <Button onClick={() => void onRefresh()}>Thử lại</Button>
      </section>
    );
  if (!visit)
    return (
      <section className={`${styles.overview} ${styles.empty}`} aria-label="Lượt khám hiện tại">
        <span className={styles.label}>Bắt đầu hành trình khám</span>
        <h2>Bạn chưa có lượt khám hôm nay</h2>
        <p>Tạo yêu cầu tiếp nhận để được lễ tân kiểm tra và cấp số.</p>
        <Button type="primary" onClick={() => router.push(ROUTES.PATIENT_RECEPTION_REQUEST)}>
          {requestStatus === "DRAFT"
            ? "Tiếp tục khai triệu chứng"
            : requestStatus === "RECEPTION_PENDING"
              ? "Xem yêu cầu tiếp nhận"
              : "Tạo yêu cầu tiếp nhận"}
        </Button>
      </section>
    );
  const next = patientJourneyFocus(visit, dossier);
  const final = isFinalVisit(visit.status);
  return (
    <section className={styles.overview} aria-label="Lượt khám hiện tại" data-tone={next.tone}>
      <div className={styles.overviewHeader}>
        <span className={styles.label}>
          Lượt khám {visit.businessDate ? formatDate(visit.businessDate) : "hiện tại"}
        </span>
        <span className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {patientVisitStatus(visit)}
        </span>
      </div>
      <div className={styles.overviewGrid}>
        <div className={styles.nextAction}>
          <span className={styles.kicker}>
            {final ? "Thông tin lượt khám" : "Việc cần làm lúc này"}
          </span>
          <h2>{next.title}</h2>
          <p>{next.description}</p>
          <PatientReturnNotice
            key={visit.visitId + "-" + (visit.returnReportedAt || visit.status)}
            visit={visit}
            onRefresh={onRefresh}
          />
          <div className={styles.actionRow}>
            <Link className={styles.primaryAction} href={patientRecordLink(visit.visitId)}>
              {visit.status === "COMPLETED"
                ? "Xem kết luận & Đơn thuốc"
                : final
                  ? "Xem hồ sơ lượt khám"
                  : "Xem lượt khám"}
              <PatientIcon name="arrow" />
            </Link>
            {!final && (
              <a
                className={styles.secondaryAction}
                href="#patient-journey"
                onClick={() => {
                  if (next.stepId) onSelectStep(next.stepId);
                }}
              >
                {next.stepId ? "Xem bước cần theo dõi" : "Xem hành trình"}{" "}
                <PatientIcon name="list" />
              </a>
            )}
          </div>
        </div>
        <div className={styles.visitFacts}>
          <div className={styles.ticket}>
            <span>
              <PatientIcon name="ticket" />
              {visit.clinicTicketNumber ? "Số khám của bạn" : "Số tiếp nhận của bạn"}
            </span>
            <strong>{visit.clinicTicketNumber || visit.hallTicketNumber}</strong>
            {visit.clinicTicketNumber && <small>Số tiếp nhận: {visit.hallTicketNumber}</small>}
          </div>
          <div className={styles.destination}>
            <PatientIcon name="pin" />
            <div>
              <span>{next.destinationLabel}</span>
              <strong>
                {next.destination
                  ? `${next.destination.code} · ${next.destination.name}`
                  : "Chưa có thông tin phòng"}
              </strong>
              {next.destination?.floor != null && <small>Tầng {next.destination.floor}</small>}
              {!next.destination && <small>Nhân viên y tế sẽ hướng dẫn bạn.</small>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type JourneyProps = {
  visit: CurrentVisit | null | undefined;
  loading?: boolean;
  error?: string;
  dossier?: VisitDossier | null;
  dossierLoading: boolean;
  dossierError?: string;
  onRefresh: () => Promise<void>;
  selectedStep?: string;
  onSelectStep: (id: string | undefined) => void;
};

function PatientJourney(props: JourneyProps) {
  const { visit, loading, error } = props;
  return (
    <section
      className={styles.journey}
      id="patient-journey"
      aria-label="Hành trình khám của bạn"
      tabIndex={-1}
    >
      <div className={styles.sectionHeading}>
        <span className={styles.sectionIcon}>
          <PatientIcon name="list" />
        </span>
        <div>
          <h2>Hành trình khám của bạn</h2>
          <p>Các bước thực hiện và phòng khám liên quan.</p>
        </div>
      </div>
      {loading ? (
        <Skeleton active />
      ) : error && !visit ? (
        <div className={styles.journeyEmpty}>
          <PatientIcon name="info" />
          <h3>Chưa thể tải hành trình</h3>
          <p>Thử tải lại lượt khám ở phía trên để xem hành trình của bạn.</p>
        </div>
      ) : visit ? (
        <VisitSteps {...props} visit={visit} />
      ) : (
        <div className={styles.journeyEmpty}>
          <PatientIcon name="map" />
          <h3>Hành trình sẽ xuất hiện khi có lượt khám</h3>
          <p>Sau tiếp nhận, theo dõi hướng dẫn và các bước được chỉ định tại đây.</p>
        </div>
      )}
    </section>
  );
}

function VisitSteps({
  visit,
  dossier: data,
  dossierLoading,
  dossierError,
  onRefresh,
  selectedStep,
  onSelectStep,
  error,
}: JourneyProps & { visit: CurrentVisit }) {
  const current = !error && !dossierError && data?.status === visit.status;
  const focus = patientJourneyFocus(visit, current ? data : undefined);
  const steps = [...(data?.steps || [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const complete = steps.filter((step) => step.status === "COMPLETED").length;
  const stopped =
    (visit.ticketStatus === "EXPIRED" && !isFinalVisit(visit.status)) ||
    ["CANCELLED", "EMERGENCY_DISPATCHED"].includes(visit.status);
  return (
    <>
      <div className={styles.currentStage}>
        <PatientIcon name="info" />
        <div>
          <span>Trạng thái lượt khám</span>
          <strong>Hiện tại: {patientVisitStatus(visit)}</strong>
        </div>
      </div>
      {dossierError && (
        <Alert
          type="warning"
          showIcon
          title="Chưa tải được hành trình"
          description="Thông tin các bước có thể chưa được cập nhật."
          action={<Button onClick={() => void onRefresh()}>Thử lại</Button>}
        />
      )}
      {data && !current && !dossierError && !error && (
        <Alert
          type="info"
          showIcon
          title="Đang đồng bộ hành trình"
          description="Trạng thái lượt khám vừa thay đổi. Chờ cập nhật các bước trước khi di chuyển."
        />
      )}
      {dossierLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : steps.length ? (
        <>
          <div className={styles.progressSummary}>
            <strong>
              {complete}/{steps.length} bước chỉ định đã hoàn thành
            </strong>
            <span>Kế hoạch có thể được cập nhật</span>
          </div>
          <ol className={styles.timeline}>
            {steps.map((step, index) => {
              const state = patientJourneyStepState(step, visit, current);
              return (
                <li
                  key={step.stepId}
                  data-state={state.tone}
                  data-focus={(current && !stopped && step.stepId === focus.stepId) || undefined}
                  aria-current={
                    current &&
                    !stopped &&
                    step.stepId === focus.stepId &&
                    step.status === "IN_PROGRESS"
                      ? "step"
                      : undefined
                  }
                >
                  <span className={styles.node} aria-hidden="true">
                    {state.tone === "done" ? <PatientIcon name="check" /> : index + 1}
                  </span>
                  <div className={styles.stepBody}>
                    <div className={styles.stepHeading}>
                      <h3>
                        <button
                          type="button"
                          className={styles.stepToggle}
                          aria-expanded={selectedStep === step.stepId}
                          aria-controls={`journey-step-${step.stepId}`}
                          onClick={() =>
                            onSelectStep(selectedStep === step.stepId ? undefined : step.stepId)
                          }
                        >
                          {step.isReExam
                            ? "Quay lại bác sĩ · Tái khám"
                            : step.department?.name || "Dịch vụ cận lâm sàng"}
                          <PatientIcon name="chevron" />
                        </button>
                      </h3>
                      <span className={styles.stepStatus}>{state.label}</span>
                    </div>
                    <p>
                      <PatientIcon name="building" />
                      {step.department
                        ? `${step.department.code} · ${step.department.name}`
                        : "Chưa có thông tin phòng"}
                    </p>
                    {step.department?.floor != null && (
                      <span className={styles.floor}>Tầng {step.department.floor}</span>
                    )}
                    {current && !stopped && step.stepId === focus.stepId && (
                      <span className={styles.focusLabel}>Bước cần theo dõi</span>
                    )}
                    <div
                      className={styles.stepDetail}
                      id={`journey-step-${step.stepId}`}
                      hidden={selectedStep !== step.stepId}
                    >
                      <strong>Hướng dẫn cho bước này</strong>
                      <p>{patientStepDescription(step, visit, current)}</p>
                      {step.isReExam && (
                        <p className={styles.returnHint}>
                          Đây là bước quay lại bác sĩ trong cùng lượt khám, khác với lịch hẹn tái
                          khám vào ngày khác.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className={styles.footnote}>
            {stopped
              ? "Lượt khám đã dừng hoặc hết hiệu lực. Liên hệ nhân viên y tế để được hướng dẫn."
              : "Thứ tự thực hiện theo hướng dẫn của nhân viên y tế. Một phòng có thể xuất hiện ở nhiều bước."}
          </p>
        </>
      ) : !dossierError ? (
        <div className={styles.journeyEmpty}>
          <PatientIcon name="list" />
          <h3>Chưa có bước chỉ định trong hồ sơ</h3>
          <p>
            {isFinalVisit(visit.status)
              ? "Bạn có thể xem thông tin đã lưu trong hồ sơ lượt khám."
              : "Tiếp tục làm theo hướng dẫn phía trên. Khi có chỉ định, các bước sẽ xuất hiện tại đây."}
          </p>
        </div>
      ) : null}
      {data?.updatedAt && (
        <p className={styles.updatedAt}>
          <PatientIcon name="clock" /> Hồ sơ cập nhật:{" "}
          <time dateTime={data.updatedAt}>{formatDateTime(data.updatedAt)}</time>
        </p>
      )}
    </>
  );
}
