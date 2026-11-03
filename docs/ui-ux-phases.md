# Các phase cải thiện UI/UX

Quy chuẩn đích: `D:\LOCAL-DESIGN-SYSTEMS\ez-healthcare-design\MASTER.md`.
Không thay đổi API, quyền hoặc thứ tự nghiệp vụ trong các phase UI.

| Phase | Phạm vi                                                                                 | Trạng thái                                               |
| ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P0    | Nội dung chưa lưu, chống gửi lặp, lý do disabled và lỗi tồn tại trên màn hình           | Đã triển khai các form chính; xem phạm vi bên dưới       |
| P1    | Typography, tương phản, vùng bấm, bố cục Doctor trên màn hình nhỏ, điều hướng thông báo | Đã triển khai cho Patient, Receptionist, Nurse và Doctor |
| P2    | Token màu/font/spacing, giảm lặp, mã hồ sơ/ngày giờ                                     | Đã tích hợp theo design system 1.1                       |

## P0: phạm vi đã triển khai

- Patient profile và yêu cầu tiếp nhận: khóa đồng bộ chống gửi lặp, loading, giữ nội dung sau lỗi, lỗi inline và focus trường validation lỗi đầu tiên.
- Yêu cầu tiếp nhận đợi tải dữ liệu trước khi khởi tạo form, không đổi key form khi lần polling sau nhận ID bản nháp.
- Doctor: giữ ghi chép khi đổi bước; giữ instance form chuyển chuyên khoa và kê đơn; cảnh báo trước khi đổi bệnh nhân/phòng/route hoặc đăng xuất; giữ bệnh nhân đang nhập nếu lượt biến mất khỏi queue trong lần polling sau. Snapshot chỉ ở bộ nhớ, không lưu dữ liệu sức khỏe vào browser storage.
- Nurse: cảnh báo nội dung phiếu chưa lưu khi quay về queue/rời trang; khóa gửi đồng bộ; lỗi inline.
- Receptionist: khóa thao tác queue, xác minh và walk-in; lỗi inline; snapshot lượt đang xác minh tránh polling chuyển modal sang bệnh nhân khác; cảnh báo khi đóng phiếu đã sửa; giải thích yêu cầu đối chiếu CCCD/lý do từ chối.
- Doctor giải thích phòng đang bận hoặc không có lượt để gọi tiếp; có thử lại khi queue lỗi.

## Giới hạn cần hiểu

Cảnh báo dùng dialog gốc của trình duyệt, không phải lưu nháp tự động. Tải lại/đóng tab dùng `beforeunload`; trình duyệt có thể giới hạn việc hiển thị dialog. Điều hướng liên kết và các nút chuyển hồ sơ/đăng xuất đã được bảo vệ. Back/Forward cùng document dùng Navigation API nếu trình duyệt hỗ trợ sự kiện có thể hủy; trên trình duyệt không hỗ trợ, đây chưa phải bảo đảm chặn mọi thao tác lịch sử. Không dùng thủ thuật chèn history entry làm sai nút Back.

Thay đổi nội dung rồi khôi phục giá trị ban đầu vẫn có thể được đánh dấu chưa lưu. Sau gửi chỉ định, cảnh báo có thể còn vì phiên khám còn các ghi chép/form khác chưa được lưu đầy đủ. Không hiển thị “Đã lưu toàn bộ” khi chỉ một phần dữ liệu đã gửi.

## Kiểm thử P0

Production build trước, rồi chạy `tests/p0-form-safety.browser.mjs` bằng Node. Cần module Playwright và Chrome; có thể đặt `PLAYWRIGHT_MODULE` thành đường dẫn module có sẵn trong môi trường. Script dùng API fixture riêng và Next production server cổng 3024, không cập nhật database thật. Ảnh kiểm thử ghi vào thư mục tạm `ez-healthcare-p0-preview`.

Các tình huống: hủy rời trang giữ nội dung; bấm lưu liên tiếp chỉ gửi một lần; API lỗi giữ dữ liệu và thử lại; lưu thành công không cảnh báo sai; khóa lưu draft; Doctor hủy chuyển route, đổi bước giữ ghi chép, hủy đổi bệnh nhân. Tiếp tục kiểm tra Nurse intake/phân phòng và Reception request → gọi/xác minh → tra cứu bằng các bộ fixture hồi quy.

## P1: thay đổi

