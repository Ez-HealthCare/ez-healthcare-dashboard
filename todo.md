# Ez-HealthCare Dashboard — Source of Truth

Last updated: 2026-10-18

This file is the canonical implementation plan and status tracker for `dashboard/`.
Read it before making changes and update it in the same change that completes or
changes a task. Do not mark work complete without the evidence listed under
Definition of Done.

## Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete and verified
- `[!]` Blocked — add the blocker immediately below the task

## Product scope

### Current delivery — Phase B: Tiếp nhận và hàng đợi khám thật

Goal: hoàn thiện một luồng dùng API/database thật, từ bệnh nhân tự lấy số tiếp
nhận đến điều dưỡng/lễ tân ghi thông tin bệnh, phân phòng và bác sĩ tiếp nhận khám.
Dashboard bệnh nhân phản ánh đúng số và giai đoạn hiện tại, không dùng dữ liệu mẫu
để thay thế kết quả API.

Current status: **B1 đã hoàn tất rà contract và chốt quyết định; B2–B9 chưa bắt đầu.**
Phase A đã hoàn tất shell/menu/server workspace gate. Các trang nghiệp vụ staff
vẫn là placeholder; dashboard bệnh nhân vẫn có dữ liệu lâm sàng minh họa.
Quyền API lâm sàng, cấp số an toàn, clinical seed và seeded regression mới nhất
còn cần xử lý. Lần cập nhật này chỉ thay tài liệu; chưa sửa runtime, migration,
seed hay database.

#### Quyết định đã được người dùng xác nhận

1. Bốn role: PATIENT, NURSE (gộp điều dưỡng/lễ tân), DOCTOR, ADMIN. Admin chỉ quản
   trị; RECEPTIONIST cũ vẫn là alias tương thích đã ghi ở Phase A.
2. Bệnh nhân chủ động lấy **số tiếp nhận**, không tự cấp số khi chỉ đăng nhập.
3. Tạm thời bệnh nhân **không tự khai triệu chứng**. Điều dưỡng/lễ tân ghi và cập
   nhật thông tin bệnh lên hệ thống khi tiếp nhận.
4. Sau tiếp nhận, điều dưỡng/lễ tân phân phòng; bệnh nhân chuyển sang theo dõi
   **số khám tại phòng được phân**. UI phải phân biệt số tiếp nhận và số khám.
5. Dãy **số khám chạy riêng theo từng phòng**, không dùng một dãy chung theo khoa.
6. Khi chủ động bốc lại, số mới bằng **số mới nhất đã cấp + 1** trong đúng dãy số
   của ngày đó; không tính từ số cũ của bệnh nhân. Ví dụ số cũ 015, mới nhất 028
   thì số cấp lại là 029.
7. Sau khi đã phân phòng, bệnh nhân **không được tự bốc lại số**; phải nhờ điều
   dưỡng/lễ tân xử lý. Phải chặn ở API, không chỉ ẩn nút trên giao diện.
8. Cả số tiếp nhận và số khám **bắt đầu lại mỗi ngày**. Giữ lịch sử theo ngày và
   phòng; bắt đầu dãy số ngày mới không đồng nghĩa xóa dữ liệu ngày cũ.
9. Hiển thị thông báo sau khi cấp số, bốc lại và chuyển sang số khám/phòng mới.
   Khi thao tác làm mất vị trí chờ cũ, phải cảnh báo trước khi người dùng xác nhận.
10. Intake theo chuẩn sàng lọc: bắt buộc lý do khám và sáu trường sinh hiệu gồm
    huyết áp tâm thu/tâm trương, mạch, nhiệt độ, SpO2 và nhịp thở. Onset, duration,
    severity, dị ứng, cân nặng, chiều cao và ghi chú là tùy chọn. Điều dưỡng/lễ tân
    được sửa đến trước khi bác sĩ tiếp nhận; sau `IN_EXAMINATION` dữ liệu bị khóa.
11. Số tiếp nhận dùng một dãy chung toàn cơ sở. Mỗi `Department` loại phòng khám
    đại diện một phòng vật lý và có dãy số khám riêng; Phase B chưa tạo entity
    `Room` song song.
12. Ngày nghiệp vụ dùng `Asia/Ho_Chi_Minh`. Giờ phát số lấy từ cấu hình cơ sở;
    seed demo dùng ca sáng 07:00–11:30 và chiều 13:00–16:30. Không phát số lúc nghỉ
    trưa nhưng giữ lượt sáng sang chiều; sau 16:30 lượt chờ hết hiệu lực và nhân
    viên cấp lại vào ngày kế tiếp. Dãy số vẫn reset theo ngày, không reset theo ca.
13. Cấp lại giữ nguyên `Visit`; số cũ mất hiệu lực nhưng còn trong lịch sử. Bệnh
    nhân chỉ tự cấp lại số sảnh tối đa một lần khi còn `HALL_WAITING`. NURSE hoặc
    alias RECEPTIONIST được cấp lại có lý do trước khi bác sĩ tiếp nhận; số mới là
    số lớn nhất từng cấp trong đúng dãy/ngày + 1. Sau `IN_EXAMINATION` phải chặn.
14. Bác sĩ chỉ xem/gọi phòng được phân trong `DoctorSchedule` theo ngày/ca. Hàng
    đợi xếp nhóm ưu tiên trước, sau đó FIFO. Ba lần gọi không có mặt chuyển sang
    tạm vắng; staff đưa lại cuối hàng bằng cùng số và thời điểm xếp lại, còn cấp
    số mới là thao tác cấp lại riêng.
