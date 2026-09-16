import fs from 'fs';
import path from 'path';

const mockDir = path.join(process.cwd(), 'public', 'mock-screens');

const testSuites = [
  {
    id: '01_login.html',
    name: 'Flow 1: Màn hình Đăng Nhập Tinh Gọn',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có form đăng nhập & input tài khoản', test: (content) => content.includes('input') },
      { desc: 'Có bộ chuyển đổi vai trò (Role Switcher)', test: (content) => content.includes('Bác sĩ') || content.includes('Bệnh nhân') },
      { desc: 'Có nhãn bảo mật chuẩn y tế', test: (content) => content.includes('AES') || content.includes('Bảo mật') },
    ]
  },
  {
    id: '02_patient_triage.html',
    name: 'Flow 2.1: Khảo Sát Triệu Chứng Triage',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có câu hỏi triệu chứng ban đầu', test: (content) => content.includes('triệu chứng') || content.includes('Triệu chứng') },
      { desc: 'Có nút tạo lộ trình tối ưu', test: (content) => content.includes('Lộ Trình') || content.includes('lộ trình') },
    ]
  },
  {
    id: '03_patient_gps_route.html',
    name: 'Flow 2.2: GPS Lộ Trình Khám & Hàng Đợi Trực Tiếp',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Hiển thị số vé khám bệnh nhân (A-018/Ticket)', test: (content) => content.includes('A-018') || content.includes('018') },
      { desc: 'Hiển thị phòng khám hiện tại (P.104/Siêu âm)', test: (content) => content.includes('104') || content.includes('Siêu âm') },
      { desc: 'Có cơ chế cảnh báo/tái định tuyến (Re-routing)', test: (content) => /tối ưu|điều phối|lộ trình|re-routing/i.test(content) },
    ]
  },
  {
    id: '04_patient_emr_summary.html',
    name: 'Flow 2.3: Bệnh Án Điện Tử & Đơn Thuốc Bệnh Nhân',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có chẩn đoán bệnh (ICD-10/Dạ dày)', test: (content) => content.includes('K29') || content.includes('dạ dày') || content.includes('Chẩn đoán') },
      { desc: 'Có đơn thuốc điện tử & mã nhận thuốc', test: (content) => content.includes('thuốc') || content.includes('Thuốc') },
    ]
  },
  {
    id: '05_doctor_workspace.html',
    name: 'Flow 3.1: Bàn Khám Bác Sĩ Lâm Sàng (2 Cột)',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có nút Gọi Bệnh Nhân Tiếp Theo', test: (content) => content.includes('GỌI') || content.includes('tiếp theo') },
      { desc: 'Có danh sách hàng đợi phòng khám', test: (content) => content.includes('Hàng Đợi') || content.includes('hàng đợi') },
      { desc: 'Có nút hoàn tất lượt khám', test: (content) => content.includes('HOÀN TẤT') || content.includes('Hoàn tất') },
    ]
  },
  {
    id: '06_lab_station.html',
    name: 'Flow 3.2: Trạm Cận Lâm Sàng & Lấy Mẫu Xét Nghiệm',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có thông tin lấy mẫu/xét nghiệm', test: (content) => content.includes('mẫu') || content.includes('Xét Nghiệm') || content.includes('xét nghiệm') },
      { desc: 'Có nút xác nhận hoàn thành bước', test: (content) => content.includes('hoàn thành') || content.includes('Xác nhận') || content.includes('HOÀN THÀNH') },
    ]
  },
  {
    id: '07_operations_heatmap.html',
    name: 'Flow 4.1: Bản Đồ Nhiệt Hàng Đợi (Floor Heatmap)',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có thẻ đo lường KPI / thời gian chờ', test: (content) => content.includes('phút') || content.includes('thời gian') || content.includes('Lượt khám') },
      { desc: 'Có sơ đồ mặt bằng các phòng khám', test: (content) => content.includes('Tầng') || content.includes('Phòng') || content.includes('phòng') },
    ]
  },
  {
    id: '08_dag_rules_builder.html',
    name: 'Flow 4.2: Cấu Hình Đồ Thị DAG & Luật Triage',
    checks: [
      { desc: 'File tồn tại và có nội dung', test: (content) => content.length > 1000 },
      { desc: 'Có đồ thị luồng khám / DAG node', test: (content) => content.includes('DAG') || content.includes('Đồ thị') || content.includes('Node') },
      { desc: 'Có kiểm tra chu trình (No-Cycle / Hợp lệ)', test: (content) => content.includes('chu trình') || content.includes('Hợp lệ') || content.includes('Quy tắc') },
    ]
  },
];

console.log('\n🏥 ========================================================');
console.log('   BẮT ĐẦU CHẠY KIỂM THỬ MOCK SCREENS (BRANCH: feat/mock)   ');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

for (const suite of testSuites) {
  const filePath = path.join(mockDir, suite.id);
  console.log(`\n📋 [SUITE] ${suite.name} (${suite.id})`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ [FAIL] Không tìm thấy file: ${filePath}`);
    totalTests += suite.checks.length;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const check of suite.checks) {
    totalTests++;
    try {
      const ok = check.test(content);
      if (ok) {
        passedTests++;
        console.log(`   ✅ [PASS] ${check.desc}`);
      } else {
        console.log(`   ⚠️ [FAIL] ${check.desc}`);
      }
    } catch (e) {
      console.log(`   ❌ [ERROR] ${check.desc}: ${e.message}`);
    }
  }
}

console.log('\n--------------------------------------------------------');
console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} CHECKS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
if (passedTests === totalTests) {
  console.log('🎉 TẤT CẢ 8 MOCK SCREENS ĐỀU HỢP LỆ VÀ SẴN SÀNG TRÌNH CHIẾU!');
} else {
  console.log('⚠️ Có một số bài kiểm tra chưa đạt, hãy rà soát lại.');
}
console.log('--------------------------------------------------------\n');
