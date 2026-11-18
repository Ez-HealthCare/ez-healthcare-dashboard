"use client";

import {
  OTP_LENGTH,
  OTP_PATTERN,
  OTP_LIFETIME_MINUTES,
  STAFF_PASSWORD_MIN_LENGTH,
} from "@/lib/constants/auth";

import { useState } from "react";
import Image from "next/image";
import { Alert, Form, Input, Button, Checkbox } from "antd";
import { useLogin, type LoginFormValues } from "@/hooks/use-login";
import styles from "./login.module.css";

export default function LoginPage() {
  const [forgotInfo, setForgotInfo] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const {
    loading,
    view,
    otpEmail,
    error,
    successMessage,
    secondsLeft,
    submit,
    resendOtp: resend,
    resetOtp,
    goToRegister,
    goToLogin,
  } = useLogin();

  const resendOtp = async () => {
    if (await resend()) form.resetFields(["otpCode"]);
  };

  const handleToggleForgot = () => {
    setForgotInfo((prev) => !prev);
  };

  return (
    <div className={styles.loginPage}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.headerLogoBox}>
            <Image
              src="/login/brand-mark.svg"
              alt="MediRoute Logo"
              width={20}
              height={20}
              priority
            />
          </div>
          <div className={styles.headerBrandText}>
            <span className={styles.headerTitle}>MediRoute</span>
            <span className={styles.headerSubtitle}>EMR PORTAL</span>
          </div>
        </div>

        <div className={styles.langSelector} aria-label="Ngôn ngữ hiển thị">
          <Image src="/login/language.svg" alt="" width={15} height={15} aria-hidden />
          <span className={styles.langActive}>VI</span>
          <span className={styles.langDivider}>|</span>
          <span>EN</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.mainContainer}>
        <div className={styles.cardWrapper}>
          {/* Left Decorative Journey & Benefits Panel */}
          <section className={styles.leftPanel} aria-label="Thông tin hành trình khám bệnh">
            <Image
              src="/login/route-lines.svg"
              alt=""
              width={690}
              height={775}
              className={styles.routeLines}
              priority
              aria-hidden
            />

            <div className={styles.leftPanelContent}>
              <div className={styles.leftBadgeRow}>
                <div className={styles.routeMarkBox}>
                  <Image src="/login/route-mark.svg" alt="" width={16} height={16} aria-hidden />
                </div>
                <span className={styles.brandNameLeft}>MediRoute</span>
                <span className={styles.emrBadge}>EMR</span>
              </div>

              <h2 className={styles.leftHeading}>Chủ động hành trình khám của bạn.</h2>
              <p className={styles.leftSubheading}>
                Theo dõi lượt khám, số thứ tự và hồ sơ sức khỏe trong một nơi tập trung và minh
                bạch.
              </p>

              <div className={styles.stepsList}>
                {/* Step 1 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepIconBox}>
                    <Image src="/login/ticket.svg" alt="" width={16} height={13} aria-hidden />
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepTitle}>Lấy số tiếp nhận</span>
                      <span className={styles.stepBadge}>Bước 01</span>
                    </div>
                    <p className={styles.stepDesc}>
                      Đăng ký trước và lấy số thứ tự trực tuyến không cần xếp hàng chờ đợi tại sảnh
                      trung tâm.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepIconBox}>
                    <Image
                      src="/login/queue.svg"
                      alt=""
                      width={17}
                      height={9}
                      style={{ height: "auto" }}
                      aria-hidden
                    />
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepTitle}>Theo dõi hàng đợi</span>
                      <span className={styles.stepBadge}>Bước 02</span>
                    </div>
                    <p className={styles.stepDesc}>
                      Cập nhật thời gian thực số ca đang khám tại từng phòng, nhận cảnh báo chuẩn bị
                      vào khám.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={styles.stepCard}>
                  <div className={styles.stepIconBox}>
                    <Image src="/login/records.svg" alt="" width={13} height={16} aria-hidden />
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepTitle}>Xem hồ sơ bệnh án</span>
                      <span className={styles.stepBadge}>Bước 03</span>
                    </div>
                    <p className={styles.stepDesc}>
                      Lưu trữ kết quả xét nghiệm, chẩn đoán hình ảnh và đơn thuốc điện tử an toàn
                      tuyệt đối.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.securityBadge}>
              <Image src="/login/privacy.svg" alt="" width={17} height={16} aria-hidden />
              <span>Được bảo mật theo tiêu chuẩn Y tế Quốc gia &amp; HIPAA</span>
            </div>
          </section>

          {/* Right Login / Register Card Panel */}
          <section
            className={styles.rightPanel}
            aria-label={
              view === "register"
                ? "Đăng ký tài khoản"
                : view === "verify-otp"
                  ? "Xác thực OTP"
                  : "Đăng nhập tài khoản"
            }
          >
            <div className={styles.loginCard}>
              <h1 className={styles.loginCardTitle}>
                {view === "register"
                  ? "Đăng ký tài khoản"
                  : view === "verify-otp"
                    ? "Xác thực tài khoản"
                    : "Chào mừng trở lại"}
              </h1>
              <p className={styles.loginCardSubtitle}>
                {view === "register"
                  ? "Tạo tài khoản bệnh nhân để theo dõi hành trình khám và hồ sơ."
                  : view === "verify-otp"
                    ? "Nhập mã xác thực gồm 6 chữ số gửi tới email để kích hoạt."
                    : "Đăng nhập để tiếp tục hành trình khám của bạn."}
              </p>

              {error && (
                <Alert
                  className={styles.feedback}
                  title={error}
                  type="error"
                  showIcon
                  role="alert"
                />
              )}
              {successMessage && (
                <Alert className={styles.feedback} type="success" showIcon title={successMessage} />
              )}
              {view === "verify-otp" && otpEmail && (
                <Alert
                  className={styles.feedback}
                  type="info"
                  showIcon
                  title="Mã OTP đã được gửi"
                  description={`Kiểm tra hộp thư ${otpEmail}. Mã có hiệu lực ${OTP_LIFETIME_MINUTES} phút.`}
                />
              )}

              <Form<LoginFormValues>
                form={form}
                layout="vertical"
                scrollToFirstError={{ focus: true }}
                onFinish={submit}
                requiredMark={false}
                initialValues={{ remember: false }}
              >
                {view === "login" && (
                  <>
                    <div className={styles.labelRow}>
                      <label htmlFor="login_email" className={styles.fieldLabel}>
                        Email
                      </label>
                    </div>
                    <Form.Item
                      name="email"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập email." },
                        {
                          type: "email",
                          message: "Email chưa đúng định dạng.",
                          transform: (value) => value?.trim(),
                        },
                      ]}
                    >
                      <Input
                        id="login_email"
                        type="email"
                        autoComplete="username"
                        prefix={
                          <Image
                            src="/login/patient-id.svg"
                            alt=""
                            width={16}
                            height={16}
                            aria-hidden
                          />
                        }
                        placeholder="email@example.com"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.labelRow}>
                      <label htmlFor="login_password" className={styles.fieldLabel}>
                        Mật khẩu
                      </label>
                    </div>
                    <Form.Item
                      name="password"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập mật khẩu." },
                        {
                          min: STAFF_PASSWORD_MIN_LENGTH,
                          message: `Mật khẩu cần ít nhất ${STAFF_PASSWORD_MIN_LENGTH} ký tự.`,
                        },
                      ]}
                    >
                      <Input.Password
                        id="login_password"
                        autoComplete="current-password"
                        prefix={
                          <Image
                            src="/login/lock.svg"
                            alt=""
                            width={14}
                            height={18}
                            style={{ height: "auto" }}
                            aria-hidden
                          />
                        }
                        placeholder="Nhập mật khẩu"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.checkboxRow}>
                      <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox disabled={loading} className={styles.checkboxLabel}>
                          Ghi nhớ đăng nhập
                        </Checkbox>
                      </Form.Item>
                      <button
                        type="button"
                        onClick={handleToggleForgot}
                        className={styles.forgotBtn}
                        aria-expanded={forgotInfo}
                      >
                        Quên mật khẩu?
                      </button>
                    </div>

                    {forgotInfo && (
                      <Alert
                        className={styles.feedback}
                        type="info"
                        showIcon
                        title="Hỗ trợ cấp lại mật khẩu"
                        description="Vui lòng liên hệ quản trị viên hoặc quầy tiếp đón để xác minh danh tính và cấp lại mật khẩu."
                      />
                    )}

                    <Form.Item className={styles.formItem}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        aria-label="Đăng nhập"
                        size="large"
                        loading={loading}
                        disabled={loading}
                        className={styles.submitBtn}
                      >
                        <span>Đăng nhập</span>
                        {!loading && (
                          <Image src="/login/arrow.svg" alt="" width={12} height={12} aria-hidden />
                        )}
                      </Button>
                    </Form.Item>

                    <div className={styles.registerGuidance}>
                      <p className={styles.registerGuidanceTitle}>Chưa có tài khoản bệnh nhân?</p>
                      <p className={styles.registerGuidanceDesc}>
                        Đăng ký để chủ động theo dõi lịch khám và hồ sơ bệnh án.
                      </p>
                      <div className={styles.registerGuidanceAction}>
                        <Button
                          type="link"
                          onClick={() => {
                            form.resetFields();
                            goToRegister();
                          }}
                          className={styles.linkBtn}
                        >
                          Đăng ký tài khoản ngay
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {view === "register" && (
                  <>
                    <div className={styles.labelRow}>
                      <label htmlFor="register_name" className={styles.fieldLabel}>
                        Họ và tên
                      </label>
                    </div>
                    <Form.Item
                      name="name"
                      className={styles.formItem}
                      rules={[{ required: true, message: "Vui lòng nhập họ và tên." }]}
                    >
                      <Input
                        id="register_name"
                        autoComplete="name"
                        placeholder="Nguyễn Văn A"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.labelRow}>
                      <label htmlFor="register_phone" className={styles.fieldLabel}>
                        Số điện thoại
                      </label>
                    </div>
                    <Form.Item
                      name="phone"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập số điện thoại." },
                        {
                          pattern: /^[0-9+() -]{9,15}$/,
                          message: "Số điện thoại chưa đúng định dạng.",
                        },
                      ]}
                    >
                      <Input
                        id="register_phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="0912345678"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.labelRow}>
                      <label htmlFor="register_email" className={styles.fieldLabel}>
                        Email
                      </label>
                    </div>
                    <Form.Item
                      name="email"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập email." },
                        {
                          type: "email",
                          message: "Email chưa đúng định dạng.",
                          transform: (value) => value?.trim(),
                        },
                      ]}
                    >
                      <Input
                        id="register_email"
                        type="email"
                        autoComplete="username"
                        prefix={
                          <Image
                            src="/login/patient-id.svg"
                            alt=""
                            width={16}
                            height={16}
                            aria-hidden
                          />
                        }
                        placeholder="email@example.com"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.labelRow}>
                      <label htmlFor="register_password" className={styles.fieldLabel}>
                        Mật khẩu
                      </label>
                    </div>
                    <Form.Item
                      name="password"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập mật khẩu." },
                        {
                          min: STAFF_PASSWORD_MIN_LENGTH,
                          message: `Mật khẩu cần ít nhất ${STAFF_PASSWORD_MIN_LENGTH} ký tự.`,
                        },
                      ]}
                    >
                      <Input.Password
                        id="register_password"
                        autoComplete="new-password"
                        prefix={
                          <Image
                            src="/login/lock.svg"
                            alt=""
                            width={14}
                            height={18}
                            style={{ height: "auto" }}
                            aria-hidden
                          />
                        }
                        placeholder="Tối thiểu 6 ký tự"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <div className={styles.labelRow}>
                      <label htmlFor="register_confirm_password" className={styles.fieldLabel}>
                        Xác nhận mật khẩu
                      </label>
                    </div>
                    <Form.Item
                      name="confirmPassword"
                      dependencies={["password"]}
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng xác nhận mật khẩu." },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("password") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error("Mật khẩu xác nhận không khớp."));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        id="register_confirm_password"
                        autoComplete="new-password"
                        prefix={
                          <Image
                            src="/login/lock.svg"
                            alt=""
                            width={14}
                            height={18}
                            style={{ height: "auto" }}
                            aria-hidden
                          />
                        }
                        placeholder="Nhập lại mật khẩu"
                        size="large"
                        className={styles.inputCustom}
                        disabled={loading}
                      />
                    </Form.Item>

                    <Form.Item className={styles.formItem}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        aria-label="Đăng ký tài khoản"
                        size="large"
                        loading={loading}
                        disabled={loading}
                        className={styles.submitBtn}
                      >
                        <span>Đăng ký</span>
                        {!loading && (
                          <Image src="/login/arrow.svg" alt="" width={12} height={12} aria-hidden />
                        )}
                      </Button>
                    </Form.Item>

                    <div className={styles.registerGuidance}>
                      <p className={styles.registerGuidanceTitle}>Đã có tài khoản?</p>
                      <div className={styles.registerGuidanceAction}>
                        <Button
                          type="link"
                          onClick={() => {
                            form.resetFields();
                            goToLogin();
                          }}
                          className={styles.linkBtn}
                        >
                          Đăng nhập ngay
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {view === "verify-otp" && (
                  <>
                    <div className={styles.labelRow}>
                      <label htmlFor="login_otp" className={styles.fieldLabel}>
                        Mã OTP
                      </label>
                    </div>
                    <Form.Item
                      name="otpCode"
                      className={styles.formItem}
                      rules={[
                        { required: true, message: "Vui lòng nhập mã OTP." },
                        { pattern: OTP_PATTERN, message: `Mã OTP gồm ${OTP_LENGTH} chữ số.` },
                      ]}
                    >
                      <Input
                        id="login_otp"
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={OTP_LENGTH}
                        placeholder={`Nhập ${OTP_LENGTH} chữ số`}
                        size="large"
                        className={`${styles.inputCustom} ${styles.otpInput}`}
                        disabled={loading}
                      />
                    </Form.Item>
                    <div className={styles.otpActions}>
                      <Button
                        type="link"
                        disabled={loading || secondsLeft > 0}
                        onClick={() => void resendOtp()}
                      >
                        {secondsLeft > 0 ? "Gửi lại mã sau " + secondsLeft + "s" : "Gửi lại mã"}
                      </Button>
                      <Button
                        type="link"
                        disabled={loading}
                        onClick={() => {
                          resetOtp();
                          form.resetFields();
                        }}
                      >
                        Đổi thông tin
                      </Button>
                    </div>

                    <div className={styles.checkboxRow}>
                      <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox disabled={loading} className={styles.checkboxLabel}>
                          Ghi nhớ đăng nhập
                        </Checkbox>
                      </Form.Item>
                    </div>

                    <Form.Item className={styles.formItem}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        aria-label="Xác nhận & Đăng nhập"
                        size="large"
                        loading={loading}
                        disabled={loading}
                        className={styles.submitBtn}
                      >
                        <span>Xác nhận &amp; Đăng nhập</span>
                        {!loading && (
                          <Image src="/login/arrow.svg" alt="" width={12} height={12} aria-hidden />
                        )}
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form>

              {/* Support / Hotline Box */}
              <div className={styles.supportBox}>
                <div className={styles.supportLeft}>
                  <Image src="/login/support.svg" alt="" width={17} height={15} aria-hidden />
                  <span>Cần hỗ trợ?</span>
                </div>
                <a
                  href="tel:19008080"
                  className={styles.supportHotlineBadge}
                  aria-label="Gọi tổng đài hỗ trợ 1900 8080"
                >
                  1900 8080
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Page Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerCopyright}>
          © 2026 MediRoute EMR. Hệ thống quản lý hồ sơ bệnh án cá nhân tích hợp đề xuất lộ trình
          khám tối ưu
        </div>
        <div className={styles.footerLinks}>
          <span>
            Hỗ trợ kỹ thuật: <strong>1900 6868</strong>
          </span>
          <a href="#privacy" onClick={(e) => e.preventDefault()} className={styles.footerLink}>
            Chính sách bảo mật y tế
          </a>
          <a href="#standards" onClick={(e) => e.preventDefault()} className={styles.footerLink}>
            Tiêu chuẩn Bộ Y Tế
          </a>
        </div>
      </footer>
    </div>
  );
}
