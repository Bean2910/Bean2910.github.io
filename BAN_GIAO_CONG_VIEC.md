# 📋 Tài liệu Bàn giao Công việc · Dự án `didenchua` (An Tự Duyên 3D)

> **Thời điểm bàn giao:** `2026-11-14`  
> **Repository:** `https://github.com/Bean2910/didenchua.git` (`main`)  
> **Trạng thái tổng quan:** Backend, hệ thống lưu trữ nhân vật, Trang quản trị `/admin`, và bộ test E2E hoạt động ổn định. Chức năng **Cưỡi hạc bay tự do 6 hướng** đã hoàn thành **phần Backend & Admin**, đang **tạm ngưng trước bước patch Frontend (`client/assets/main-CPNz0KLo.js`)** để bàn giao.

---

## 1. Kiến trúc thư mục & Thành phần chính

```text
didenchua/
├── client/                              # Frontend 3D Three.js (production bundle + assets tĩnh)
│   ├── assets/
│   │   ├── main-CPNz0KLo.js             # Bundle JS chính của game (hiện còn NGUYÊN BẢN chưa patch)
│   │   ├── main-DWI8sA1o.css            # Stylesheet chính
│   │   └── modulepreload-polyfill-B5Qt9EMX.js
│   ├── draco/                           # Bộ giải mã WebAssembly Draco
│   ├── icons/                           # Icon PWA
│   ├── models/                          # 39 mô hình 3D (.glb)
│   ├── music/                           # Nhạc nền Chánh điện & kinh tụng (.mp3)
│   ├── index.html                       # Đã gỡ Cloudflare telemetry
│   └── package.json / vite.config.js
│
├── server/                              # Backend Node.js + WebSocket (ws) + Admin GUI
│   ├── admin/
│   │   ├── index.html                   # Giao diện Quản trị Chùa (/admin)
│   │   ├── admin.css
│   │   └── admin.js
│   ├── data/                            # Dữ liệu runtime JSON (bị gitignore; tự tạo khi khởi động)
│   │   ├── .gitkeep
│   │   ├── config.json                  # Cấu hình nhiệm vụ, phần thưởng, linh vật, lễ hội, PIN
│   │   ├── players.json                 # Tài khoản & hồ sơ nhân vật lưu theo cid
│   │   └── world.json                   # Trạng thái sân chùa, hoa đăng, Bảng vàng
│   ├── tests/
│   │   └── verify_server.mjs            # Bộ kiểm thử E2E HTTP + WebSocket + Admin API
│   ├── package.json                     # Phụ thuộc: "ws": "^8.19.0" ("type": "module")
│   └── server.js                        # Máy chủ HTTP + WebSocket (~2.980 dòng)
│
├── capture/                             # Tài liệu phân tích giao thức / trạng thái tham khảo
├── run.bat                              # Script khởi động nhanh trên Windows (port 8080)
├── README.md
└── BAN_GIAO_CONG_VIEC.md                # Tài liệu bàn giao này
```

> [!NOTE]
> Thư mục `node_modules/` và `server/data/*.json` được đưa vào `.gitignore` để giữ repo nhẹ và tránh xung đột file save giữa các máy. Khi clone mới ở máy khác, chạy `cd server && npm install` trước khi chạy `run.bat` hoặc `node server.js`.

---

## 2. Công việc ĐÃ HOÀN THÀNH

### 2.1. Backend Game Server (`server/server.js`)
- **Lưu trữ bền vững (`server/data/*.json`):**
  - Hồ sơ nhân vật theo `cid` (`merit`, `todayMerit`, `weekMerit`, `days`, `streak`, `bestStreak`, `bows`, `rounds`, `countedBeads`, `sitSec`, `sitMin`, `incenseCount`, `lanternCount`, `bellCount`, `moCount`, `sweepCount`, `feedCount`, `vowCount`, `quizCount`, `tkDone`, `pet`, `chores`, `visitedZones`, `bode`, `keeps`, `leProgress`, `lvTrau`, `lvHac`, `lvRua`, `amSlots`).
  - Hệ thống tài khoản (`register` / `login` / đổi mật khẩu) & kiểm tra cấm (`banned`).
