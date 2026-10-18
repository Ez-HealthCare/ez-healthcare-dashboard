# Implementation plan — Dashboard theo role

Cập nhật: 2026-10-17. Tracker triển khai và refactor; tham chiếu từ `todo.md`.

## Delivery hiện tại — A: Bốn workspace theo role (2026-10-17)

User chốt: PATIENT, NURSE (kiêm lễ tân/tiếp nhận), DOCTOR, ADMIN. Admin chỉ quản
trị, không vào workspace lâm sàng. Đợt này chỉ shell/menu/điều hướng/server gate;
không nối API nghiệp vụ, không migration/seed hay mở quyền API lâm sàng.
RECEPTIONIST cũ được điều hướng như NURSE để tương thích tài khoản hiện có; role
chuẩn mới là NURSE. LAB_TECHNICIAN/EMERGENCY_STAFF chưa có workspace, không cấp
quyền ngầm. Backend clinical guards sẽ được đồng bộ khi làm nghiệp vụ, không coi
UI gate là thay thế quyền trên API.

- [x] W1 — Policy/menu bốn workspace dùng chung, kiểm tra server cho từng page,
      điều hướng entry theo danh tính API; giữ refresh/logout.
- [x] W2 — Shell staff teal/lavender theo phong cách hiện có, trang/menu thực,
      placeholder rõ chưa kết nối; giữ dashboard bệnh nhân đã duyệt.
- [x] W3 — Test ma trận role/route và production HTTP/RSC với API fixture, lint,
      type/build/format; ghi riêng giới hạn Docker/seed và visual QA.

Verification: 20/20 unit tests; 4/4 production fixture/browser test groups pass,
không skip. Ma trận 7 identity × 14 page × HTML/RSC = 196 access checks; browser
kiểm tra menu, deep-link/reload, refresh, logout, bàn phím và desktop/mobile.
Lint, TypeScript noEmit, production build, changed-file Prettier và diff check pass.
Đã xem ảnh desktop/mobile staff; shell dùng phong cách teal/lavender hiện có,
chưa đối chiếu pixel-perfect frame Figma điều dưỡng riêng. Fixture không thay thế
JWT/database thật: Docker/seed integration tiếp tục để sau theo lựa chọn user.
Không thay backend clinical guards; cần đồng bộ trước khi nối nghiệp vụ.

## Delivery trước — Backend ApiConfigService (2026-10-17)

Goal: service/backend consumer không đọc env trực tiếp; inject `ApiConfigService`
để lấy config typed và đã validate. TypeORM CLI dùng cùng service ngoài Nest DI,
chỉ đọc/validate database để migration không phụ thuộc JWT hay email.

- [x] E1 — Rà caller/env và cấu hình Nest hiện có, giữ các default và auth behavior.
- [x] E2 — Tạo global config module/service, chuyển auth/JWT/OTP/cookie, visit,
      bootstrap và hai đường database sang config chung.
- [x] E3 — Thêm test parser/default/validation/DI và chặn env access rải rác.
- [x] E4 — Regression cục bộ, lint/type/build/format và cập nhật tài liệu.

Verification: backend 205/205 tests (9 suites), lint, full TypeScript noEmit,
production build, changed-file formatting và git diff whitespace check pass.
Test dùng AuthModule/JWT/AuthController thật với repository giả, kiểm tra config
DI/cookie clear Secure; parser/default/invalid env, OTP sender/header, config
startup fail-fast và lint boundary. Compiled CLI data-source smoke pass với
NODE_ENV=production/JWT yếu: DB_PORT/flags đúng kiểu, không mở DB connection.
Không có process.env trong runtime src; Nest ConfigService/dotenv chỉ ở src/config.
README backend có hướng dẫn inject/getter/CLI; giữ default legacy signature key
để tương thích, yêu cầu cấu hình SIGNATURE_SECRET riêng khi triển khai.

