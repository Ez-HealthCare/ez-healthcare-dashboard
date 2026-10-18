"use client";

import {
  OTP_LENGTH,
  OTP_PATTERN,
  OTP_LIFETIME_MINUTES,
  STAFF_PASSWORD_MIN_LENGTH,
} from "@/lib/constants/auth";

import { useState } from "react";
import Image from "next/image";
import { Alert, Form, Input, Button, Checkbox, Radio } from "antd";
import { useLogin, type LoginFormValues } from "@/hooks/use-login";
import styles from "./login.module.css";

export default function LoginPage() {
  const [forgotInfo, setForgotInfo] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const {
    loading,
    mode,
    otpEmail,
    error,
    secondsLeft,
    submit,
    resendOtp: resend,
    resetOtp,
    changeMode,
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

              <h1 className={styles.leftHeading}>Chủ động hành trình khám của bạn.</h1>
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

          {/* Right Login Card Panel */}
          <section className={styles.rightPanel} aria-label="Đăng nhập tài khoản">
            <div className={styles.loginCard}>
              <h2 className={styles.loginCardTitle}>Chào mừng trở lại</h2>
              <p className={styles.loginCardSubtitle}>
                Đăng nhập để tiếp tục hành trình khám của bạn.
              </p>

              <Radio.Group
                className={styles.modeSwitch}
                aria-label="Loại tài khoản"
                value={mode}
                optionType="button"
                buttonStyle="solid"
                disabled={loading}
                options={[
                  { label: "Bệnh nhân", value: "patient" },
                  { label: "Nhân viên y tế", value: "staff" },
                ]}
                onChange={(event) => {
                  changeMode(event.target.value);
                  setForgotInfo(false);
                  form.resetFields(["password", "otpCode"]);
                }}
              />
              {error && (
                <Alert
                  className={styles.feedback}
                  title={error}
                  type="error"
                  showIcon
                  role="alert"
                />
              )}
              {mode === "patient" && otpEmail && (
                <Alert
                  className={styles.feedback}
                  type="success"
                  showIcon
                  title="Mã OTP đã được gửi"
                  description={`Kiểm tra hộp thư ${otpEmail}. Mã có hiệu lực ${OTP_LIFETIME_MINUTES} phút.`}
                />
              )}
              <Form<LoginFormValues>
                form={form}
                layout="vertical"
                onFinish={submit}
                requiredMark={false}
                initialValues={{ remember: false }}
              >
                <div className={styles.labelRow}>
                  <label htmlFor="login_email" className={styles.fieldLabel}>
                    Email
                  </label>
                  <span className={styles.fieldHint}>
                    {mode === "patient" ? "Bệnh nhân" : "Nhân viên"}
                  </span>
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
                    disabled={loading || !!otpEmail}
                  />
                </Form.Item>

                {mode === "staff" && (
                  <>
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
                  </>
                )}

                {mode === "patient" && otpEmail && (
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
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={OTP_LENGTH}
                        placeholder={`Nhập ${OTP_LENGTH} chữ số`}
                        size="large"
                        className={styles.inputCustom}
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
                          form.resetFields(["otpCode"]);
                        }}
                      >
                        Đổi email
                      </Button>
                    </div>
                  </>
                )}

                <div className={styles.checkboxRow}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox disabled={loading} className={styles.checkboxLabel}>
                      Ghi nhớ đăng nhập
                    </Checkbox>
                  </Form.Item>
                  {mode === "staff" && (
                    <button
                      type="button"
                      onClick={handleToggleForgot}
                      className={styles.forgotBtn}
                      aria-expanded={forgotInfo}
                    >
                      Quên mật khẩu?
                    </button>
                  )}
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
                    aria-label={mode === "patient" && !otpEmail ? "Nhận mã OTP" : "Đăng nhập"}
                    size="large"
                    loading={loading}
                    disabled={loading}
                    className={styles.submitBtn}
                  >
                    <span>{mode === "patient" && !otpEmail ? "Nhận mã OTP" : "Đăng nhập"}</span>
                    {!loading && (
                      <Image src="/login/arrow.svg" alt="" width={12} height={12} aria-hidden />
                    )}
                  </Button>
                </Form.Item>
              </Form>

              {/* Guidance under Submit */}
              <div className={styles.registerGuidance}>
                <p className={styles.registerGuidanceTitle}>Chưa có tài khoản bệnh nhân?</p>
                <p className={styles.registerGuidanceDesc}>
                  Dùng email và mã OTP để đăng nhập hoặc tạo tài khoản bệnh nhân.
                </p>
              </div>

              {/* Support / Hotline Box */}
              <div className={styles.supportBox}>
                <div className={styles.supportLeft}>
                  <Image src="/login/support.svg" alt="" width={17} height={15} aria-hidden />
                  <span>Cần hỗ trợ tra cứu mã?</span>
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

            <p className={styles.rightDisclaimer}>
              © 2025 MediRoute EMR. Bảo mật thông tin người bệnh theo quy định Y tế.
            </p>
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