- **Hệ thống Công đức & Nhiệm vụ (`questsConfig`, `rewards`):**
  - Nhiệm vụ Ngày (6 việc), Tuần (9 việc + thưởng mốc 6/9), Tân thủ (3 việc ban đầu -> xong mới chuyển tiếp), đồng bộ realtime với cấu hình Admin qua `syncQuestPool`.
  - Mức thưởng công đức cho từng hành động (`incense`, `lay`, `bell`, `mo`, `sitMin`, `quet`, `ca`, `xam`, `lantern`, `vow`, v.v.) có thể cấu hình động từ Admin.
- **Hệ thống 17 Danh hiệu (`TITLE_DEFS`):**
  - Kiểm tra điều kiện mở khóa hoặc mở khóa thủ công từ Admin (`unlockedTitles`), lưu theo ID nhân vật, chỉ cho phép đeo danh hiệu đã mở khóa (`title`).
- **Linh vật & Chế độ chia khung giờ (`LINH_VAT_WINDOWS`, `linhVatSessionCooldown`):**
  - Trâu (10 tranh, `6–12h` & `12–18h`), Hạc trắng (7 bậc, `5–9h` & `16–19h`), Rùa thần (7 bậc, `5–11h` & `14–19h`).
  - Hỗ trợ bật/tắt giới hạn theo ca Sáng/Chiều từ Admin.
- **Lễ hội, Đố vui, Bảng vàng & Tiện ích:**
  - Lễ hội (`festival` + `leProgress` + `claim-le`) với các preset (Rằm, Mùng 1, Phật Đản, Vu Lan, Tết).
  - Live Đố vui Phật pháp (`quiz` engine + đố vui luyện tập `quiz-practice`).
  - Bảng tin ghim, thông báo toàn chùa, Hộp thư Ban quản lý (`sp`), Bảng vàng công đức (`donors`).
  - `/api/pass` trả `{ off: true }` để chạy offline/LAN không bị chặn Captcha.

### 2.2. Trang Quản trị Chùa (`/admin` — `server/admin/`)
- Giao diện 4 tab:
  1. **Tổng quan & Sự kiện:** Chia giờ Linh Vật, bật/tắt cưỡi hạc tự do mọi lúc, Thông báo & Ghim, mã PIN `/admin`, Lễ hội (kèm preset & chỉnh từng bước), Điều khiển Live Đố vui.
  2. **Nhiệm vụ & Công đức:** Sửa trực tiếp bảng điểm thưởng `rewards` và danh sách nhiệm vụ Ngày / Tuần / Tân thủ + nút đồng bộ ngay xuống người chơi.
  3. **Người chơi & Danh hiệu:** Xem/chỉnh toàn bộ thông số nhân vật, tiến trình 3 linh vật, mở từng danh hiệu hoặc bấm **`⚡ Mở hết 17 danh hiệu`** / **`↺ Chỉ giữ mặc định`**; đã fix lỗi tự làm mới 5s làm mất dữ liệu đang nhập (`playerDetailDirty`) và đẩy realtime `merit` + `hanhtrinh` + `journal` + `linhvat` về client đang online.
  4. **Sân chùa & Bảng vàng:** Quản lý hương, đèn, danh sách hoa đăng, thêm/xóa tên trên Bảng vàng.

### 2.3. Tiện ích khởi động (`run.bat`)
- Đã sửa lỗi cú pháp Batch trên Windows khi chạy từ PowerShell/CMD: tự dọn tiến trình cũ đang nghe cổng `8080`, mở trình duyệt `http://localhost:8080/?phong=chua-1` và chạy `node server.js`.

---

## 3. Công việc ĐANG LÀM DỞ (Cần tiếp tục)

### Yêu cầu hiện tại: **Bổ sung chức năng cưỡi hạc bay tự do (bay lên, xuống, trái, phải, tới, lui) trong chùa**

#### A. Phần ĐÃ XONG ở Backend & Admin (đã có trong commit này):
1. **`server/server.js`:**
   - Thêm `allowFreeCraneAnytime: true` vào `getDefaultConfig()` và `normalizeConfig()`.
   - Trong `buildLinhVatPayload(rec)`: thêm `'tudo'` vào `hac.fly` khi `hacS >= 4 || Boolean(gameConfig.allowFreeCraneAnytime)`.
   - Thêm `this.flying = false` trong `class Player` và trường `fly: this.flying ? 1 : 0` trong `toPeerObject()`.
   - Cập nhật `case 'lv-bay':` (hỗ trợ cả `{ k: 'tudo' | 'dua' | 'tron' }` mà client thực tế gửi lên lẫn `{ on }`) và bổ sung `case 'lv-xuong':` để đồng bộ trạng thái bay/hạ cánh cho người chơi khác trong phòng.
