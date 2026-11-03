# Design system trong ứng dụng

Quy chuẩn thiết kế: `D:\LOCAL-DESIGN-SYSTEMS\ez-healthcare-design\MASTER.md`.

Nguồn token chỉnh sửa cho code là **tokens.json trong thư mục này**. Bản JSON ở thư mục tài liệu ngoài repository là snapshot, không phải nguồn thứ hai để build. Sau khi duyệt thay đổi quy chuẩn, cập nhật JSON trong repo, chạy `npm run design:tokens`, rồi cập nhật snapshot/tài liệu ngoài repo.

- `app/design-tokens.css`: CSS variables được sinh tự động.
- `lib/design-tokens.ts`: dữ liệu TypeScript được sinh tự động.
- `lib/constants/theme.ts`: ánh xạ token vào Ant Design; staff/Patient chỉ ghi đè mật độ và cỡ chữ theo vai trò.
- `app/workspace-layout.css`: khung header/main/footer chung, container border-box 1340px, gutter 24px/16px.
- `app/fonts`: Be Vietnam Pro normal 400–900 tự lưu, giấy phép OFL và nguồn/hash; `next/font/local` được áp dụng từ root layout. Không gọi font CDN khi build hoặc khi mở ứng dụng.
- `lib/display-format.ts`: ngày `dd/MM/yyyy`, giờ `HH:mm`, timestamp `HH:mm · dd/MM/yyyy` theo `Asia/Ho_Chi_Minh`. Ngày sinh dạng ISO date-only được giữ nguyên ngày lịch; thiếu/sai định dạng hiển thị `—`.
- `RecordIdentifier`: chỉ thu gọn UUID ở phần tóm tắt; mở chi tiết để xem/sao chép mã đầy đủ. Số khám, số tiếp nhận và mã bệnh nhân có ý nghĩa không bị cắt.

Không sửa hai file generated bằng tay. `npm run design:tokens:check` phát hiện file sinh bị lệch; `npm run validate` đã bao gồm kiểm tra này. Breakpoint trong media queries CSS dùng literal do CSS không nhận `var()` trong điều kiện media; nếu đổi breakpoint trong JSON phải cập nhật các query liên quan và chạy kiểm thử responsive. Spacing giá trị được dùng qua CSS variables, không tự động đổi cấu trúc grid khi đổi token.

Input `type=date` vẫn giữ giá trị ISO theo hợp đồng API và giao diện lịch của trình duyệt; nhãn ngày đã chọn dùng định dạng chung để tránh nhầm locale. Không chuyển payload API sang chuỗi ngày hiển thị.

Phạm vi đã tích hợp: Patient, Receptionist, Nurse, Doctor và theme nền ứng dụng. Admin/Lab/Emergency chưa được xác nhận rà soát từng màn. Đây không phải chứng nhận WCAG toàn ứng dụng.

## Bản 1.2 — Patient và Be Vietnam Pro

Font toàn app là Be Vietnam Pro (next/font/local). Patient dùng nền patientBackground, vùng hỗ trợ patientHighlight; giữ primary teal và màu trạng thái. Trang chủ chia lượt khám/thông báo, truy cập nhanh thực; các trang con dùng một H1 theo ngữ cảnh, không lặp lời chào. Chi tiết hồ sơ tối đa1120px: thông tin lượt ở đầu, kết luận/thuốc ở cột chính, tái khám/tiến trình ở cột phụ; dưới1024px xếp lại và mobile một cột. Giữ dữ liệu, quyền, guard form và luồng nghiệp vụ.
