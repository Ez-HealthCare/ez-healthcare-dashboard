# Hành trình Patient — Giai đoạn 2

Ngày cập nhật: 07/11/2026.

## Hành vi giao diện

- Card hướng dẫn và timeline dùng chung một lần tải hồ sơ theo visitId, cập nhật định kỳ bằng cơ chế polling hiện có.
- Khi có đúng một chỉ định đang thực hiện, card hiển thị tên bước, phòng và tầng tương ứng; timeline làm nổi bật bước đó. Khi có nhiều chỉ định song song, hiển thị số lượng và không tự chọn một phòng làm điểm đến tiếp theo.
- WAITING hiển thị Chờ thực hiện; PENDING hiển thị Chưa thực hiện. Chỉ định PENDING không được xem là đã sẵn sàng, vì response hồ sơ chưa chứa quan hệ prerequisite đầy đủ.
- Nhấn tên bước để mở/đóng hướng dẫn. Link Xem bước cần theo dõi mở đúng bước và đưa tới vùng hành trình. Các nút có trạng thái expanded, ID panel ổn định và thao tác bàn phím.
- Tầng/phòng chỉ dùng dữ liệu được API trả về. Thiếu tầng thì không tự điền tầng mặc định.
- Khi các chỉ định CLS đã hoàn tất nhưng trạng thái lượt vẫn PARACLINICAL_PENDING, hiển thị Chờ thông báo quay lại bác sĩ. Chỉ RE_EXAM_CALLING mới hướng dẫn quay lại; bước tái khám được ghi riêng dù cùng phòng với khám ban đầu.
- Bước tái khám chờ nhận được ghi Chờ bác sĩ tiếp nhận; khi bác sĩ đã bắt đầu, hiển thị Đang tái khám. Phân biệt quay lại trong lượt hiện tại với lịch hẹn tái khám ngày khác.
- Vé hết hiệu lực, lượt hủy hoặc kết thúc không có bước điều phối đang được ưu tiên. Nội dung chi tiết giải thích đây là trạng thái được ghi nhận.

Trạng thái tổng quát PARACLINICAL_PENDING trên hành trình được ghi Chưa đủ kết quả CLS, vì nó có thể bao gồm các chỉ định chưa được thực hiện. Trạng thái chi tiết của từng bước cho biết việc đang chờ thực hiện hay đang xử lý.

## Đồng bộ dữ liệu

Chỉ snapshot cùng visitId và cùng trạng thái lượt khám mới được dùng để chọn bước/phòng cần theo dõi. Khi polling CurrentVisit và hồ sơ chưa đồng bộ, hiển thị thông báo đang cập nhật; không dùng snapshot cũ để hướng dẫn di chuyển. Nếu tải lỗi, giữ thông tin đã có và nút thử lại, nhưng không chọn điểm đến theo bước cũ. Chi tiết hoàn tất vẫn là thông tin lịch sử, không được dùng để xác nhận vị trí thực tế của người bệnh.

## Giới hạn dữ liệu

Backend đã trả floor và roomType qua department summary; frontend bổ sung kiểu tương ứng, không đổi API hoặc quyền. Trạng thái IN_PROGRESS chưa tách lấy mẫu, đang thực hiện và chờ trả kết quả. Giao diện vì vậy dùng Đang thực hiện hoặc xử lý, không khẳng định người bệnh đã lấy mẫu hay biết thời gian trả kết quả. Không thêm định vị, bản đồ hoặc thời gian chờ mô phỏng.

## Kiểm chứng

- Unit tests kiểm tra chọn đúng phòng/tầng, pending, bước song song, hoàn tất CLS chưa đủ điều kiện quay lại, bỏ qua, snapshot cũ/sai visitId, tái khám cùng phòng và lượt kết thúc/hết hạn.
- `npm run test:patient-journey` kiểm tra một request hồ sơ dùng chung, panel/bàn phím, phòng/tầng, trạng thái quay lại, guard đồng bộ, lỗi/thử lại và responsive 320–1440px. Dùng Chrome/API fixture, không ghi database thật.
- Chạy `npm run test:patient-ui` để hồi quy 120 mẫu của giai đoạn 1; `node tests/patient-records.browser.mjs` để kiểm tra hồ sơ và đơn thuốc.
- Cần production build trước các browser test; đặt PLAYWRIGHT_MODULE nếu môi trường chưa có module mặc định. Ảnh giai đoạn 2 nằm ở thư mục tạm ez-healthcare-patient-journey, hoặc thư mục do PATIENT_JOURNEY_OUTPUT chỉ định.

Vấn đề format-check toàn repo do 48 file CRLF ngoài phạm vi đã được ghi trong báo cáo giai đoạn 1. Không tạo commit trong giai đoạn này.
