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
import styles from "./patient-dashboard.module.css";

function ProfileForm({ profile }: { profile: PatientProfile }) {
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
    <section className={styles.profileCard} aria-label="Thông tin cá nhân">
      {context}
      <span className={styles.visitBadge}>Hồ sơ hành chính</span>
      <h1>Thông tin cá nhân</h1>
      <p className={styles.profileIntro}>Lễ tân dùng thông tin này để đối chiếu CCCD và BHYT.</p>
      {changes.dirty && <p role="status">Có thay đổi chưa lưu.</p>}
      {error && <Alert type="error" showIcon title="Chưa lưu được thông tin" description={error} />}
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
        <Form.Item label="CCCD" name="nationalId" rules={[{ required: true }]}>
          <Input inputMode="numeric" />
        </Form.Item>
        <Form.Item label="Số thẻ BHYT" name="insuranceCardNumber">
          <Input />
        </Form.Item>
        <Form.Item
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
  );
}

export function PatientProfilePage() {
  const profile = useClinicalData(clinicalActions.myProfile, 30_000);
  if (profile.loading)
    return (
      <div className={styles.profileLoading}>
        <Spin />
      </div>
    );
  if (!profile.data)
    return (
      <Alert
        type="error"
        title="Không thể tải hồ sơ"
        description={profile.error}
        action={<Button onClick={() => void profile.refresh()}>Thử lại</Button>}
      />
    );
  return <ProfileForm key={profile.data.id} profile={profile.data} />;
}