15. Ưu tiên kết hợp quy tắc tuổi/chính sách cấu hình được với đánh dấu lâm sàng
    của điều dưỡng có lý do và audit. Red flag chuyển sang luồng cấp cứu, không
    tiếp tục nằm trong hàng đợi thường.
16. Thông báo lưu trong PostgreSQL theo tài khoản, có read/unread và được frontend
    polling khi trang visible, đồng thời tải lại sau reload/mutation. Bệnh nhân nhận
    thay đổi của lượt; bác sĩ liên quan nhận sự kiện xếp/chuyển/gọi lại của phòng;
    điều dưỡng theo dõi hàng đợi chung. Không thêm SMS, email hoặc WebSocket.

Luồng đã chốt:

`Bệnh nhân lấy số tiếp nhận → Điều dưỡng/lễ tân tiếp nhận và ghi thông tin bệnh → Phân phòng, cấp số khám → Chờ tại phòng tương ứng → Bác sĩ tiếp nhận khám`.

#### B1 — Contract baseline đã chốt

- Tái dùng `Visit`, `VisitVital`, `Department`, `DoctorSchedule`, audit, role guard,
  state machine và TypeORM transaction; không dựng domain tiếp nhận/hàng đợi song
  song. Luồng chính đi từ `HALL_WAITING` qua `RECEPTION_VERIFIED`, `TRIAGE_PENDING`,
  `CLINIC_WAITING`, `CLINIC_CALLED` đến `IN_EXAMINATION`; bổ sung
  `TEMPORARILY_ABSENT` và giữ các nhánh `CANCELLED`/`EMERGENCY_DISPATCHED`.
- API hiện tại chưa đúng policy Phase B: hall ticket còn anonymous và nhận
  `patientId`/triệu chứng; NURSE chưa được verify/assign; ADMIN có mutation lâm
  sàng; queue bác sĩ chưa kiểm tra lịch phòng; patient route thiếu ownership check;
  chưa có current visit, cấp lại, tạm vắng hoặc notification API.
- Cách tính `count + 1`/`currentOccupancy + 1` hiện tại không bảo đảm cấp theo
  `max(sequence) + 1`, có thể tái sử dụng số sau chuyển phòng và chưa có unique
  constraint hay idempotency key. B3 phải cấp số nguyên tử tại database và lưu
  lịch sử ticket.
- Contract triển khai tối thiểu gồm: patient hall-ticket/current-visit; reception
  queue/verify/intake/assign; reissue; room queue/call/start-exam/requeue; và
  notification list/read. Mutation cấp hoặc cấp lại số phải dùng idempotency key.
- Frontend tiếp tục dùng Axios transport, service/custom hook, server loader và
  HttpOnly-cookie proxy hiện có. Staff placeholder và patient demo data phải được
  thay bằng kết quả API; không đưa HTTP hoặc tính số vào component.
- Clinical migration hiện có các cặp cột camelCase/snake_case không đồng nhất,
  thấy rõ ở `triage_rules.targetDepartmentId`/`target_department_id` và cả các bảng
  clinical liên quan. B7 dùng forward migration bảo toàn dữ liệu, không sửa/xóa
  volume hiện có và không chỉ vá seed để né schema lỗi.
- Test `VisitService` hiện dùng mock service thay vì implementation thật. B2/B3
  phải bổ sung test service/API thật với PostgreSQL cô lập trước khi dựa vào kết
  quả regression Phase B.

#### Tasks Phase B — triển khai và xác minh

**B1 đã hoàn tất; B2–B9 chưa bắt đầu.** Mỗi task phải ghi kết quả thực tế và bằng
chứng trước khi chuyển sang `[x]`; ghi nhận quyết định không đồng nghĩa đã triển
khai chức năng.

- [x] **B1 — Rà contract và chốt phần còn mở.** Goal: đối chiếu API, entity,
      state machine, guard, seed và use case hiện có; lập ma trận endpoint/quyền/
      trạng thái cho luồng đã chốt. Hỏi lại các chi tiết mở phía trên trước khi
      code phần phụ thuộc; tái dùng cấu trúc hiện có, không dựng nghiệp vụ song song.
      Evidence: đã rà source dashboard/API, use case, entity, state machine, guard,
      migration, seed và test; người dùng đã chốt D1–D12 bằng popup. Contract,
      mismatch và hướng triển khai được ghi ngay phía trên. Đây là thay đổi tài
      liệu; chưa chạy runtime test hoặc coi B2–B9 là đã triển khai.
- [ ] **B2 — Đồng bộ quyền API và phạm vi dữ liệu.** Goal: PATIENT chỉ thao tác/xem
      lượt của mình; NURSE và alias RECEPTIONIST tiếp nhận, cập nhật và cấp lại theo
      contract; DOCTOR chỉ truy cập phạm vi phòng đã chốt; ADMIN không có quyền
      lâm sàng ngầm. Verify bằng request trực tiếp, sai role, đổi patient/visit/room
      ID và trạng thái không hợp lệ; giữ auth/refresh/logout hiện có.
- [ ] **B3 — Cấp số và chuyển trạng thái an toàn ở backend.** Goal: cấp số tiếp
      nhận và số khám theo phòng/ngày, reset dãy theo ngày mà giữ lịch sử; chuyển
      phòng/cấp lại theo B1. Server/database chịu trách nhiệm cấp số nguyên tử,
      không trùng khi đồng thời; retry/double-click không được vô tình trở thành
      yêu cầu bốc lại. Lưu được dấu vết cấp lại/thay đổi liên quan; không tính số ở UI.
