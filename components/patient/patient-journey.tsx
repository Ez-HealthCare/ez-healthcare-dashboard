"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { VisitDossier } from "@/lib/types/doctor";
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
import { PatientIcon } from "./patient-icon";
import { PatientStartVisit } from "./patient-start-visit";
import { PatientReturnNotice } from "./patient-return-notice";
import styles from "./patient-journey.module.css";

type VisitFlowProps = {
  visit: CurrentVisit | null | undefined;
  loading: boolean;
  error?: string;
  requestStatus?: string;
  requestLoading?: boolean;
  requestError?: string;
  onRefresh: () => Promise<void>;
  patientName: string;
};

export function PatientVisitFlow(props: VisitFlowProps) {
  const dossier = useClinicalData(
    () => (props.visit ? clinicalActions.visitDossier(props.visit.visitId) : Promise.resolve(null)),
    8_000
  );
  const [selectedStep, setSelectedStep] = useState<string>();
  const [helpOpen, setHelpOpen] = useState(false);
  const data = dossier.data?.visitId === props.visit?.visitId ? dossier.data : undefined;
  const refresh = async () => {
    await Promise.all([props.onRefresh(), dossier.refresh()]);
  };
  return (
    <>
      <div className={styles.dashboardGrid}>
        <div className={styles.column}>
          <PatientVisitOverview
            {...props}
            onRefresh={refresh}
            dossier={dossier.error || props.error ? undefined : data}
          />
          {props.visit && (
            <section className={styles.information} aria-label="Thông tin lượt khám">
              <div className={styles.sectionHeading}>
                <h2>Thông tin lượt khám</h2>
                <PatientIcon name="records" />
              </div>
              <dl className={styles.informationList}>
                <div>
                  <dt>
                    <PatientIcon name="user" />
                    Người khám
                  </dt>
                  <dd>{props.patientName}</dd>
                </div>
                <div>
                  <dt>
                    <PatientIcon name="calendar" />
                    Ngày tiếp nhận
                  </dt>
                  <dd>
                    {data?.createdAt
                      ? formatDateTime(data.createdAt)
                      : props.visit.businessDate
                        ? formatDate(props.visit.businessDate)
                        : "Chưa có thông tin thời gian"}
                  </dd>
                </div>
              </dl>
              <Link className={styles.recordLink} href={patientRecordLink(props.visit.visitId)}>
                Xem hồ sơ lượt khám <PatientIcon name="arrow" />
              </Link>
            </section>
          )}
        </div>
        <div className={styles.column}>
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
          <section className={styles.support} aria-labelledby="patient-support-heading">
            <Image
              src="/patient/support-nurse.webp"
              alt=""
              width={360}
              height={356}
              sizes="(max-width: 640px) 145px, 130px"
              className={styles.nurse}
            />
            <div className={styles.supportContent}>
              <span className={styles.sectionIcon}>
                <PatientIcon name="support" />
              </span>
              <h2 id="patient-support-heading">Cần được hỗ trợ?</h2>
              <p>Nhân viên tại quầy có thể hỗ trợ bạn tìm phòng hoặc kiểm tra lượt khám.</p>
              <button
                type="button"
                className={styles.secondaryAction}
                aria-expanded={helpOpen}
                aria-controls="patient-support-details"
                onClick={() => setHelpOpen(!helpOpen)}
              >
                Xem điểm hỗ trợ <PatientIcon name="arrow" />
              </button>
              <p id="patient-support-details" hidden={!helpOpen}>
                Vui lòng liên hệ quầy tiếp nhận hoặc nhân viên hướng dẫn gần bạn. Chuẩn bị số tiếp
                nhận để được kiểm tra lượt khám.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function PatientVisitOverview({
  visit,
  loading,
  error,
  requestStatus,
  requestLoading,
  requestError,
  onRefresh,
  dossier,
}: {
  visit: CurrentVisit | null | undefined;
  loading: boolean;
  error?: string;
  requestStatus?: string;
  requestLoading?: boolean;
  requestError?: string;
  onRefresh: () => Promise<void>;
  dossier?: VisitDossier | null;
}) {
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState(false);
  if (loading)
    return (
      <section className={styles.overview} aria-label="Đang tải lượt khám">
        <Skeleton active />
      </section>
    );
  if (!visit)
    return (
      <PatientStartVisit
        error={error}
        requestStatus={requestStatus}
        requestLoading={requestLoading}
        requestError={requestError}
        onRefresh={onRefresh}
      />
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
          {visit.status === "HALL_WAITING" &&
            visit.ticketStatus === "ACTIVE" &&
            visit.receptionEta && <p>{formatReceptionEta(visit.receptionEta)}</p>}
          {visit.stageEta?.status === "travelling" && (
            <>
              <Button
                loading={confirmingArrival}
                onClick={async () => {
                  if (!visit.stageEta) return;
                  setConfirmingArrival(true);
                  setArrivalError(false);
                  try {
                    await clinicalActions.confirmStageArrival(
                      visit.visitId,
                      visit.stageEta.station,
                      visit.clinicTicketNumber
                    );
                    await onRefresh();
                  } catch {
                    setArrivalError(true);
                  } finally {
                    setConfirmingArrival(false);
                  }
                }}
              >
                {visit.stageEta.station === "triage"
                  ? "Tôi đã đến khu sàng lọc"
                  : "Tôi đã đến phòng khám"}
              </Button>
              {arrivalError && <p role="alert">Chưa xác nhận được. Vui lòng thử lại.</p>}
            </>
          )}
          {visit.stageEta?.status === "waiting" && (
            <p>
              {formatReceptionEta(
                visit.stageEta,
                visit.stageEta.station === "triage" ? "sàng lọc" : "khám"
              )}
            </p>
          )}
          {visit.stageEta?.status === "in-service" && <p>Đang sàng lọc</p>}
          <PatientReturnNotice
            key={visit.visitId + "-" + (visit.returnReportedAt || visit.status)}
            visit={visit}
            onRefresh={onRefresh}
          />
          <div className={styles.actionRow}>
            {final ? (
              <Link className={styles.primaryAction} href={patientRecordLink(visit.visitId)}>
                {visit.status === "COMPLETED"
                  ? "Xem kết luận & Đơn thuốc"
                  : final
                    ? "Xem hồ sơ lượt khám"
                    : "Xem lượt khám"}
                <PatientIcon name="arrow" />
              </Link>
            ) : (
              <button
                type="button"
                className={styles.primaryAction}
                aria-expanded={directionsOpen}
                aria-controls="patient-room-directions"
                onClick={() => setDirectionsOpen(!directionsOpen)}
              >
                <PatientIcon name="pin" />
                {next.destination ? "Xem hướng dẫn đến phòng" : "Xem hướng dẫn tiếp theo"}
                <PatientIcon name="arrow" />
              </button>
            )}
          </div>
          {!final && (
            <div
              className={styles.directions}
              id="patient-room-directions"
              hidden={!directionsOpen}
            >
              <strong>
                {next.destination
                  ? `${next.destination.code} · ${next.destination.name}`
                  : next.destinationLabel}
              </strong>
              <p>
                {next.destination?.floor != null ? `Tầng ${next.destination.floor}. ` : ""}
                {next.description}
              </p>
            </div>
          )}
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
          <h3>Các bước khám tại viện</h3>
          <ol className={styles.arrivalSteps}>
            <li>Đến cơ sở y tế và lấy số tiếp nhận</li>
            <li>Lễ tân đối chiếu thông tin khi gọi số</li>
            <li>Điều dưỡng sàng lọc và phân phòng</li>
            <li>Bác sĩ thăm khám</li>
          </ol>
          <p>Hành trình thực tế sẽ được cập nhật khi bạn có số tiếp nhận.</p>
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
  const receptionDone =
    !!data?.isVerified ||
    [
      "RECEPTION_VERIFIED",
      "TRIAGE_PENDING",
      "CLINIC_WAITING",
      "CLINIC_CALLED",
      "TEMPORARILY_ABSENT",
      "IN_EXAMINATION",
      "PARACLINICAL_PENDING",
      "RE_EXAM_CALLING",
      "COMPLETED",
    ].includes(visit.status);
  const milestones = [
    { title: "Tiếp nhận", done: receptionDone, active: visit.status === "HALL_WAITING" },
    {
      title: "Sàng lọc điều dưỡng",
      done: visit.intakeCompleted,
      active: ["RECEPTION_VERIFIED", "TRIAGE_PENDING"].includes(visit.status),
    },
    {
      title: "Khám bác sĩ",
      done: visit.status === "COMPLETED",
      active: [
        "CLINIC_WAITING",
        "CLINIC_CALLED",
        "TEMPORARILY_ABSENT",
        "IN_EXAMINATION",
        "PARACLINICAL_PENDING",
        "RE_EXAM_CALLING",
      ].includes(visit.status),
    },
    { title: "Kết luận và hướng dẫn", done: visit.status === "COMPLETED", active: false },
  ];
  return (
    <>
      <ol className={styles.milestones} aria-label="Các giai đoạn lượt khám">
        {milestones.map((stage, index) => (
          <li
            key={stage.title}
            data-state={stage.done ? "done" : stage.active && !stopped ? "current" : "pending"}
          >
            <span className={styles.node} aria-hidden="true">
              {stage.done ? <PatientIcon name="check" /> : index + 1}
            </span>
            <div>
              <strong>{stage.title}</strong>
              <p>
                {stage.done
                  ? "Đã hoàn tất"
                  : stage.active && !stopped
                    ? "Đang thực hiện"
                    : "Chưa đến bước này"}
              </p>
            </div>
          </li>
        ))}
      </ol>
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
            <h3>Chỉ định trong lượt khám</h3>
            <span>
              {complete}/{steps.length} đã hoàn tất
            </span>
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
                        ? `Phòng ${step.department.code}`
                        : "Chưa có thông tin phòng"}
                    </p>
                    {step.department?.floor != null && (
                      <span className={styles.floor}>Tầng {step.department.floor}</span>
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

function formatReceptionEta(eta: NonNullable<CurrentVisit["receptionEta"]>, service = "xác minh") {
  if (!eta.estimatedStartAt) return "Đang cập nhật thời gian chờ";
  const startsAt = new Date(eta.estimatedStartAt);
  const minutes = Math.ceil((startsAt.getTime() - Date.parse(eta.calculatedAt)) / 60_000);
  if (minutes <= 0) return "Sắp đến lượt " + service;
  const clock = startsAt.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return "Khoảng " + minutes + " phút đến lượt " + service + " · Dự kiến " + clock;
}