2. **`server/admin/index.html` & `server/admin/admin.js`:**
   - Thêm công tắc **`🦢 Cưỡi hạc bay tự do mọi lúc`** (`#freeCraneToggle`) trong Tab 1 (thẻ Linh Vật) kết nối `/api/admin/config`.
3. **Lưu ý tương thích:** Frontend hiện tại (`client/assets/main-CPNz0KLo.js`) chưa được chỉnh sửa; client cũ sẽ chỉ nhận mảng `hac.fly` chứa `'tudo'` nhưng không bị lỗi vì nó chỉ kiểm tra `t.fly.includes("dua")`.

#### B. Phần CHƯA LÀM ở Frontend (`client/assets/main-CPNz0KLo.js`):
Frontend hiện chỉ hỗ trợ bay hạc theo đường cong `Kf` dựng sẵn (`dua` / `tron`) khi Hạc đạt bậc `>= 4` và đang ở hồ (`x0`). Toàn bộ vị trí mã (`anchor` / `offset`) trong `client/assets/main-CPNz0KLo.js` đã được khảo sát sẵn để người nhận bàn giao viết script patch trực tiếp:

1. **Điều khiển bay tự do 6 hướng trong `class Dk` (`Vi`, offset ~`1113080`):**
   - Trong `fly(t, e, i, s, yaw)`: thêm nhánh `e === "tudo"`:
     - Cho phép cất cánh ngay tại vị trí hiện tại `Q.root.position` (không phụ thuộc `this.present` hay bắt đi bộ ra hồ `Xa`).
     - Khởi tạo `this.flight = { manual: !0, landing: !1, vx: 0, vy: 2.4, vz: 0, roll: 0, pitch: 0 }`, `this.carrying = "tudo"`.
   - Trong `update(t, e, i, s, o)`: khi `this.flight.manual`:
     - **Bay ngang (trái/phải/tới/lui):** Đọc từ `ov.move()` (`WASD` / phím mũi tên / `Shift` tăng tốc / Joystick cảm ứng), nhân vận tốc nền (gợi ý ~`11 m/s`, giữ `Shift` `1.6x`).
     - **Bay lên / bay xuống:** Đọc phím từ `ov.keys`: `Space` (`" "`) / `R` / `PageUp` (bay lên), `C` / `Control` / `PageDown` (bay xuống), kết hợp nút giữ/bấm trên HUD (`climbHold` / `climbPulse`), vận tốc dọc ~`9 m/s`. *(Lưu ý: `Q` và `E` đang dùng cho `ov.turnCamera(t)` nên giữ nguyên để xoay góc nhìn).*
     - **Giới hạn biên sân chùa:** kẹp `(x, z)` trong `ct.bounds` (`{ x0: -58, x1: 72, z0: -82, z1: 157 }`, chừa lề ~2m) và kẹp `y` trong `[Bn(x, z) + 0.65, 48]`.
     - **Chuyển động cánh & nghiêng thân:** Xoay `this.heading` mượt theo hướng bay ngang, tính độ nghiêng cánh (`roll`) khi rẽ và chúc/ngóc đầu (`pitch`) theo `vy`, gọi `Nd(a, m.vy > .35 || hSpd > 2 ? "fly" : "glide", e, 0, this.open)`.
   - Trong `land()`: khi `this.flight.manual`, bật `this.flight.landing = !0` để hạc đáp thẳng xuống mặt đất `Bn(x, z)` bên dưới chỗ đang bay rồi cho nhân vật xuống tại chỗ (`Q.state = "idle"`, `en = !1`, gửi `{ t: "lv-xuong" }`), nếu ngoài hồ (`!x0(endPos)`) mới đặt lại model hạc chờ về `Xa`.