- [ ] **B4 — Bệnh nhân lấy và theo dõi số thật.** Goal: nối API cho lấy số, hiển
      thị trạng thái/số tiếp nhận hoặc số khám đúng phòng và ngày, cùng thông báo
      cấp số/cấp lại/phân phòng. Không có form tự khai triệu chứng; không cho tự
      cấp lại sau phân phòng. Reload khôi phục đúng dữ liệu; có loading/empty/error,
      xác nhận thao tác và chống submit trùng. Không fallback sang số minh họa.
- [ ] **B5 — Điều dưỡng/lễ tân tiếp nhận và phân phòng.** Goal: hàng đợi tiếp nhận,
      tìm/xác minh bệnh nhân, ghi/cập nhật thông tin bệnh đã chốt, chọn phòng và
      cấp số khám; xử lý cấp lại sau phân phòng. Verify lưu dữ liệu thật, validation,
      quyền sửa, chuyển trạng thái, lỗi xung đột và thông báo cho bệnh nhân; không
      tạo trùng lượt chỉ vì reload hoặc retry.
- [ ] **B6 — Bác sĩ xem hàng đợi và tiếp nhận khám.** Goal: hiển thị hàng đợi phòng
      trong phạm vi được phép, mở lượt khám và thông tin điều dưỡng đã ghi, tiếp
      nhận khám theo state machine đã chốt. Hồ sơ nằm trong ngữ cảnh lượt khám;
      không thêm menu hồ sơ bệnh nhân toàn hệ thống. Chưa kê đơn/chỉ định/thanh toán.
- [ ] **B7 — Docker và clinical seed phục vụ demo.** Goal: rà/sửa lỗi schema seed
      `triage_rules.targetDepartmentId` / `target_department_id`, chuẩn bị catalog/
      phòng/phân công/tài khoản tối thiểu để chạy luồng thật. Migration/seed phải
      tái lập được trong database test cô lập; không xóa volume hoặc seed đè dữ
      liệu hiện có khi chưa được phép. Không coi auth-only seed là đủ cho Phase B.
- [ ] **B8 — Regression và demo end-to-end.** Goal: chạy Docker với seed thật;
      verify PATIENT lấy số → NURSE nhập thông tin/phân phòng → DOCTOR nhận khám →
      PATIENT thấy trạng thái mới. Kiểm tra cấp đồng thời, retry, bốc lại sau các
      trạng thái, hai phòng có dãy độc lập, ranh giới ngày và giữ lịch sử; kiểm tra
      phân quyền API/UI, refresh/logout, desktop/mobile và bàn phím. Lint, types,
      unit/integration/browser, formatting và production build hai repo phải pass;
      ghi rõ test đã chạy, chưa chạy và lỗi còn lại, không dùng fixture thay DB thật.
- [ ] **B9 — Rà rủi ro dependency và chốt bàn giao.** Goal: phân loại 9 advisory
      đã ghi nhận (8 high, 1 critical), đề xuất bản sửa tương thích và kiểm thử lại
      phần nâng cấp được duyệt; không chạy `audit fix --force` hoặc tự nâng major.
      Cập nhật README, route/API contract, tài khoản seed, scenario demo và bằng
      chứng ở file này. Ghi rõ rủi ro còn lại; không tuyên bố production-ready khi
      chưa đánh giá/xử lý các vấn đề bảo mật và tiêu chí phát hành.

Thứ tự: B1 → B2/B3 → B4/B5/B6; chuẩn bị B7 trước kiểm thử dữ liệu thật B8;
B9 theo dõi rủi ro từ đầu và chốt bàn giao sau regression. Đây là thứ tự công
việc, không phải yêu cầu giao cho nhiều agent.

#### Tiêu chí nghiệm thu và giới hạn

- Demo được luồng trên bằng các tài khoản khác nhau và dữ liệu PostgreSQL thật;
  thông tin điều dưỡng lưu xuất hiện đúng trên bàn khám, số/trạng thái bệnh nhân
  vẫn đúng sau reload. Không có phiếu giả hoặc thông báo thành công khi API thất bại.
- Số cấp lại tuân theo dãy mới nhất, đúng phòng/ngày; không tự cấp lại sau phân
  phòng; truy cập trái quyền bị chặn trên API. Thông báo thể hiện đúng kết quả đã lưu.
- UI giữ phong cách Figma/Phase A, phân biệt hai loại số, có trạng thái lỗi và dùng
  được bằng bàn phím/mobile. Không bịa kết quả đối chiếu Figma chưa truy cập được.
- Chưa làm: bệnh nhân tự khai triệu chứng, khám hoàn tất đầy đủ, kê đơn, xét
  nghiệm/chẩn đoán hình ảnh, thanh toán, bệnh án đầy đủ, toàn bộ CRUD admin,
  printable/QR ticket và realtime/WebSocket nếu chưa được bổ sung phạm vi.
- Tiếp tục dùng một Axios transport, service/custom hook và server loader hiện
  có; constants/config theo domain và ApiConfigService. Không đưa HTTP hoặc xử lý
  nghiệp vụ vào component; không thêm dependency/abstraction chỉ để dự phòng.

Phase B được theo dõi trực tiếp tại đây. `IMPLEMENTATION_PLAN.md` hiện là bằng
chứng/kế hoạch Phase A và các delivery trước, không ghi đè các quyết định Phase B.

### Maintenance — Partner startup handoff (2026-10-18)

