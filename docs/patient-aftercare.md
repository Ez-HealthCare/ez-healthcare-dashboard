# Sau khám: đơn thuốc, thông báo và hồ sơ Patient

Phạm vi triển khai 2026-11-03: Patient xem lại kết luận/đơn đã lưu và lịch sử qua API thật; không lưu hồ sơ sức khỏe vào localStorage.

- Kết luận mới: API lưu đơn/items, COMPLETED, bước tái khám và VISIT_COMPLETED trong cùng transaction với audit. Gửi lại một lượt đã kết luận bị từ chối; không nhân bản đơn/thông báo. Nếu transaction lỗi thì không có thông báo thành công giả.
- Dashboard dùng đủ nhãn chung với Doctor, giải thích chờ CLS/tái khám/hoàn tất. Lượt COMPLETED có nút mở đúng hồ sơ; lượt đã kết thúc không hiển thị cảnh báo vé hết hạn sai ngữ cảnh.
- Notification có visitId dẫn `/dashboard/patient/records?visitId=...`; thời gian/link hiển thị riêng. Thông báo cập nhật bằng polling hiện có, không phải WebSocket.
- `GET /visits/me/history?page=1&pageSize=10&status=COMPLETED`: PATIENT-only, caller.id quyết định chủ hồ sơ, giới hạn pageSize 50. BFF chỉ cho đúng đường dẫn lịch sử.
- “Lượt khám của tôi” hiển thị các trạng thái; “Hồ sơ khám bệnh” lọc các lượt COMPLETED. Chi tiết dùng endpoint dossier có owner check, hiện đủ thuốc/liều/đường dùng/tần suất/số ngày/số lượng/hướng dẫn, lời dặn và tái khám; có trạng thái không kê thuốc/lỗi/thử lại.
- Tái khám ghi IN_PROGRESS khi tiếp nhận, COMPLETED khi kết luận. Response lượt cũ COMPLETED chuẩn hóa bước tái khám tương ứng, không sửa DB cũ.
- Patient đọc kết quả CLS phải đúng chủ; gửi kết quả trong transaction khóa lượt, chỉ cho PARACLINICAL_PENDING, kiểm prerequisite và chặn ghi lại bước hoàn tất, không hồi sinh trạng thái cuối.

Đơn cũ vẫn xem được qua hồ sơ dù trước đó chưa tạo notification. Không tự gửi bù thông báo, đổi đơn hoặc mở thêm lượt cùng ngày. Chính sách nhiều lượt cùng ngày vẫn cần quyết định riêng.

Kiểm chứng: `tests/patient-records.browser.mjs` dùng fixture/Next cổng 3027 và Chrome; đặt `PLAYWRIGHT_MODULE` nếu cần. Kiểm tra status/deep link/read-reload, dữ liệu sau reload, pagination/lỗi/thử lại, không thuốc, từ chối hồ sơ sai và responsive 320/390px. Chạy sau production build; không sửa DB thật. P0/P1 browser và unit contract/policy được chạy hồi quy. Backend PostgreSQL integration dùng compose.integration.yml, gồm rollback đơn/notification và owner checks.

Giới hạn: chưa có UI chi tiết nội dung kết quả CLS Patient, tải/in toa, sửa sai đơn/kết quả, phân công trạm Lab hoặc lịch sử Nurse bền vững. Các thay đổi trên không đồng nghĩa toàn bộ roadmap đã hoàn tất.