2. **Vòng lặp chính, Camera & Đồng bộ Multiplayer:**
   - **Main Loop (offset ~`1303000`–`1305200`):**
     - Mở khóa `ov.move()` khi bay tự do: đổi `en || ...` thành `(en && Vi.carrying !== "tudo") || ...` (và chỉ cập nhật biến đi bộ `At` khi `!en`).
     - Truyền `s?.dir ?? null` (thay vì hướng đầu hạc) vào `Ae.follow(...)` khi `Vi.carrying === "tudo"` để bay lùi (`S`) hoặc bay ngang (`A/D`) không làm camera tự xoay giật ngược.
     - Truyền `!en && r === "Chánh điện"` vào `Ae.update(...)` và `Zy.update(...)` để khi bay bên trên mái Chánh điện camera không bị ép zoom/góc nhìn trong nhà.
   - **Đồng bộ `y` và tư thế ngồi cho Peer khác:**
     - Trong `Ji()` (offset ~`1271590`): thêm điều kiện `Math.abs(e.y - Ua.y) > .05` (lưu `Ua.y`) để thay đổi độ cao được gửi `{ t: "state", ... }` ngay mỗi 150ms.
     - Trong `Peer.update` (offset ~`660728`): đổi `this.state === 2 ? "sit" : ...` thành `this.info.fly || this.state === 2 ? "sit" : ...` để người chơi khác bay trên hạc vẫn giữ dáng ngồi thiền thay vì chạy bộ trên không.

3. **Điểm kích hoạt UI & Nút điều khiển trên HUD:**
   - **Modal `Hạc trắng` (`class zk`, `ji`, offset ~`1119976`) & `Eb(n)` (`1283252`):**
     - Hiển thị nút **`Cưỡi hạc bay tự do`** (`data-fly="tudo"`) khi `t.fly?.includes("tudo")` ngay cả khi chưa ở hồ hoặc ngoài giờ sáng/chiều; trong `Eb("tudo")` bỏ yêu cầu đi bộ ra hồ `x0` (chỉ chặn nếu đang ở trong Am riêng `oe` hoặc Pháp đường `Ge`).
   - **Menu `Động tác` (`kT` `661978`, `Og` `663414`, `Um` `1277762`):**
     - Thêm mục `hac: "Cưỡi hạc bay tự do"` để gọi hạc trực tiếp từ mọi vị trí trong chùa.
   - **Thanh hành động khi đang bay (`So` `667377`, `XR` `1276202`, `HUD.renderActions`):**
     - Khi `en && Vi.carrying === "tudo"`, trả 3 nút: **`Bay lên`** (`haclen`, hỗ trợ giữ `pointerdown`/`pointerup` hoặc nhấp ngắn), **`Bay xuống`** (`hacxuong`), **`Hạ cánh`** (`xuong`).
     - Nhớ gọi `blur()` sau khi bấm button / `preventDefault()` phím `Space` khi đang bay tự do để phím `Space` không kích hoạt nhầm lại button HTML vừa bấm.

---

## 4. Hướng dẫn Cài đặt, Chạy & Kiểm thử

### Cài đặt phụ thuộc (khi clone mới)
```powershell
cd server
npm install
```

### Khởi động Game & Admin
- Chạy nhanh trên Windows: nhấp đúp hoặc chạy `.\run.bat`
- Hoặc chạy thủ công:
  ```powershell
  cd server
  node server.js
  ```
- **Game 3D:** `http://localhost:8080/?phong=chua-1`
- **Trang Quản trị Admin:** `http://localhost:8080/admin`

### Kiểm tra cú pháp & Test E2E (đã verify pass trước khi push)
```powershell
# Kiểm tra cú pháp JS (phải exit code 0)
node --check client/assets/main-CPNz0KLo.js
node --check server/server.js
node --check server/admin/admin.js
node --check server/tests/verify_server.mjs

# Chạy bộ test E2E (tự động test trên port 18080, tự backup & khôi phục server/data/)
node server/tests/verify_server.mjs
```
> **Kết quả kiểm thử gần nhất trước bàn giao:** `node --check` 4 file trên đều exit code `0`, và `node server/tests/verify_server.mjs` in **`ALL E2E ASSERTIONS PASSED!`** (exit code `0`), bao gồm test cấu hình `allowFreeCraneAnytime`, `hac.fly`, broadcast `lv-bay` / `state` (`y`) / `lv-xuong`, nhiệm vụ, công đức, 17 danh hiệu, lễ hội `le`, và đố vui trực tiếp.