Partner instructions are in `README.md` → "Partner quick start (PowerShell)"
and the API README. They cover sibling repos on `repair`, private env templates,
all-Docker demo versus local FE/BE, a fresh isolated database's migration/auth-only
seed, daily startup/shutdown and existing-database safeguards. FE defaults to
3001, BE to 3000. Migration effects are local to each DB, not transferred by Git.

Verification for this handoff: frontend 21/21 unit tests, backend 205/205 tests,
and the documented compiled TypeORM `migration:show` command pass. On the current
local DB it confirms initial/auth migrations applied and NEWS2/audit still pending;
no additional migration, seed, server restart or credential disclosure in this
handoff. This does not mark Phase B implementation/B9 complete.

### Maintenance — Local auth schema migration (2026-10-18)

Goal: fix patient OTP failure on the existing local database without resetting
or reseeding data. User explicitly approved applying the missing auth migration.

- [x] Verify `tlcn_api_db.public`: OTP column was varchar(10), `auth_sessions`
      absent, and only the initial clinical migration recorded.
- [x] Apply only existing `AddAuthSessions1792050000000` through TypeORM in one
      transaction. OTP hash/session token columns are varchar(64); old OTPs are
      invalidated. User/visit counts remain 25/14. No database reset or seed.
- [x] Verify the actual frontend browser flow with the existing patient David:
      request OTP 200, fresh Mailpit message, matching SHA-256 hash stored, verify
      OTP 200, patient dashboard, recovery after clearing the access cookie,
      logout 200 and session 401 after logout. Only the isolated test session was
      logged out; the user's running servers were left untouched.

Screenshot: ignored `test-results/local-patient-after-auth-migration.png`.
The test OTP is consumed; request a fresh code for manual login and respect the
60-second resend limit. `AddNews2AndAuditLog1791440000000` remains unapplied:
it is not needed for this auth fix and was not included in the approved change.
This is a targeted local auth verification, not Phase B clinical migration work
or a full all-role/seeded regression. No auth/UI runtime source was changed.

### Maintenance — Local startup, ports and env (2026-10-18)

Goal: leave project servers stopped and make plain npm commands start frontend
on 3001 and backend on 3000 without manually setting PowerShell env variables.

- [x] Stop only verified project processes/containers; preserve all DB volumes.
- [x] Set frontend `dev`/`start` defaults to 3001; keep Docker internal port 3000
      explicitly mapped to host 3001. Add backend `dev` alias, reuse its existing
      ESM loader for start variants, and retain `PORT=3000` via ApiConfigService.
- [x] Configure local frontend `.env` and backend `.env`, preserve existing DB/JWT
      credentials, remove the obsolete frontend public API override, and provide
      a tracked `.env.example`. Compose DB/JWT/signature credentials now use env
      interpolation; auth integration tests read the same env, not a hard-coded key.
- [x] Verify startup, shutdown, unit/lint, formatting and Compose configuration;
      document separate local/Compose DBs and how to avoid duplicate listeners.

Evidence: FE `npm run dev`/`npm start` on 3001 and BE `npm run dev`/`npm run
start:prod` on 3000 return HTTP 200; API Swagger 200 and unauthenticated BFF `/me` 401. FE unit tests 21/21 and lint pass. BE watch compilation reports zero errors.
Compose `config --quiet` passes; Docker's internal-port/credential contract has a
unit regression check. No migration/seed or credential rotation was performed.
Testing required execution outside the agent sandbox to write existing `.next`
and backend `dist`; these were sandbox EPERM errors, not extra runtime changes.
All project app/DB/Mailpit servers are stopped again after smoke tests; users must
start their configured DB/Mailpit before the local API. `.env` files and
`opencode.json` stay ignored; only placeholder `.env.example` is shareable.
This maintenance does not implement Phase B or count as its seeded regression.

### Maintenance — Docker frontend dependency lock (2026-10-18)

- [x] Fix clean Linux `npm ci` failure: missing `@emnapi/core` and
      `@emnapi/runtime` 1.11.3. Generate the lockfile using npm in an isolated
      `node:24-alpine` container; keep existing package versions and dependencies.
- [x] Verify Docker clean install/production build and rerun frontend unit tests.

Windows npm 11.6.2 reported no changes; Linux npm 11.19.1 added the missing
resolution entries and normalized peer metadata. No runtime source changes.
Docker `npm ci`, Next.js production compile/TypeScript/page generation and 20/20
frontend unit tests pass. The local dashboard stays running, not replaced by Docker.
Install audit reports 9 advisories (8 high, 1 critical); remediation remains a
separate upgrade task. No `npm audit fix --force` or package version upgrade.

### Completed delivery — Phase A: Four role workspaces

Confirmed scope: PATIENT, NURSE (reception + screening), DOCTOR, ADMIN. Admin is
management-only in the UI. No clinical mutations/data integration in delivery A.
RECEPTIONIST remains an explicit legacy alias of NURSE for workspace entry only;
LAB_TECHNICIAN/EMERGENCY_STAFF are unsupported, with logout and no workspace access.
One policy table owns menus and the server section allowlist. Every page and the
entry verify live API identity; cross-workspace requests are denied, including RSC.
W1–W3 complete: 20/20 unit tests and 4/4 production fixture/browser test groups
pass, including 196 HTML/RSC access checks and seven browser identities. Lint,
TypeScript, production build, changed-file formatting and diff checks pass.
Staff desktop/mobile screenshots were inspected; separate nurse Figma-frame
pixel matching is not claimed. Backend clinical permissions have NOT been changed:
align them before connecting real workflows. Fixture tests do not replace real
JWT/database integration; Docker/seed reruns remain deferred.

