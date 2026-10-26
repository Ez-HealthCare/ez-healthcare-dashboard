"use client";

import { Button, Form, Input, Select, Spin, message } from "antd";
import { useRouter } from "next/navigation";
import { clinicalActions, useClinicalData } from "@/hooks/use-clinical";
import { ROUTES } from "@/lib/constants/routes";
import type { PatientProfile, UpdatePatientProfileInput } from "@/lib/types/clinical";
import styles from "./patient-dashboard.module.css";

function ProfileForm({ profile }: { profile: PatientProfile }) {
  const router = useRouter();
  const [toast, context] = message.useMessage();

  const save = async (values: UpdatePatientProfileInput) => {
    try {
      await clinicalActions.updateMyProfile({
        ...values,
        allergies: values.allergies || [],
        insuranceCardNumber: values.insuranceCardNumber || undefined,
      });
      toast.success("Thông tin cá nhân đã được cập nhật.");
      router.replace(ROUTES.PATIENT);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    }
  };

  return (
    <section className={styles.profileCard} aria-label="Thông tin cá nhân">
      {context}
      <span className={styles.visitBadge}>Hồ sơ hành chính</span>
      <h2>Thông tin cá nhân</h2>
      <p className={styles.profileIntro}>Lễ tân dùng thông tin này để đối chiếu CCCD và BHYT.</p>
      <Form<UpdatePatientProfileInput>
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
        <Form.Item label="Ngày sinh" name="dateOfBirth" rules={[{ required: true }]}>
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
          <Button type="primary" htmlType="submit">
            Lưu thông tin
          </Button>
          <Button onClick={() => router.push(ROUTES.PATIENT)}>Quay lại</Button>
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
    return <p className={styles.profileError}>{profile.error || "Không thể tải hồ sơ."}</p>;
  return <ProfileForm key={profile.data.id} profile={profile.data} />;
}
