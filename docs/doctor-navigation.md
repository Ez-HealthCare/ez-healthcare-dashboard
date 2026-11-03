# Điều hướng Doctor

Cập nhật 2026-11-03: nav chính có ba mục.

| Mục               | Đường dẫn                   | Nội dung                                                                                                                                                                                                                     |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bàn khám          | `/dashboard/doctor`         | Tổng quan phòng, hàng đợi, gọi/tiếp nhận và hồ sơ của lượt được chọn. Các bước lâm sàng, chỉ định, kết quả, chuyển chuyên khoa và kết luận/kê đơn nằm trong hồ sơ.                                                           |
| Kết quả CLS       | `/dashboard/doctor/results` | Danh sách PARACLINICAL_PENDING / RE_EXAM_CALLING, tìm kiếm/lọc đã có kết quả và xem từng lượt; tiếp nhận tái khám đưa đúng lượt về Bàn khám ở bước lâm sàng. Không tự chọn lượt CLINIC_WAITING hoặc IN_EXAMINATION thay thế. |
| Lịch sử khám bệnh | `/dashboard/doctor/history` | Các lượt COMPLETED có kết luận do bác sĩ đăng nhập ký; lọc ngày hoàn tất theo giờ Việt Nam, tìm họ tên/số khám/số tiếp nhận, phân trang 10 lượt. Xem kết luận, thuốc, lời dặn và lịch tái khám ở chế độ chỉ đọc.             |

Lịch sử dùng API riêng `GET /visits/doctor/history` và `GET /visits/doctor/history/:id`. API lấy danh tính từ phiên đăng nhập, không nhận doctorId từ người gọi. Quyền dựa trên bác sĩ ký kết luận, không phụ thuộc phòng/ca trực hiện tại. Hồ sơ bác sĩ khác hoặc chưa hoàn tất trả 404; các vai trò khác không được gọi API. Bộ lọc và trang được giữ trong URL khi mở chi tiết rồi quay lại. Các API cập nhật khám/đơn hiện có vẫn giữ nguyên quy tắc phân quyền.

Tương thích: `/dashboard/doctor/queue` chuyển về Bàn khám, `/dashboard/doctor/consultation` chuyển về Bàn khám với `view=clinical`. Giữ query visitId và thông tin truy vấn, không bỏ qua xác thực/phân quyền trước redirect. Thông báo mới dẫn thẳng `/dashboard/doctor?visitId=...`. `view` chỉ chấp nhận các bước đã định nghĩa, không là đích URL tùy ý.

Đổi mục/nav/phòng/bệnh nhân vẫn bảo vệ nội dung chưa lưu. Đổi bước trong cùng hồ sơ giữ state hiện có. Không thay quyền API, quy tắc gọi → nhận khám hay dữ liệu khám đã lưu.

Kiểm chứng: unit policy/helper chọn đúng ngữ cảnh, route/RSC authorization matrix và alias redirects, P0 form safety, P1 deep link/mobile và P2 results worklist → tiếp nhận tái khám → đúng hồ sơ Bàn khám, empty state không chọn người khác.

Lịch sử đã được kiểm chứng bằng PostgreSQL integration (quyền theo người ký, lọc ngày Việt Nam, phân trang, tìm tên/số và chặn hồ sơ không hợp lệ), browser fixture (lọc/URL/quay lại, retry, đơn chỉ đọc, không kê thuốc, 320–1440px), cùng hồi quy Patient hồ sơ và Doctor CLS.