### Previous delivery — Backend ApiConfigService (2026-10-17)

Goal: one typed/validated configuration service for backend consumers; no direct
env access in business services. See implementation-plan tasks E1–E4.
`../api/src/config/` owns env loading/parsing/validation; auth/JWT/OTP/cookies,
visit signatures, bootstrap and database consume `ApiConfigService`. CLI/seed
uses the same database reader outside Nest without needing JWT/mail settings.
Complete and locally verified: backend 205/205 tests (9 suites), lint, full noEmit
TypeScript, production build, formatting/diff checks and compiled CLI config smoke
(production mode, no database connection). Runtime env access is confined to the
config boundary; business consumers only inject/use ApiConfigService.
No new dependency, real `.env` edit, migration or database seed. Docker reruns
remain deferred under A6 by user direction.

### Previous delivery — Shared constants cleanup (2026-10-17)

Goal: define reusable constants once per application and import them in consumers.
See implementation-plan tasks C1–C4. Frontend: `lib/constants/`; backend:
`../api/src/common/constants/`, grouped by domain, with no shared-package dependency.
Auth/API configuration, navigation, theme/catalog/chart/report data, clinical
department codes, visit tables and seed fixtures are extracted. Runtime env/secrets,
request state, JSX/CSS presentation and historical migrations are not centralized.
Current status: complete and locally verified. Web 18/18 tests; API 194/194 tests
(8 suites). Both repos pass lint/build and changed-file formatting; web noEmit
TypeScript and diff whitespace checks pass. No dependency or business-rule changes.
Docker seed/browser verification remains deferred under A6 by user direction.

### Previous delivery — API/component refactor (2026-10-17)

See implementation-plan tasks A1–A6. Centralize Axios, move requests/data handling
to services, move client async orchestration to custom hooks, preserve server-side
authorization and existing UI. Pure presentation state remains in components.
Local checks are the active verification scope per user direction; Docker engine
returns HTTP 500, so seeded integration/browser reruns remain explicitly pending.

### Previous patient UI delivery — Role dashboards (2026-10-15)

Previously delivered slice: build the patient dashboard from the directly
attached Figma screenshot. See the patient delivery checklist in
`IMPLEMENTATION_PLAN.md`. Patient identity is real; clinical demo cards are
explicitly labelled and no clinical mutations are implemented. Delivery A above
adds role-specific staff navigation shells, not connected business workspaces.

See Phase B above for active tasks and confirmed decisions. See
`IMPLEMENTATION_PLAN.md` for Phase A and previous delivery evidence. The broader
P0–P6 journey checklist below is historical/backlog, not a second active plan;
items overlapping Phase B must use B1–B9 and the newer decisions as authority.

Build the Vietnamese MedRoute/Ez-HealthCare web experience represented by the
connected Figma project:

- Figma file: `UI-UX-Medical-App`
- File key: `xxGLe9v3m0AZUdtYSIhpui`
- Starting node: `0:1` (`Page 1`)
- Reference URL: <https://www.figma.com/design/xxGLe9v3m0AZUdtYSIhpui/UI-UX-Medical-App?node-id=0-1>

Broader business backlog (only the Phase B slice above is currently planned):

1. Patient authentication, queue registration, visit progress, notifications,
   completion summary and medical records. Patient self-declaration is deferred;
   staff record the illness information in Phase B.
2. Receptionist patient search, record verification, intake creation, queue
   management, and ticket assignment.
3. Responsive patient views, accessible interaction, privacy-safe presentation,
   and integration with the existing API.

Out of scope until explicitly added here:

- Doctor clinical mutations beyond receiving the visit in the approved Phase B flow.
- A new admin analytics product beyond the existing static prototype.
- UI-library dependencies other than Ant Design unless a documented gap requires
  one.
- Other new dependencies when the platform, CSS, or an installed dependency is
  enough.
- Speculative component abstractions before a pattern is reused.

## Authority and decisions

When sources disagree, use this order:

1. This file for scope, priority, and completion status.
2. Figma for visual layout, copy, component states, and user flow.
3. `ĐẶC TẢ USE CASE.md` and the API project for domain behavior and contracts.
4. Existing dashboard code for reusable implementation patterns.

Confirmed decisions:

- Phase A navigation/workspace scope is complete; Phase B above is the active plan.
- Phase B decisions override older backlog wording, including patient symptom
  self-declaration and the earlier deferral of all clinical integration.
- Ant Design 6 is the standard component library. Use its accessible primitives,
  `ConfigProvider` tokens, and Vietnamese locale before creating custom controls.
- Tailwind remains available for layout and one-off composition; do not duplicate
  an Ant Design component in utility CSS.
- The primary screen action must be visually dominant; secondary actions remain
  quiet.
- Phase B patient screens distinguish:
  `Lấy số tiếp nhận → Chờ tiếp nhận → Điều dưỡng/lễ tân tiếp nhận → Nhận số khám theo phòng → Chờ khám → Bác sĩ tiếp nhận khám`.
  The complete consultation/discharge journey is not part of this phase.
- Status colors have one meaning everywhere: green = complete, blue/teal = active,
  amber = attention, red = error or urgent. Status must never rely on color alone.
- Patient mobile usability is required, especially ticket number, room, waiting
  time, directions, and notifications.
- Existing code should be reused only when it matches the target. Dead or orphaned
  scaffolding should be removed instead of wrapped in more abstractions.