Không thêm dependency, không sửa `.env` thật, không chạy migration/seed trong
đợt kiểm tra local. Docker regression tiếp tục để sau theo lựa chọn người dùng.

## Delivery trước — Tập trung constants frontend/backend (2026-10-17)

Goal: constant dùng lại có nguồn định nghĩa rõ ràng trong `lib/constants/` (web)
và `src/common/constants/` (API), chia theo domain; consumer chỉ import.
Giữ nguyên giá trị, auth/security, UI và nghiệp vụ; không tạo shared package mới.

- [x] C1 — Rà constant và caller ở cả hai repo; phân biệt constant với state/config runtime.
- [x] C2 — Tách auth/API/routes/menu/theme/catalog/dữ liệu mẫu ở frontend.
- [x] C3 — Tách auth/OTP/rate limit, clinical/visit và seed data ở backend.
- [x] C4 — Chạy local regression/lint/type/build hai repo và ghi kết quả.

Kết quả local: web 18/18 tests, API 194/194 tests (8 suites); lint và production
build hai repo pass, web TypeScript noEmit pass. Prettier trên các file thay đổi
và git diff whitespace check pass. Test mới kiểm tra contract cookie/OTP/tab,
token generator/validator, seed references, và consumer backend thật (allergy,
triage fallback/tuổi ưu tiên, DAG ultrasound/urinalysis, radiation và emergency).
Giữ nguyên các giá trị và hành vi; không thêm dependency. README có bản đồ module.

Không gom secret/env vào bundle client; không sửa migration hoặc biến cục bộ
phụ thuộc request. Docker seeded/browser regression vẫn chờ engine hoạt động (A6).

## Delivery trước — Refactor API và logic component (2026-10-17)

Goal: một module Axios duy nhất; UI không gọi HTTP/service trực tiếp. Hook quản
lý auth/login/session và state bất đồng bộ; service sở hữu endpoint, chuyển đổi
dữ liệu và lỗi. Server page gọi server loader, không dùng client hook để bỏ SSR.
Cookie luôn theo từng request, không gán cookie vào Axios defaults dùng chung.

- [x] A1 — Rà soát toàn bộ HTTP và component; đọc hướng dẫn Next/Axios, chốt ranh giới.
- [x] A2 — Axios tập trung, auth service typed, server proxy/session service; bỏ fetch
      trong runtime, giữ allowlist/origin check, cookie rotation và token stripping.
- [x] A3 — Tách login, AuthGate, logout và session recovery sang custom hooks; tách
      report export khỏi page; chuyển file chỉ chứa type ra khỏi thư mục hooks.
- [x] A4 — ESLint chặn fetch/axios rải rác và component import HTTP/service; test
      transport timeout/errors/cookies/concurrency và kiến trúc bằng Node có sẵn.
- [x] A5 — Hoàn tất kiểm tra cục bộ (unit, lint, TypeScript, production build,
      formatting/diff); cập nhật README/todo và kết quả thực tế.
- [ ] A6 — Rerun Docker seed, 13 integration test và browser 7 role/patient
      desktop/mobile/RSC khi engine hoạt động; người dùng đã đồng ý để sau.

  Local verification: 16/16 tests pass (6 HTTP transport/identity, 7 auth service
  và proxy với API fixture, 3 lint-boundary). Lint, TypeScript và production build
  pass. Không có fetch trong runtime, chỉ một Axios import/create; component không
  gọi service/HTTP. Đã rà component bác sĩ: chỉ nhận props và render, không có API
  request; render map/format và state thuần UI giữ nguyên.

  Docker regression chưa chạy lại: Linux engine trả HTTP 500. Người dùng đã chọn
  hoàn tất kiểm tra cục bộ trước. Không ghi 13 integration/7 role UI cũ thành kết
  quả của đợt refactor này; cần rerun khi engine hoạt động.

