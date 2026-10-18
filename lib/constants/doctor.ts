export const CLINIC_STATIONS = [
  { code: "P.102", name: "Nội tổng quát" },
  { code: "P.105", name: "Tim mạch & Điện tim" },
  { code: "P.108", name: "Tiêu hóa" },
] as const;

export const AVAILABLE_ORDERS = [
  {
    code: "P.201",
    name: "Xét nghiệm Huyết học & Sinh hóa máu",
    floor: 2,
    badge: "Nhịn ăn",
    badgeColor: "amber",
  },
  {
    code: "P.104",
    name: "Siêu âm Ổ bụng tổng quát",
    floor: 1,
    badge: "Bàng quang căng",
    badgeColor: "sky",
  },
  {
    code: "P.302",
    name: "Chụp X-Quang ngực thẳng (KTS)",
    floor: 3,
    badge: "Bức xạ Tia X",
    badgeColor: "rose",
  },
  {
    code: "P.203",
    name: "Xét nghiệm Nước tiểu 10 thông số",
    floor: 2,
    badge: "Sau siêu âm",
    badgeColor: "indigo",
  },
] as const;

export const SYMPTOM_OPTIONS = [
  "Đau âm ỉ vùng thượng vị",
  "Ợ chua / Trào ngược dạ dày",
  "Đau thắt ngực trái cấp",
  "Khó thở khi gắng sức",
  "Sốt cao > 38.5°C",
  "Chướng bụng, khó tiêu",
] as const;

export type DoctorOrderCode = (typeof AVAILABLE_ORDERS)[number]["code"];
export type DoctorSymptom = (typeof SYMPTOM_OPTIONS)[number];
