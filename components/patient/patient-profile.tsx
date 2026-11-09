"use client";

import { formatDate } from "@/lib/display-format";
import { useRef, useState } from "react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { clinicalErrorMessage } from "@/lib/clinical-error";
import { Alert, Button, Form, Input, Select, Spin, message } from "antd";
import { useRouter } from "next/navigation";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { ROUTES } from "@/lib/constants/routes";
import type { PatientProfile, UpdatePatientProfileInput } from "@/lib/types/clinical";
import { PatientIcon } from "./patient-icon";
import styles from "./patient-profile.module.css";

function ProfileHeading() {
  return (
    <header className={styles.heading}>
      <span className={styles.eyebrow}>Cổng người bệnh · Tài khoản</span>
      <h1>Hồ sơ cá nhân</h1>
      <p>Quản lý thông tin liên hệ, giấy tờ tiếp nhận và dị ứng đã biết.</p>
    </header>
  );
}

function ProfileForm({
  profile,
  loadError,
  onRefresh,
}: {
  profile: PatientProfile;
  loadError?: string;
  onRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const [toast, context] = message.useMessage();

  const changes = useUnsavedChanges();
  const [form] = Form.useForm<UpdatePatientProfileInput>();
  const dateOfBirth = Form.useWatch("dateOfBirth", form) || profile.dateOfBirth;
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (values: UpdatePatientProfileInput) => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      await clinicalActions.updateMyProfile({
        ...values,
        allergies: values.allergies || [],
        insuranceCardNumber: values.insuranceCardNumber || undefined,
      });
      changes.markSaved();
      toast.success("Thông tin cá nhân đã được cập nhật.");
      router.replace(ROUTES.PATIENT);
      router.refresh();
    } catch (error) {
      setError(clinicalErrorMessage(error));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <div className={styles.profilePage}>
      {context}
      <ProfileHeading />
      {loadError && (
        <Alert
          type="warning"
          showIcon
          title="Chưa cập nhật được hồ sơ"
          description="Thông tin đang hiển thị có thể chưa phải bản mới nhất. Nội dung bạn đang nhập vẫn được giữ lại."
          action={<Button onClick={() => void onRefresh()}>Thử lại</Button>}
        />
      )}
      <div className={styles.profileGrid}>
        <aside className={styles.summary} aria-label="Tóm tắt hồ sơ cá nhân">
          <span className={styles.avatar}>
            {profile.name
              .trim()
              .split(/\s+/)
              .slice(-2)
              .map((part) => part[0])
              .join("")}
          </span>
          <h2>{profile.name}</h2>
          <span className={styles.patientLabel}>Bệnh nhân</span>
          <dl>
            <div>
              <dt>Email tài khoản</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Ngày sinh</dt>
              <dd>{formatDate(profile.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Giới tính</dt>
              <dd>
                {{ MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" }[profile.gender || ""] ||
                  "Chưa cập nhật"}
              </dd>
            </div>
          </dl>
          <div className={styles.summaryNote}>
            <PatientIcon name="shield" />
            <p>Thông tin được dùng để đối chiếu khi tiếp nhận. Vui lòng kiểm tra trước khi lưu.</p>
          </div>
        </aside>
        <section className={styles.profileCard} aria-label="Thông tin cá nhân">
          <div className={styles.cardHeading}>
            <span className={styles.cardIcon}>
              <PatientIcon name="user" />
            </span>
            <div>
              <h2>Thông tin cá nhân</h2>
              <p>Cập nhật thông tin của bạn để việc tiếp nhận thuận tiện hơn.</p>
            </div>
          </div>
          {changes.dirty && <p role="status">Có thay đổi chưa lưu.</p>}
          {error && (
            <Alert type="error" showIcon title="Chưa lưu được thông tin" description={error} />
          )}
          <Form<UpdatePatientProfileInput>
            form={form}
            disabled={saving}
            scrollToFirstError={{ focus: true }}
            onValuesChange={changes.markDirty}
            layout="vertical"
            initialValues={{
              ...profile,
              dateOfBirth: profile.dateOfBirth?.slice(0, 10),
              allergies: profile.allergies || [],
            }}
            onFinish={(values) => void save(values)}
            className={styles.profileForm}
          >
            <div className={styles.groupHeading}>
              <h3>Nhân thân & Liên hệ</h3>
              <p>Các trường có dấu * là bắt buộc.</p>
            </div>
            <Form.Item label="Họ và tên" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Ngày sinh"
              name="dateOfBirth"
              rules={[{ required: true }]}
              extra={`Ngày đã chọn: ${formatDate(dateOfBirth)}`}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Giới tính" name="gender" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "MALE", label: "Nam" },
                  { value: "FEMALE", label: "Nữ" },
                  { value: "OTHER", label: "Khác" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
              <Input inputMode="tel" />
            </Form.Item>
            <div className={styles.groupHeading}>
              <h3>Giấy tờ tiếp nhận</h3>
              <p>Đối chiếu thông tin với CCCD và thẻ BHYT của bạn.</p>
            </div>
            <Form.Item label="CCCD" name="nationalId" rules={[{ required: true }]}>
              <Input inputMode="numeric" />
            </Form.Item>
            <Form.Item label="Số thẻ BHYT" name="insuranceCardNumber">
              <Input />
            </Form.Item>
            <div className={styles.groupHeading}>
              <h3>Thông tin sức khỏe</h3>
              <p>Ghi nhận các dị ứng bạn đã biết để nhân viên y tế tham khảo.</p>
            </div>
            <Form.Item
              className={styles.fullWidth}
              label="Dị ứng đã biết"
              name="allergies"
              extra="Để trống nếu không có dị ứng đã biết."
            >
              <Select mode="tags" tokenSeparators={[","]} />
            </Form.Item>
            <div className={styles.profileActions}>
              <Button type="primary" htmlType="submit" loading={saving}>
                Lưu thông tin
              </Button>
              <Button
                onClick={() => {
                  if (changes.confirmDiscard()) router.push(ROUTES.PATIENT);
                }}
              >
                Quay lại
              </Button>
            </div>
          </Form>
        </section>
      </div>
    </div>
  );
}

export function PatientProfilePage() {
  const profile = useClinicalData(clinicalActions.myProfile, 30_000);
  if (profile.loading)
    return (
      <div className={styles.profilePage}>
        <ProfileHeading />
        <div className={styles.profileLoading} role="status" aria-label="Đang tải hồ sơ cá nhân">
          <Spin />
        </div>
      </div>
    );
  if (!profile.data)
    return (
      <div className={styles.profilePage}>
        <ProfileHeading />
        <Alert
          type="error"
          showIcon
          title="Không thể tải hồ sơ"
          description={profile.error}
          action={<Button onClick={() => void profile.refresh()}>Thử lại</Button>}
        />
      </div>
    );
  return (
    <ProfileForm
      key={profile.data.id}
      profile={profile.data}
      loadError={profile.error}
      onRefresh={profile.refresh}
    />
  );
}