Không đổi UI/role/nghiệp vụ. State thuần UI (modal, menu, tab) và render map/format
đơn giản giữ ở component; không tạo hook giả cho fixture hay mỗi phép hiển thị.
Test Mailpit và Docker healthcheck dùng native HTTP độc lập để không kiểm thử
ứng dụng bằng chính transport đang được refactor; không thuộc runtime frontend.

## Goal và quyết định đã chốt

Sau đăng nhập, xác thực JWT/session qua API rồi điều hướng tới dashboard đúng role.
Chỉ hiện menu của role và chặn URL của workspace khác ngay ở server. Không tin
role từ query string, localStorage hoặc JWT chưa xác thực. Giữ cookie HttpOnly,
refresh rotation và logout hiện có; không thêm thư viện RBAC.

| Role    | Đường dẫn            | Menu                                                      |
| ------- | -------------------- | --------------------------------------------------------- |
| PATIENT | `/dashboard/patient` | Trang chủ · Lượt khám của tôi · Hồ sơ khám bệnh           |
| NURSE   | `/dashboard/nurse`   | Bàn làm việc · Tiếp nhận · Sàng lọc                       |
| DOCTOR  | `/dashboard/doctor`  | Bàn làm việc · Hàng đợi khám · Bàn khám                   |
| ADMIN   | `/dashboard/admin`   | Tổng quan · Tài khoản · Khoa/Phòng · Lịch trực · Cấu hình |

Admin không được vào workspace lâm sàng của role khác. RECEPTIONIST cũ vào cùng
workspace NURSE; chỉ LAB_TECHNICIAN/EMERGENCY_STAFF chưa có workspace và đăng xuất.
Không có menu bác sĩ “Hồ sơ bệnh nhân” riêng: hồ sơ thuộc ngữ cảnh bệnh nhân đang khám.

Phạm vi đợt này: shell, menu, điều hướng, kiểm tra quyền và trạng thái chưa triển
khai. Chưa nối dữ liệu lâm sàng, chưa lưu form hoặc gọi bệnh nhân thật; không dùng
số liệu minh họa như thể dữ liệu thật. Nghiệp vụ và sửa full clinical seed để sau.

## Trạng thái ban đầu

### Delivery hiện tại: dashboard bệnh nhân từ ảnh người dùng

Người dùng đã cung cấp ảnh Figma trực tiếp và yêu cầu dựng dashboard bệnh nhân
theo ảnh, thay cho việc chờ MCP. Đây là nguồn thiết kế được phép dùng cho delivery
này. Không mở rộng sang điều dưỡng/bác sĩ/admin trong cùng delivery.

- [x] P1 — Dashboard bệnh nhân: header ngang, welcome/BHYT, lượt khám, 3 card
      việc cần làm/lịch hẹn/hồ sơ, thông báo/hỗ trợ, footer; responsive.
- [x] P2 — Route bệnh nhân riêng, login entry dẫn đúng trang, server kiểm tra
      role PATIENT; giữ refresh/logout và không ảnh hưởng dashboard staff hiện có.
- [x] P3 — Menu hoạt động; trang nghiệp vụ chưa làm và modal nói rõ chưa nối API.
      Tên/email là danh tính thật; dữ liệu lâm sàng mẫu được gắn nhãn minh họa.
- [x] P4 — Docker build, lint/types, auth regression và browser desktop/mobile;
      ảnh chụp kết quả và so sánh ảnh tham chiếu; cập nhật todo/README.

Các task R2–R7 bên dưới vẫn là kế hoạch tổng thể; chỉ đánh dấu phần thực sự làm.

- Baseline trước A: auth thật đã hoạt động cho 7 role; staff vào analytics prototype chung.
- API `/auth/me` xác thực chữ ký JWT, session và tài khoản đang hoạt động rồi trả role.
- Figma: bệnh nhân `1:179`, điều dưỡng `43:2`; bác sĩ/admin dùng phong cách chung
  theo quyết định của người dùng, không có frame riêng đã xác định.