- Chữ chức năng nhỏ hơn 12px được nâng lên tối thiểu 12px; cỡ 13px thành 14px ở các module chính. Patient dùng nền chữ 16px, input mobile 16px. Font asset và toàn bộ token được để cho P2.
- Tăng tương phản chữ phụ, placeholder và biên input. Badge cyan/blue, green, gold/orange, red dùng cặp màu có tương phản rõ; CSS semantic có ưu tiên để không bị preset Ant Design ghi đè.
- Navigation có nền selected; vùng bấm header 44px; nút/filter/input mobile tối thiểu 44px; focus ring và reduced-motion trong phạm vi workspace.
- Doctor dưới 1024px có chuyển vùng Hàng đợi / Hồ sơ. Chỉ ẩn bằng CSS, không unmount Workbench, nên nội dung P0 được giữ. Thống kê thu gọn theo mặc định trên màn hình nhỏ; desktop vẫn hiển thị. Form dùng một cột khi vùng chứa hẹp.
- Thông báo staff dùng Drawer có focus/đóng bằng Escape, nhãn đọc/chưa đọc, thời điểm, khóa gửi và lỗi thử lại. Liên kết Doctor chọn đúng lượt trong queue; Nurse đưa đến lượt liên quan và yêu cầu mở phiếu rõ ràng; Receptionist tra cứu mã lượt và nhắc kiểm tra ngày. Lượt không còn trong queue được báo rõ, không tự mở người khác.
- Patient có loading/khóa đánh dấu đọc, lỗi inline, thời điểm và liên kết khi thông báo thuộc lượt hiện tại.

## Kiểm thử P1

`tests/p1-workspace-ux.browser.mjs` dùng API fixture và Next production server cổng 3025; thiết lập `PLAYWRIGHT_MODULE` tương tự bộ P0. Kiểm tra lỗi/thử lại thông báo, đánh dấu đọc, Escape/keyboard link, lượt không tồn tại, đúng visit từ deep link, giữ ghi chép khi đổi vùng, không tràn ngang ở 320/390/768/1024/1280/1440px, vùng bấm chuyển vùng 44px, input Patient 16px và tương phản một số cặp màu đã render. Ảnh ghi vào thư mục tạm `ez-healthcare-p1-preview`.

Các kiểm tra này không thay thế kiểm định WCAG đầy đủ hoặc kiểm thử screen reader trên mọi trình duyệt. P2 tiếp tục chuẩn hóa nguồn token/font/spacing, thông tin lặp và định dạng mã/ngày giờ.

## P2: chuẩn hóa nền tảng

- Nguồn token trong repo: design-system/tokens.json; sinh app/design-tokens.css và lib/design-tokens.ts. CSS Modules, theme Ant Design và shell dùng nguồn này. Có lệnh design:tokens:check và kiểm tra trong validate.
- Inter variable WOFF2 được lưu kèm giấy phép, nạp qua next/font/local tại root. Heading, body và controls cùng font; không tải từ font CDN khi sử dụng ứng dụng.
- Header/main/footer dùng container 1340px gồm padding; gutter desktop/tablet 24px, mobile 16px; header/footer min-height 80px/56px và tự giãn. Chuẩn hóa màu, spacing, radius, shadow và các cỡ chữ dùng chung.
- Một bộ format ngày/giờ theo Việt Nam, độc lập múi giờ trình duyệt; ngày sinh date-only không bị đổi ngày. Mã UUID có tóm tắt và chi tiết/sao chép đầy đủ; số khám/mã bệnh nhân có ý nghĩa giữ nguyên.
- Doctor còn bốn thống kê chính. Bỏ thẻ phòng/bệnh nhân và tác vụ lặp ở cột phụ; mở rộng vùng hồ sơ khi không có danh sách chờ kết quả. Các hành động nghiệp vụ vẫn nằm trong Workbench.

## Kiểm thử P2

Chạy tests/p2-design-system.browser.mjs sau production build, PLAYWRIGHT_MODULE tương tự P0/P1. Script dùng fixture riêng cổng 3026; kiểm tra font Inter thực tế qua Chrome DevTools, không gọi font ngoài, xem/sao chép UUID, khung và gutter ở 320–1920px, ngày giờ khi giả lập timezone America/Los_Angeles và giảm thông tin trùng. Ảnh ghi vào thư mục tạm ez-healthcare-p2-preview.

Unit tests bổ sung ngày nhuận/ngày không hợp lệ, thời điểm qua ngày/năm theo Việt Nam, giữ nguyên mã số có ý nghĩa, kiểm tra token generated và file font/giấy phép. Vẫn cần review thủ công trên dữ liệu thực và các vai trò ngoài bốn workspace đã rà soát.