- Authentication follows the existing API contract instead of introducing another
  generic login endpoint:
  - patients use email OTP via `/auth/patient/request-otp` and
    `/auth/patient/verify-otp`;
  - receptionists and other staff use email/password via `/auth/staff/login`;
  - authenticated identity and role come from `/auth/me`.

## Historical baseline — authentication delivery

Observed on 2026-10-15 after auth integration:

- [x] Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind CSS 4, and Ant Design 6
      are installed; the MedRoute theme and Vietnamese locale are configured.
- [x] `/` renders the responsive login screen with Ez-HealthCare metadata.
- [x] `/dashboard` requires a verified session and displays the actual identity.
- [x] Frontend and API lint and TypeScript validation pass.
- [x] Clean Linux installs with `npm ci` succeed for both Docker images.
- [x] Frontend production build and API build pass, locally and in Docker.
- [x] Orphaned Refine/Axios auth scaffolding and client quick-login passwords are
      removed. Existing unused doctor UI types are retained without those dependencies.
- [ ] Production dependency advisories are resolved.
  - The previous audit's Next.js/transitive dependency upgrade tasks remain outside
    this auth delivery; do not treat this stack as production release approval.
- [ ] Whole-repository `npm run format:check` passes.
  - Auth files are formatted; unrelated existing files still need formatting.
- [ ] Dashboard statistics and charts come from the API.
  - These values remain demonstration data; authentication and identity are real.

## Historical authentication integration goal

### Goal

Deliver a real end-to-end login flow from the Figma screen to the existing API,
restore the authenticated user with `/auth/me`, and protect `/dashboard` without
placing long-lived credentials or refresh tokens in browser storage. This goal
describes the original auth delivery; Phase A later added the four workspaces
and unsupported-workspace handling. It does not imply every authenticated role
has clinical access. Use Phase B above for the current implementation scope.
Verification must use Docker, migrations, and seeded demo accounts.

### Historical verification status (2026-10-15, not a new regression run)

- [x] Patient email OTP and staff email/password are connected to the real API.
- [x] All seven roles enter `/dashboard` and show their real name, email, and role.
- [x] Access/refresh tokens use HttpOnly cookies, with Secure in production and
      SameSite=Lax; no auth token is exposed to client JavaScript or localStorage.
- [x] Refresh rotation, logout revocation, remembered sessions, reload restoration,
      expiry and unauthenticated redirects are verified.
- [x] Origin-restricted CORS and mutation-origin checks are implemented.
- [x] API production `AuthService` tests pass: 7 suites / 189 tests across the repo.
- [x] Docker stack is running with a migrated PostgreSQL test database, all-role
      account seeds, API, dashboard, and Mailpit.
- [x] Live integration tests pass: 13/13, including expired access-token recovery.
- [x] Chromium Docker UI tests pass for all seven roles, desktop and 375px mobile,
      wrong credentials/OTP, offline feedback, reload restoration, and logout.

Deferred / operational notes:

- Historical auth-delivery deferral: superseded by the active four-role dashboard plan.
- The full clinical seed has an existing `triage_rules.targetDepartmentId` /
  `target_department_id` schema mismatch. The auth stack intentionally uses
  `seed.js --auth-only`; clinical seeding needs its own repair task.
- Production email requires a configured mail send service/relay, HTTPS, and
  production secrets; Mailpit is the isolated local test inbox.

## Historical work plan / broader backlog — active tasks are B1–B9 above

### P0 — Restore a trustworthy baseline

- [x] Reconcile `package.json` and `package-lock.json` with imports used by retained
      source files; remove packages and source that are not part of the active product.
- [x] Restore the minimum shared auth model/storage module or remove the orphaned
      auth implementation if the API contract requires a different approach.
- [x] Remove stale generated route references and ensure only real routes are typed.
- [x] Replace remotely downloaded fonts with a local or system font strategy.
- [ ] Upgrade Next.js to a patched compatible release and clear high/critical
      production dependency advisories.
- [x] Replace starter metadata and make `/` intentionally redirect to or render the
      correct entry screen.
- [x] Remove hard-coded client-side login credentials.
- [ ] Make these commands pass from a clean checkout:
  - [x] `npm ci` (clean Docker image installs)
  - [x] `npm run lint`
  - [x] `tsc --noEmit --incremental false`
  - [ ] `npm run format:check` (unrelated formatting backlog)
  - [x] `npm run build`

### P1 — Establish the shared visual foundation

- [ ] Extract the Figma colors, typography, spacing, radii, shadows, and status
      semantics into the smallest practical Ant Design theme-token set.
- [x] Build the responsive application shell and role-aware navigation (Phase A;
      separate full visual-token/Figma verification tasks remain pending).
- [ ] Map repeated patterns to Ant Design first: buttons, fields, forms, badges,
      steps, alerts, tables, drawers, and modals. Create a custom component only
      when composition or Figma behavior is genuinely project-specific.
- [ ] Ensure shared controls have labels, keyboard focus, disabled states, errors,
      and sufficient contrast.
- [ ] Verify representative desktop and mobile shells against Figma screenshots.

### P2 — Authentication and role entry

Historical authentication verification used the seeded Docker stack and Chromium.
Phase A subsequently routes the four supported roles to their own workspaces;
legacy RECEPTIONIST uses NURSE and two other roles have no workspace. Latest
full seeded auth/browser reruns remain pending; do not present historical runs as new.

- [x] Implement the Figma login screen with validation, loading, error, remember-me,
      password visibility, and forgot-password states.