- Figma MCP báo hết quota Starter. User đã thay nguồn bằng ảnh đính kèm cho màn
  bệnh nhân; các màn chưa có thiết kế được phép dùng vẫn chưa triển khai.

## Task theo thứ tự

- [x] R1 — Ghi plan, scope, ma trận role/menu, giới hạn và tiêu chí nghiệm thu.
- [x] R2 — Một danh sách route/menu dùng chung; login và `/dashboard` dẫn về đúng
      workspace; deny-by-default cho role hoặc route không hợp lệ.
- [x] R3 — Xác thực server tại từng page trước khi trả nội dung; chặn nhập URL sai
      role, kể cả ADMIN; giữ khả năng refresh khi access token hết hạn.
- [x] R4 — Nối menu hiện có vào route thật theo role; mỗi trang có tiêu đề và nhãn
      chưa triển khai, không nút lưu giả; unsupported role có logout, không quyền ngầm.
- [-] R5 — Dựng shell Figma (header ngang, teal, nền lavender, card trắng), trang
  bệnh nhân và bàn làm việc điều dưỡng/bác sĩ; admin cùng phong cách.
  - Bệnh nhân đã dựng và đối chiếu ảnh đính kèm. Staff đã có shell cùng phong cách,
    đã xem ảnh desktop/mobile; chưa đối chiếu được frame Figma riêng của điều dưỡng.
- [-] R6 — Docker seeded auth stack; kiểm tra 4 role chính, RECEPTIONIST alias và 2 role unsupported,
  toàn bộ menu, URL sai role, JWT giả/hết hạn, refresh, logout, mobile/keyboard.
  Chạy lint, TypeScript, production build và auth regression.
- [x] R7 — Cập nhật README, todo và bằng chứng test; bàn giao rõ việc hoàn thành,
      phần còn chờ Figma và nghiệp vụ chưa làm.

## Definition of Done

1. Không chỉ ẩn menu: request trực tiếp/RSC phải qua xác thực server; sai role
   không được nhận nội dung workspace đích.
2. Role được lấy từ danh tính API xác thực JWT; không lộ token ra browser JS.
3. Link menu tồn tại, active state đúng, refresh/logout không hồi sinh dữ liệu cũ.
4. Các trang chưa nối API ghi rõ trạng thái, không bịa số ca khám/bệnh nhân.
5. Test chạy được với Docker và seed; lint/types/build pass, ghi kết quả thực tế.
6. R5 chỉ hoàn tất khi có dữ liệu thiết kế được phép dùng và đã đối chiếu UI.

## Verification log

- 2026-10-15: Docker production build và TypeScript pass; lint pass; Prettier
  cho file thay đổi và `git diff --check` pass. Không thêm dependency.
- 2026-10-15: `npm run test:auth` pass 13/13 với PostgreSQL/API/Mailpit seed thật.
- 2026-10-15: `tests/patient-browser.mjs` pass: seed David OTP, danh tính thật,
  3 menu, preview modal, read-all, refresh giữ deep link, logout, 1280/768/375,
  keyboard skip link, 6 staff role bị chặn (bao gồm request RSC), JWT giả bị từ chối.
- 2026-10-15: Đã xem ảnh desktop/mobile trong `test-results/` và đối chiếu bố cục
  ảnh người dùng. Chưa có cơ sở tuyên bố pixel-perfect do chỉ có ảnh, không token gốc.
- 2026-10-15: Auth UI regression pass cả 7 role, desktop/mobile, sai mật khẩu,
  offline, sai OTP, refresh và logout. Lần đầu timeout vì AntD loading icon làm
  đổi accessible name; đã thêm aria-label cố định cho nút submit, chạy lại pass.
- 2026-10-15: Docker dashboard đang chạy tại localhost:3001; API và PostgreSQL
  healthy, Mailpit tại localhost:8025. Delivery bệnh nhân P1–P4 hoàn tất; R2–R7
  chưa hoàn tất cho các role còn lại. Ảnh kết quả ở `test-results/` (Git ignored).
