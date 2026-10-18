"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Empty, Modal, Popover } from "antd";
import { LogoutButton } from "@/components/auth/auth-gate";
import { useIdentity } from "@/hooks/use-auth-session";
import styles from "./patient-dashboard.module.css";
import { WorkspaceAccessDenied } from "@/components/auth/workspace-state";

import { PATIENT_NAVIGATION, ROUTES } from "@/lib/constants/routes";
import { PATIENT_ICON_PATHS } from "@/lib/constants/patient";

function Icon({ name }: { name: keyof typeof PATIENT_ICON_PATHS }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={PATIENT_ICON_PATHS[name]}
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionTitle({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof PATIENT_ICON_PATHS;
  title: string;
  detail?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2>
        <span className={styles.iconTile}>
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {detail && <span className={styles.smallBadge}>{detail}</span>}
    </div>
  );
}

export function PatientDashboard({ tab }: { tab: string }) {
  const user = useIdentity();
  const router = useRouter();
  const [dialog, setDialog] = useState("");
  const [allRead, setAllRead] = useState(false);
  const name = user.name || user.email;
  if (user.role !== "PATIENT") return <WorkspaceAccessDenied />;

  const preview = (title: string) => setDialog(title);
  return (
    <div className={styles.page}>
      <a href="#patient-content" className={styles.skipLink}>
        Bỏ qua điều hướng
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href={ROUTES.PATIENT}
            className={styles.brand}
            aria-label="MediRoute — Trang chủ bệnh nhân"
          >
            <span className={styles.logo}>
              <Image src="/login/brand-mark.svg" alt="" width={18} height={18} />
            </span>
            <span>
              MediRoute<small>EMR PORTAL</small>
            </span>
          </Link>
          <nav className={styles.navigation} aria-label="Điều hướng bệnh nhân">
            {PATIENT_NAVIGATION.map(([key, label]) => (
              <Link
                key={key}
                href={ROUTES.PATIENT + (key ? "/" + key : "")}
                aria-current={tab === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <button
              className={styles.bell}
              aria-label={allRead ? "Xem thông báo" : "Xem thông báo chưa đọc"}
              onClick={() => router.push(ROUTES.PATIENT + "#notifications")}
            >
              <Icon name="bell" />
              {!allRead && <span />}
            </button>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div className={styles.account}>
                  <strong>{name}</strong>
                  <p>{user.email}</p>
                  <p data-testid="identity-role">Bệnh nhân</p>
                  <LogoutButton />
                </div>
              }
            >
              <button className={styles.profile} aria-label="Tài khoản bệnh nhân">
                <span className={styles.profileText}>
                  <strong>{name}</strong>
                  <small>Bệnh nhân · Tài khoản cá nhân</small>
                </span>
                <span className={styles.avatar}>
                  <Icon name="user" />
                </span>
              </button>
            </Popover>
          </div>
        </div>
      </header>

      <main id="patient-content" className={styles.main}>
        <div className={styles.welcome}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.activeBadge}>● Cổng bệnh nhân hoạt động</span>
              <span>Bản xem trước · Dữ liệu khám minh họa</span>
            </div>
            <h1>Chào buổi sáng, {name}</h1>
            <p className={styles.muted}>
              <Icon name="calendar" />
              Chúc bạn một ngày nhiều năng lượng và sức khỏe tốt.
            </p>
          </div>
          <div className={styles.insurance}>
            <span className={styles.iconTile}>
              <Icon name="shield" />
            </span>
            <div>
              <small>BHYT Điện Tử · Mẫu</small>
              <strong>DN 4 01 24 88204</strong>
            </div>
            <span className={styles.smallBadge}>Hợp lệ</span>
          </div>
        </div>

        {tab !== "" ? (
          <section className={styles.placeholder}>
            <SectionTitle
              icon={tab === "visits" ? "calendar" : "records"}
              title={tab === "visits" ? "Lượt khám của tôi" : "Hồ sơ khám bệnh"}
            />
            <Empty description="Trang đang được chuẩn bị — chưa kết nối dữ liệu khám bệnh." />
            <p>
              Đợt này chỉ hoàn thiện giao diện và điều hướng. Không có dữ liệu bệnh án thật trên
              trang này.
            </p>
            <Link href={ROUTES.PATIENT}>
              Quay lại trang chủ <Icon name="arrow" />
            </Link>
          </section>
        ) : (
          <>
            <section className={styles.visit} aria-labelledby="current-visit-title">
              <div className={styles.visitBody}>
                <div className={styles.visitBadges}>
                  <span className={styles.visitBadge}>
                    <Icon name="calendar" />
                    Lượt khám hôm nay
                  </span>
                  <span className={styles.pendingBadge}>● Chưa lấy số tiếp nhận</span>
                  <span className={styles.muted}>| &nbsp; Đã đặt qua MediRoute Web</span>
                </div>
                <h2 id="current-visit-title">Khám Hô hấp &amp; Nội tổng quát</h2>
                <div className={styles.visitDetails}>
                  <div>
                    <Icon name="clock" />
                    <p>
                      <small>Thời gian khám</small>
                      <strong>
                        08:00 hôm nay <span className={styles.muted}>(Dự kiến)</span>
                      </strong>
                    </p>
                  </div>
                  <div>
                    <Icon name="pin" />
                    <p>
                      <small>Địa điểm lâm sàng</small>
                      <strong>Phòng khám 304 · Tầng 3 Khu B</strong>
                      <small>Khoa Khám Bệnh Đa Khoa</small>
                    </p>
                  </div>
                </div>
                <div className={styles.notice}>
                  <Icon name="info" />
                  <p>
                    Vui lòng lấy số tiếp nhận điện tử khi bạn có mặt tại bệnh viện hoặc trong bán
                    kính <strong>500m</strong> để hệ thống tự động xếp lượt vào hàng đợi phòng khám.
                  </p>
                </div>
              </div>
              <aside className={styles.queue} aria-label="Hàng đợi minh họa">
                <div className={styles.queueLabel}>
                  <span>HÀNG ĐỢI HIỆN TẠI</span>
                  <span>● Minh họa</span>
                </div>
                <div className={styles.queueNumber}>
                  <span>Đang phục vụ số:</span>
                  <strong>#038</strong>
                </div>
                <Button
                  type="primary"
                  block
                  icon={<Icon name="ticket" />}
                  onClick={() => preview("Lấy số tiếp nhận")}
                >
                  Lấy số tiếp nhận
                </Button>
                <Button
                  block
                  icon={<Icon name="calendar" />}
                  onClick={() => router.push(ROUTES.PATIENT + "/visits")}
                >
                  Xem lịch hẹn
                </Button>
              </aside>
            </section>

            <div className={styles.cardGrid}>
              <section className={styles.card}>
                <SectionTitle icon="list" title="Việc cần làm" detail="3 bước đơn giản" />
                <p className={styles.intro}>
                  Chuẩn bị kỹ giúp bạn giảm thời gian chờ trung bình 25 phút.
                </p>
                <ol className={styles.steps}>
                  <li className={styles.currentStep}>
                    <span>1</span>
                    <div>
                      <strong>Lấy số tiếp nhận</strong>
                      <small>Thực hiện khi đến sảnh Khu B.</small>
                    </div>
                    <em>BƯỚC HIỆN TẠI</em>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Khai triệu chứng trước khám</strong>
                      <small>Khuyến nghị hoàn thành trước 08:00 để bác sĩ xem trước.</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Đến quầy lễ tân</strong>
                      <small>Xác nhận thông tin BHYT/Bảo lãnh viện phí (nếu có).</small>
                    </div>
                  </li>
                </ol>
                <button
                  className={styles.cardLink}
                  onClick={() => preview("Khai triệu chứng trước khám")}
                >
                  Bắt đầu khai triệu chứng <Icon name="arrow" />
                </button>
              </section>

              <section className={styles.card}>
                <SectionTitle icon="calendar" title="Lịch hẹn sắp tới" detail="1 lịch hẹn" />
                <div className={styles.inset}>
                  <div className={styles.metaRow}>
                    <span className={styles.confirmed}>◉ Đã xác nhận hẹn</span>
                    <span>RHM-409</span>
                  </div>
                  <h3>Tái khám Chuyên khoa Răng Hàm Mặt</h3>
                  <ul className={styles.detailsList}>
                    <li>
                      <Icon name="calendar" />
                      14:30 · Thứ Tư, 02/11/2024
                    </li>
                    <li>
                      <Icon name="user" />
                      BS. CKI Trần Hoàng Nam · Phòng 108
                    </li>
                    <li>
                      <Icon name="building" />
                      Khu C · Trung tâm Kỹ thuật cao
                    </li>
                  </ul>
                  <div className={styles.sync}>
                    <span>Hồ sơ đã đồng bộ 100%</span>
                    <svg width="68" height="20" viewBox="0 0 68 20" fill="none" aria-hidden="true">
                      <path d="m2 14 17-4 14 2 18-7 15 2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
                <Link className={styles.cardLink} href={ROUTES.PATIENT + "/visits"}>
                  Chi tiết &amp; Đổi lịch <Icon name="calendar" />
                </Link>
              </section>

              <section className={styles.card}>
                <SectionTitle icon="records" title="Hồ sơ gần đây" detail="Lần khám trước" />
                <div className={styles.inset}>
                  <div className={styles.metaRow}>
                    <span>◷ 15/09/2024</span>
                    <span className={styles.neutralBadge}>Hoàn thành</span>
                  </div>
                  <h3>Khám Tổng quát &amp; Xét nghiệm định kỳ</h3>
                  <p>
                    Đã có đầy đủ kết quả xét nghiệm máu, X-quang và đơn thuốc điện tử. Bác sĩ kết
                    luận thể trạng ổn định.
                  </p>
                  <div className={styles.recordTags}>
                    <span>
                      <Icon name="lab" />
                      Huyết học (8 chỉ số)
                    </span>
                    <span>
                      <Icon name="records" />
                      X-quang lồng ngực
                    </span>
                    <span>
                      <Icon name="records" />
                      Đơn 2 loại thuốc
                    </span>
                  </div>
                  <div className={styles.signature}>
                    <Icon name="shield" />
                    Ký số bởi BS. CKI Vũ Thu Hương
                  </div>
                </div>
                <Link className={styles.cardLink} href={ROUTES.PATIENT + "/records"}>
                  Xem hồ sơ y bạ <Icon name="chevron" />
                </Link>
              </section>
            </div>

            <div className={styles.bottomGrid}>
              <section className={styles.card} id="notifications">
                <div className={styles.sectionHeading}>
                  <h2>
                    <span className={styles.iconTile}>
                      <Icon name="bell" />
                    </span>
                    Thông báo {!allRead && <span className={styles.unreadDot} />}
                  </h2>
                  <button className={styles.textButton} onClick={() => setAllRead(true)}>
                    {allRead ? "Đã đọc tất cả" : "Đánh dấu đã đọc tất cả"}
                  </button>
                </div>
                <div className={styles.notifications} aria-live="polite">
                  <article className={styles.notification}>
                    <span className={styles.notificationIcon}>
                      <Icon name="lab" />
                    </span>
                    <div>
                      <div className={styles.metaRow}>
                        <span className={styles.neutralBadge}>Xét nghiệm</span>
                        <span>2 giờ trước</span>
                      </div>
                      <p>
                        Kết quả xét nghiệm máu mẫu (Mã XN-9941) từ lượt khám trước đã được cập nhật
                        vào hồ sơ y bạ điện tử.
                      </p>
                      <button
                        className={styles.textButton}
                        onClick={() => preview("Kết quả xét nghiệm PDF")}
                      >
                        Mở kết quả PDF <Icon name="records" />
                      </button>
                    </div>
                  </article>
                  <article className={styles.notification}>
                    <span className={styles.notificationIconBlue}>
                      <Icon name="records" />
                    </span>
                    <div>
                      <div className={styles.metaRow}>
                        <span className={styles.neutralBadge}>Hướng dẫn</span>
                        <span>Hôm qua</span>
                      </div>
                      <p>
                        Nhắc nhớ: Mang theo Căn cước công dân gắn chip hoặc thẻ BHYT vật lý/VNeID
                        khi đến phòng khám để quét mã QR tự động.
                      </p>
                    </div>
                  </article>
                </div>
              </section>
              <section className={styles.card}>
                <SectionTitle
                  icon="support"
                  title="Cần hỗ trợ?"
                  detail="● Tổng đài 24/7 trực tuyến"
                />
                <div className={styles.supportGrid}>
                  <div className={styles.supportPanel}>
                    <small>HOTLINE CẤP BÁCH &amp; TƯ VẤN</small>
                    <strong className={styles.hotline}>1900 8080</strong>
                    <p>Miễn phí cước gọi từ mọi mạng viễn thông.</p>
                    <Button
                      block
                      icon={<Icon name="phone" />}
                      onClick={() => preview("Liên hệ tổng đài viên")}
                    >
                      Liên hệ tổng đài viên
                    </Button>
                  </div>
                  <div className={styles.supportPanel}>
                    <small>CHỈ ĐƯỜNG BỆNH VIỆN</small>
                    <strong>Sơ đồ Tầng 3 Khu B</strong>
                    <p>Tiếp cận nhanh qua thang máy E2, quầy tiếp nhận tự động Kiosk 1–4.</p>
                    <Button
                      block
                      icon={<Icon name="map" />}
                      onClick={() => preview("Sơ đồ bệnh viện")}
                    >
                      Xem sơ đồ bệnh viện
                    </Button>
                  </div>
                </div>
                <div className={styles.supportFooter}>
                  <span>Trung tâm Trợ giúp Bệnh nhân MediRoute Care</span>
                  <button
                    className={styles.textButton}
                    onClick={() => preview("Câu hỏi thường gặp")}
                  >
                    Câu hỏi thường gặp ↗
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <span>
          © 2026 MediRoute EMR. Hệ thống quản lý hồ sơ bệnh án cá nhân tích hợp đề xuất lộ trình
          khám tối ưu
        </span>
        <div>
          <span>Hỗ trợ kỹ thuật: 1900 6868</span>
          <button onClick={() => preview("Chính sách bảo mật y tế")}>
            Chính sách bảo mật y tế
          </button>
          <button onClick={() => preview("Tiêu chuẩn Bộ Y Tế")}>Tiêu chuẩn Bộ Y Tế</button>
        </div>
      </footer>
      <Modal
        title={dialog}
        open={!!dialog}
        onCancel={() => setDialog("")}
        footer={
          <Button type="primary" onClick={() => setDialog("")}>
            Đã hiểu
          </Button>
        }
      >
        <p>
          Đây là bản xem trước giao diện. Chức năng này chưa kết nối API và chưa thực hiện thao tác
          nghiệp vụ.
        </p>
        <p className={styles.modalNote}>
          Dữ liệu lịch hẹn, hàng đợi, BHYT và hồ sơ đang hiển thị chỉ là dữ liệu minh họa từ thiết
          kế, không phải thông tin khám bệnh của bạn.
        </p>
      </Modal>
    </div>
  );
}
