# Rà soát UI Patient — Giai đoạn 1

Ngày rà soát: 07/11/2026. Phạm vi: trang chủ, Lượt khám của tôi, Hồ sơ khám bệnh, chi tiết Kết luận & Đơn thuốc và Hồ sơ cá nhân. Giữ các thay đổi Receptionist hiện có; không đổi API, quyền truy cập hoặc thứ tự nghiệp vụ.

## Bố cục được chốt

- Giữ điều hướng ngang và menu avatar → Hồ sơ cá nhân.
- Header/footer và dashboard trang chủ dùng container chung 1340px gồm gutter. Danh sách lượt khám/hồ sơ, chi tiết và profile dùng khung nội dung tối đa 1120px, căn giữa.
- Breadcrumb ở các trang 1120px căn cùng nội dung. Tiêu đề H1 dùng token chung: desktop 32/40px, mobile 26/34px.
- Card dùng nền trắng, border/radius và màu semantic hiện có. Dữ liệu dài được xuống dòng; không thu nhỏ toàn trang bằng zoom/transform.
- Profile chuyển form về một cột khi vùng chứa nhỏ hơn 640px, kể cả viewport desktop hẹp. Nội dung chưa lưu không bị remount khi tải lại thông tin nền.

## Vấn đề đã sửa

| Vấn đề                                                                     | Kết quả                                                                            |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Tiêu đề thông báo có chuỗi dài không khoảng trắng làm tràn ngang trang chủ | Cho tiêu đề/nội dung thông báo xuống dòng và cho flex child co lại                 |
| Profile không có H1 khi loading hoặc tải lỗi                               | Giữ tiêu đề và container xuyên suốt các trạng thái; có nút thử lại                 |
| Polling profile lỗi sau khi đã có dữ liệu không có phản hồi                | Hiển thị cảnh báo dữ liệu có thể cũ, giữ nguyên nội dung đang nhập                 |
| Trang phân trang vượt phạm vi báo nhầm chưa có lượt khám                   | Thông báo đúng trang không có kết quả, có nút Về trang đầu; không hiện Trang 999/2 |
| Không tải được lượt khám nhưng timeline lại hiển thị như chưa có lượt      | Phân biệt trạng thái chưa tải được với trạng thái trống                            |
| Vé hết hiệu lực hoặc tạm bỏ qua có badge không khớp hướng dẫn              | Đồng bộ badge theo trạng thái vé; không ghi đè kết quả của lượt đã kết thúc        |
| Breadcrumb, H1 và số cột form chưa đồng nhất sau khi thu container         | Căn breadcrumb, chuẩn hóa H1 và dùng container query cho form                      |

Badge trạng thái hiện tại có một live region lịch sự để thông báo thay đổi; timeline vẫn dùng nhãn và biểu tượng cùng màu. Bước bỏ qua không tính là hoàn thành. Không thêm ETA, vị trí trực tiếp hoặc bản đồ khi chưa có dữ liệu.

## Kiểm chứng

- Ma trận 120 mẫu: 5 màn hình × dữ liệu thường/dài/trống/lỗi × 320, 390, 768, 1024, 1440 và 1920px.
- Kiểm tra riêng loading, đúng một H1, không tràn ngang, container 1120px, breadcrumb, vùng bấm điều khiển và một số cặp màu chữ/nền đã render.
- Kiểm tra bàn phím tới skip link, Escape đóng menu avatar, quay về trang đầu và nhãn vé hết hiệu lực. Đây là kiểm tra chọn lọc, không phải chứng nhận accessibility đầy đủ.
- Bộ hồi quy hồ sơ kiểm tra phân trang, lỗi/thử lại, thuốc/lời dặn, reload và chặn hồ sơ không thuộc bệnh nhân.
- Bộ P0 kiểm tra nội dung chưa lưu, hủy rời trang, chống gửi lặp và giữ dữ liệu sau lỗi.
- Unit tests: 49 kiểm tra, gồm badge vé hết hạn/tạm bỏ qua và trạng thái kết thúc.

Các browser test dùng Chrome với API fixture cục bộ, không ghi database thật. Chưa đánh giá bằng screen reader hoặc phiên làm việc với dữ liệu bệnh viện thật.

## Chạy lại

1. Chạy `npm run build`.
2. Nếu Playwright không có trong môi trường mặc định, đặt `PLAYWRIGHT_MODULE` tới module có sẵn như các browser test khác của dự án.
3. Chạy `npm run test:patient-ui`.
4. Xem ảnh và `report.json` trong thư mục tạm `ez-healthcare-patient-stage1-audit`; có thể chọn thư mục khác bằng `PATIENT_UI_AUDIT_OUTPUT`.
5. Chạy `node tests/patient-records.browser.mjs` và `node tests/p0-form-safety.browser.mjs` để kiểm tra hồi quy nghiệp vụ giao diện.

Giai đoạn tiếp theo là hoàn thiện hành trình patient hoặc chuyển sang Nurse theo ưu tiên dự án; bản đồ phòng/tầng cần phạm vi dữ liệu riêng.

## Kết quả và điểm còn lại của kiểm tra toàn repo

Ma trận audit sau sửa có 120 mẫu, không còn lỗi kiểm tra và không có lỗi JavaScript trên các trang đã xét. Các kiểm tra loading, bàn phím, menu avatar, khôi phục phân trang và 7 cặp màu chữ/nền được chọn đều đạt. Bộ unit 49/49, lint, build, kiểm tra token và format trong phạm vi patient đạt; browser hồi quy hồ sơ và P0 đạt.

`npm run validate` toàn repo dừng ở `format:check`: 48 file chưa chỉnh sửa có kiểu xuống dòng CRLF trong working tree, trong khi cấu hình yêu cầu LF. Đối chiếu với HEAD cho thấy 48/48 file giữ nguyên nội dung sau khi chuẩn hóa xuống dòng; bản HEAD qua kiểm tra Prettier. Không format hàng loạt các file ngoài phạm vi UI để tránh trộn thay đổi không liên quan.

Vì vậy, phần UI giai đoạn 1 đã được rà soát và sửa các lỗi tìm thấy; trạng thái validate toàn repo vẫn còn vấn đề line ending nêu trên. Không có commit mới được tạo trong lần rà soát này.
