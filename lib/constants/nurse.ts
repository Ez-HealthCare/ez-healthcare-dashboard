import type { IntakeInput } from "../types/clinical";

export const FAST_RED_FLAG_REASON = "Cờ đỏ F.A.S.T: Nghi ngờ đột quỵ não cấp (giờ vàng)";

// Ca bệnh mẫu theo đặc tả Phase 2; điều dưỡng xác nhận lại bằng số đo thực tế.
export const NURSE_CASES: { label: string; departmentCode?: string; intake: IntakeInput }[] = [
  {
    label: "[Hô hấp] Viêm phế quản cấp",
    departmentCode: "P.105",
    intake: {
      chiefComplaint: "Ho khạc đờm vàng, sốt, thở rít bỏng rát sau xương ức",
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 84,
      temperature: 38.0,
      spo2: 96,
      respiratoryRate: 20,
      symptomOnset: "3 ngày trước",
      symptomSeverity: "Vừa",
      symptomDuration: "3 ngày",
      isRedFlag: false,
    },
  },
  {
    label: "[Hô hấp] Lao phổi",
    departmentCode: "P.105",
    intake: {
      chiefComplaint: "Ho khạc đờm lẫn máu kéo dài > 3 tuần, sốt nhẹ về chiều, gầy sút cân",
      bloodPressureSystolic: 115,
      bloodPressureDiastolic: 75,
      heartRate: 82,
      temperature: 37.8,
      spo2: 95,
      respiratoryRate: 19,
      symptomOnset: "hơn 3 tuần trước",
      symptomSeverity: "Nặng",
      symptomDuration: "1 tháng",
      isRedFlag: false,
    },
  },
  {
    label: "[Tim mạch] Tăng huyết áp",
    departmentCode: "P.103",
    intake: {
      chiefComplaint: "Đau đầu vùng chẩm gáy vào buổi sáng, hoa mắt, chóng mặt, hồi hộp",
      bloodPressureSystolic: 165,
      bloodPressureDiastolic: 100,
      heartRate: 88,
      temperature: 36.8,
      spo2: 98,
      respiratoryRate: 16,
      symptomOnset: "sáng nay",
      symptomSeverity: "Vừa",
      symptomDuration: "vài ngày",
      isRedFlag: false,
    },
  },
  {
    label: "[Thận - Tiết niệu] Sỏi tiết niệu",
    departmentCode: "P.106",
    intake: {
      chiefComplaint: "Cơn đau quặn thận thắt lưng lan bẹn, buồn nôn, đái buốt đái máu",
      bloodPressureSystolic: 135,
      bloodPressureDiastolic: 85,
      heartRate: 90,
      temperature: 37.2,
      spo2: 98,
      respiratoryRate: 18,
      symptomOnset: "đột ngột 2 giờ trước",
      symptomSeverity: "Nặng",
      symptomDuration: "2 giờ",
      isRedFlag: false,
    },
  },
  {
    label: "[Lão khoa] Đột quỵ não (F.A.S.T)",
    // Đột quỵ cấp chuyển STAT P.001 qua Intake, không gợi ý khám thường P.107.
    intake: {
      chiefComplaint: "Khởi phát đột ngột méo miệng, liệt yếu nửa người trái, nói ngọng khó hiểu",
      bloodPressureSystolic: 170,
      bloodPressureDiastolic: 95,
      heartRate: 92,
      temperature: 37.0,
      spo2: 97,
      respiratoryRate: 18,
      symptomOnset: "",
      symptomSeverity: "",
      symptomDuration: "",
      isRedFlag: true,
      redFlagReason: FAST_RED_FLAG_REASON,
    },
  },
];