- [x] Audit and document the frontend/API authentication contract.
- [x] Remove the unused Refine/Axios auth scaffolding and hard-coded quick-login
      credentials; use the shared Axios transport through auth services/hooks.
- [x] Add an explicit patient/staff choice while preserving the Figma layout.
- [x] Implement patient email OTP request and verification against the real API.
- [x] Implement receptionist/staff email-password login against `/auth/staff/login`.
- [x] Fetch `/auth/me` after login and model the returned identity and role.
- [x] Enable environment-scoped API CORS for the dashboard origin and credentials.
- [x] Add refresh-token rotation using a Secure, HttpOnly, SameSite cookie plus
      `/auth/refresh` and `/auth/logout`.
- [x] Make “Ghi nhớ đăng nhập” control the refresh-cookie lifetime; never store the
      refresh token in `localStorage`.
- [x] Protect `/dashboard`, restore the session on reload, clear expired sessions,
      and redirect unauthenticated users to `/`.
- [x] Route authenticated identities through the dashboard entry; four workspaces
      are delivered in Phase A, with real identity and explicit unsupported-role states.
- [x] Handle validation, invalid credentials/OTP, expiry, lockout, offline, and
      server-error states without exposing sensitive data.
- [x] Replace mock-only auth tests with tests of the real `AuthService` and add E2E
      coverage for staff login, patient OTP, `/auth/me`, refresh, logout, and CORS.
- [x] Verify the complete browser flow against a running API and record the result.
- [x] Provide a reproducible Docker stack with PostgreSQL, migrations, seed accounts
      for all seven roles, and a test OTP inbox.

### P3 — Patient journey

Patient dashboard visual shell and navigation are verified from the supplied
Figma screenshot (see implementation-plan P1–P4). Clinical cards are demo data;
the real-data journey tasks below are not complete.

- [ ] Patient home: show the current ticket, room, people ahead, estimated wait, and
      one clear next action before secondary content.
- [ ] Confirm patient and visit information before issuing a queue number.
- [ ] Implement queue-number success with printable/scannable QR ticket details.
- [ ] Deferred beyond Phase B: patient self-declaration of symptoms. Phase B B5
      instead has NURSE/reception staff record/update illness information.
- [ ] Implement the persistent visit journey tracker and live status updates.
- [ ] Implement actionable notifications with read/unread and relevant deep links.
- [ ] Implement examination-complete summary, instructions, and follow-up details.
- [ ] Implement medical-record history and record detail views for diagnoses,
      prescriptions, tests, and imaging.
- [ ] Verify the patient-critical flow at desktop and mobile widths.

### P4 — Receptionist journey

- [ ] Build the reception workspace around the current queue and fastest next task.
- [ ] Implement keyboard-friendly patient search with empty, loading, multiple-match,
      and no-match states.
- [ ] Implement identity and record verification with duplicate-patient warnings.
- [ ] Implement visit/intake creation with validation and safe confirmation.
- [ ] Implement reception queue management and status transitions.
- [ ] Implement successful ticket assignment with print/reissue actions.
- [ ] Mask unnecessary patient identifiers on shared screens.

### P5 — Real data and resilient states

- [ ] Replace hard-coded dashboard, queue, visit, notification, and record data with
      API-backed queries/mutations.
- [ ] Confirm API base URL and environment handling for local and deployed builds.
- [ ] Provide consistent loading, empty, offline, validation, authorization, and
      server-error states.
- [ ] Prevent duplicate submissions for intake, queue issuance, and clinical forms.
- [ ] Confirm refresh/session behavior without storing secrets in source.
- [ ] Remove demo fallbacks from production paths.

### P6 — Verification and release readiness

- [ ] Add the smallest useful automated checks for authentication, queue issuance,
      visit progression, and receptionist intake.
- [ ] Complete keyboard-only and screen-reader checks for critical flows.
- [ ] Verify text contrast, focus visibility, zoom behavior, and non-color status cues.
- [ ] Verify privacy behavior: masked identifiers, session expiry, and no sensitive
      data in logs or static bundles.
- [ ] Compare completed screens with Figma at representative viewport sizes.
- [ ] Confirm lint, types, formatting, tests, and production build pass in CI.
- [ ] Remove unreachable components, unused hooks, old mock data, and obsolete assets.
- [ ] Update `README.md` with the final routes, environment variables, and commands.

## Definition of Done

A checkbox may be changed to `[x]` only when:

1. The implementation exists in the active route, not only as an unused component.
2. Relevant empty, loading, error, disabled, and success states work.
3. The change works with keyboard navigation and does not expose sensitive data.
4. The smallest relevant automated or manual check has been run and recorded below.
5. Lint and TypeScript checks pass for the changed code.
6. The UI has been visually compared with the relevant Figma frame when applicable.

## Verification log

Add newest entries first. Keep entries short and factual.

2026-10-18 Local auth repair: applied only AddAuthSessions on `tlcn_api_db` with
user approval; OTP/session hash lengths are 64 and user/visit counts unchanged.
Headless Chrome against the running local frontend/API and Mailpit passed OTP,
dashboard, refresh recovery and logout. No seed/reset or NEWS2/audit migration;
no claim of full Phase B verification. See maintenance evidence above.

2026-10-18 B1 contract audit: inspected dashboard/API source, use cases, entities,
state machine, guards, migrations, seed and current tests. Recorded the D1–D12
decisions for required intake data, facility/room queues, operating shifts,
reissue, doctor-room scope, no-show handling, priority and persisted polling
notifications. Marked B1 complete; B2–B9 remain unstarted. Documentation only;
runtime tests were not rerun.

