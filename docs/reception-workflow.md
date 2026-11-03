# Luồng Receptionist

| Trang                    | Mục đích                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Yêu cầu tiếp nhận        | Duyệt thông tin đăng ký online; cấp một số tiếp nhận và tạo lượt trong hàng đợi. Chưa xác minh giấy tờ tại quầy.       |
| Bàn tiếp nhận / Hàng đợi | Gọi người bệnh đã có số; đối chiếu CCCD/BHYT; xác minh và bàn giao sang sàng lọc.                                      |
| Lịch hẹn                 | Check-in lịch hẹn và cấp số tiếp nhận.                                                                                 |
| Tra cứu hồ sơ            | Danh sách chỉ đọc các lượt có ticket trong ngày chọn, gồm đang chờ, đã bàn giao, đang khám, hoàn tất, hủy và tạm vắng. |

Walk-in được cấp số cho hồ sơ bệnh nhân hiện có; không bắt buộc có yêu cầu online.
Sau xác minh, lượt chuyển TRIAGE_PENDING và rời hàng đợi tiếp nhận, nhưng vẫn có trong Tra cứu.
Đóng phiếu xác minh sau khi xử lý để không tự chuyển phiếu sang bệnh nhân khác khi hàng đợi cập nhật.

## Tra cứu

- Mặc định ngày hiện tại theo Asia/Ho_Chi_Minh; có thể chọn ngày khác.
- GET /api/visits/reception/records, chỉ RECEPTIONIST.
- Query: businessDate (YYYY-MM-DD), search, status, page (từ 1), pageSize (1–100).
- Trả items, total, businessDate, page, pageSize; mặc định 20 dòng mỗi trang.
- Tìm tên, mã bệnh nhân/lượt, CCCD, BHYT, số tiếp nhận/khám; tìm được số cũ đã cấp lại.
- Mỗi lượt một dòng, kể cả có nhiều ticket. Một bệnh nhân có nhiều lượt có thể có nhiều dòng.
- Chi tiết hiển thị hành chính, trạng thái hiện tại, phòng hiện tại, thời điểm tạo/cập nhật và lịch sử ticket.
- Lịch sử ticket ghi trạng thái, số lần gọi và lần gọi gần nhất; chưa phải nhật ký mọi thao tác lâm sàng.
- Yêu cầu chưa cấp số chưa tạo Visit nên chỉ nằm ở Yêu cầu tiếp nhận.

## Kiểm chứng

Integration PostgreSQL kiểm tra duyệt yêu cầu -> hàng đợi -> gọi -> xác minh -> tra cứu;
tìm CCCD/BHYT/số cũ, chống trùng dòng khi cấp lại, ngày, phân trang, trạng thái, phân quyền và query không hợp lệ.