2026-10-18 Phase B planning: recorded the user-confirmed intake/room-queue flow,
daily numbering reset/history, staff-recorded illness information, per-room exam
numbers and staff-only reissue after room assignment. Added B1–B9 with acceptance
criteria and unresolved decisions. Documentation only; no Phase B runtime code,
migration/seed or new integration result. `npx prettier --check todo.md` and
`git diff --check -- todo.md` pass; runtime tests not rerun for this docs-only change.

2026-10-17 API/component refactor: 16/16 local tests pass (transport, production
auth services with HTTP fixtures, lint boundaries). Lint, TypeScript, production
build, changed-file Prettier and `git diff --check` pass. Runtime has no fetch;
Axios import/create exists only in `lib/api/http.ts`. Client components consume
hooks; server pages consume server loaders. Existing UI/role scope is unchanged.
Docker integration/UI reruns are pending because the engine returns HTTP 500;
the user chose local verification first. The 2026-10-15 results below are historical.

Patient UI delivery (2026-10-15): Docker production build, lint, TypeScript,
changed-file formatting and diff checks pass. Dedicated patient Chromium tests
pass at 1280/768/375, including preview interactions, menu routes, keyboard,
refresh/logout, staff denial via direct/RSC requests and forged JWT rejection.
Auth regression rerun: 13/13 integration checks and all 7 browser roles pass.
See `IMPLEMENTATION_PLAN.md` for screenshots and the still-pending role workspaces.

| Date       | Scope               | Evidence                      | Result                                                |
| ---------- | ------------------- | ----------------------------- | ----------------------------------------------------- |
| 2026-10-15 | Auth integration    | `npm run test:auth`           | Pass: 13/13 on seeded Docker stack                    |
| 2026-10-15 | Auth UI             | Chromium Docker tests         | Pass: all 7 roles; desktop/mobile; restore/logout     |
| 2026-10-15 | API production auth | Jest against real AuthService | Pass: 7 suites / 189 tests                            |
| 2026-10-15 | Builds              | Next build / Nest build       | Pass: local and Docker; clean npm ci                  |
| 2026-10-15 | Lint / types        | Both repos                    | Pass; no missing auth dependencies                    |
| 2026-10-15 | Clinical full seed  | Fresh Docker database         | Existing triage column mismatch; auth-only seed works |
| 2026-10-15 | Auth contract       | Source/API audit              | Blocked: endpoint, session, CORS mismatches           |
| 2026-10-15 | API baseline        | Lint, TSC, Jest               | Pass: 7 suites, 183 tests; auth tests mock-only       |
| 2026-10-15 | Figma login flow    | Lint, CDP, browser form       | Pass: 1280/375; validation; `/dashboard` route        |
| 2026-10-15 | Ant Design setup    | `GET /dashboard`              | HTTP 200; SSR styles present                          |
| 2026-10-15 | Changed code        | `npm run lint`                | Pass                                                  |
| 2026-10-15 | Baseline scan       | `npm run lint`                | Pass                                                  |
| 2026-10-15 | Development route   | `GET /dashboard`              | HTTP 200                                              |
| 2026-10-15 | Type validation     | `npx tsc --noEmit`            | Fail: missing auth module and stale role routes       |
| 2026-10-15 | Production build    | `npm run build`               | Compile pass; typecheck blocked by auth backlog       |
| 2026-10-15 | Formatting          | `npm run format:check`        | Fail: 21 files require formatting                     |

## Change log

- 2026-10-18: Completed B1 contract audit and recorded the implementation baseline
  selected through D1–D12. Added the target state flow, API/security gaps, queue
  numbering constraints, shift/no-show/reissue rules, notification ownership and
  migration/test findings. No Phase B runtime implementation was added.

- 2026-10-18: Made Phase B tasks/decisions in this file the active source of truth;
  marked Phase A completed and older P0–P6 checklists historical/backlog. Patient
  self-declaration is deferred; daily intake/room numbers and staff-assisted
  intake/room assignment replace the earlier proposed patient declaration flow.

- 2026-10-15: Delivered patient dashboard from the user-supplied Figma screenshot,
  horizontal shell and responsive cards, real identity/account logout, explicit
  demo data, navigation placeholders, server-side patient-role checks and
  refresh recovery. Other role dashboards remain unchanged. Added dedicated
  Chromium tests; fixed the login submit button's loading-state accessible name.

- 2026-10-15: Completed P2 login/auth with patient OTP, all staff roles, verified
  identity, HttpOnly cookie sessions, rotation/logout, CORS, and protected dashboard
  entry. Added all-role auth-only seeds, reproducible Docker stack, 13 integration
  checks, and Chromium UI checks. Feature permissions remain deferred as requested.
- 2026-10-15: Audited the sibling API, documented the patient/staff authentication
  contract, and expanded P2 with the concrete frontend, API, session, CORS, route
  protection, and verification work still required.
- 2026-10-15: Replaced the starter root page with the responsive Figma login,
  preserved exact SVG assets, added accessible form states, and routed valid
  submissions to `/dashboard` without inventing an authentication backend.
- 2026-10-15: Adopted Ant Design 6 as the standard UI library, added its official
  App Router registry, configured Vietnamese theme defaults, and migrated the
  dashboard export button.
- 2026-10-15: Created the source of truth from the repository scan, connected Figma
  project, and confirmed patient/receptionist scope.
