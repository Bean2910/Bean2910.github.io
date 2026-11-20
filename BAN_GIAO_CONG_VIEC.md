# 📋 Tài liệu Bàn giao Công việc · Dự án `didenchua` (An Tự Duyên 3D)

> **Thời điểm cập nhật:** `2026-11-19`  
> **Repository:** `https://github.com/Bean2910/Bean2910.github.io.git` (`main`, hỗ trợ GitHub Pages tại `https://bean2910.github.io/`)  
> **Phiên bản client hiện hành:** `client/index.html` (`?v=2026112001`) + entry root `index.html` & `.nojekyll`  
> **Trạng thái tổng quan:** Chạy tương thích cả **GitHub Pages (Static + Solo Offline Fallback + `?server=wss://...`)** lẫn **Backend Node.js ([server/server.js](file:///D:/python/didenchua/server/server.js))**, module tách riêng [client/dj/](file:///D:/python/didenchua/client/dj/index.js), Trang quản trị `/admin`, và bộ kiểm thử E2E ([server/tests/verify_server.mjs](file:///D:/python/didenchua/server/tests/verify_server.mjs)) pass toàn bộ.

---

## 1. Kiến trúc thư mục & Thành phần chính

```text
didenchua/
├── .nojekyll                            # Tắt Jekyll build để GitHub Pages phục vụ file tĩnh trực tiếp
├── index.html                           # Trang chuyển hướng /(root) -> ./client/ (giữ nguyên query ?phong / ?server)
├── client/                              # Frontend 3D Three.js (đường dẫn tương đối ./ , không cần build lại)
│   ├── assets/
│   │   ├── main-CPNz0KLo.js             # Bundle JS chính + chế độ GitHub Pages Solo Fallback + ?server=wss://...
│   │   ├── main-DWI8sA1o.css            # Stylesheet chính
│   │   └── modulepreload-polyfill-B5Qt9EMX.js
│   ├── dj/                              # Module tách riêng: Bàn DJ 3D + FxSound EQ + Nhảy theo nhạc
│   │   ├── index.js                     # Facade điều phối DjFx (nạp URL tương đối qua import.meta.url)
│   │   ├── fxsound-presets.js           # Preset Factory/Bonus (.fac parser/exporter, Q, 5..31 bands)
│   │   ├── fxsound-dsp.js               # Bộ xử lý WebAudio DSP + Bàn DJ Deck phát MP3 (tự skip file lỗi)
│   │   ├── fxsound-ui.js / .css         # Giao diện Studio Dark/Light + Mirrored Spectrum Visualizer
│   │   ├── dj-booth.js                  # Mô hình Bàn DJ 3D + 10 cột VU LED + loa bass ngoài sân chùa
│   │   └── dance-fx.js                  # Động tác Nhảy theo nhạc (J) cho người chơi, peer & Bot
│   ├── draco/                           # Bộ giải mã WebAssembly Draco
│   ├── icons/                           # Icon PWA
│   ├── models/                          # 45 mô hình 3D (.glb)
│   │   ├── tien_kiem.glb                # Kiếm 3D cho Vạn Kiếm Quy Tông & Kiếm Luân
│   │   ├── sieu_xe_hieu_ung_khoi.glb    # Siêu xe đường đua (4 bánh quay + khói ống xả)
│   │   ├── bach_long_ma.glb             # Bạch Long Mã (cưỡi tự do & đua)
│   │   ├── ton_ngo_khong.glb            # Đệ tử Tôn Ngộ Không
│   │   ├── tru_ngo_nang.glb             # Đệ tử Trư Ngộ Năng
│   │   ├── sa_ngo_tinh.glb              # Đệ tử Sa Ngộ Tĩnh
│   │   └── ... (39 model gốc của chùa: trau_*, rua_*, phap khi, linh vat, hoa sen...)
│   ├── music/                           # Nhạc nền Chánh điện & kinh tụng (.mp3)
│   ├── index.html                       # Đã gỡ Cloudflare telemetry · cache tag ?v=2026111905
│   └── package.json / vite.config.js
│
├── server/                              # Backend Node.js + WebSocket (ws) + Admin GUI
│   ├── admin/
│   │   ├── index.html                   # Giao diện Quản trị Chùa (/admin, 4 tab + Đua Trâu)
│   │   ├── admin.css
│   │   └── admin.js
│   ├── data/                            # Dữ liệu runtime JSON (gitignore; tự tạo khi khởi động)
│   │   ├── .gitkeep
│   │   ├── config.json                  # Cấu hình chung, nhiệm vụ, thưởng, linh vật, lễ hội, Đua trâu
│   │   ├── players.json                 # Tài khoản & hồ sơ nhân vật lưu theo cid
│   │   └── world.json                   # Trạng thái sân chùa, hoa đăng, Bảng vàng & Đài nhạc YouTube
│   ├── tests/
│   │   └── verify_server.mjs            # Bộ kiểm thử E2E HTTP + WebSocket + Admin API
│   ├── race_schedule.js                 # Bộ tính chu kỳ giải Đua Trâu theo giờ VN
│   ├── package.json                     # Phụ thuộc: "ws": "^8.19.0" ("type": "module")
│   └── server.js                        # Máy chủ HTTP + WebSocket
│
├── run.bat                              # Script khởi động nhanh trên Windows (port 8080)
├── README.md
└── BAN_GIAO_CONG_VIEC.md                # Tài liệu bàn giao này
```

> [!NOTE]
> Thư mục `node_modules/` và `server/data/*.json` được đưa vào `.gitignore` để giữ repo nhẹ và tránh xung đột file save giữa các máy. Khi clone mới ở máy khác, chạy `cd server && npm install` trước khi chạy `run.bat` hoặc `node server.js`.

---

## 2. Lịch sử Các Mốc Công việc ĐÃ HOÀN THÀNH

| Commit | Nội dung chính |
| :--- | :--- |
| `c70ef15` / `5d97d4c` | Khởi tạo Backend `server.js`, lưu trữ JSON bền vững, Admin GUI `/admin` 4 tab, E2E test, `run.bat`, tài liệu bàn giao ban đầu. |
| `0cf2e6f` | **Cưỡi hạc bay tự do 6 hướng (`tudo`)**, hệ thống menu **Thần thông**, **Vạn Kiếm Quy Tông (`V`)**, **Như Lai Thần Chưởng (`N`)**, **Súc Địa Thành Thốn (`W/A/S/D × 2`)**, **Kiếm Luân Hộ Thể (`K`)**, **Vòng Hào Quang (`H`)**. |
| `47bfbe3` | **Trường đua quanh chùa (`RaceSys`)**: chọn Trâu / Siêu xe / Bạch Long Mã, chướng ngại vật (vũng nước làm chậm, khúc gỗ chặn đường), Drift tụ Turbo (`Space`), lịch giải định kỳ 10 phút + Bot AI; thêm **3 Đệ tử theo sau (`DtFx`)** và **Cưỡi Bạch Long Mã (`HmFx`)**. |
| `78dad6c` | Fix di chuyển khi cưỡi Bạch Long Mã ngoài sân, tự động xuống ngựa khi bước vào Chánh điện, hạ pill lịch Đua trâu xuống dưới thanh hiển thị Công đức. |
| `c36926a` (mới nhất) | **Quái vật ngoài chùa (`MobFx`)** cày Công đức bằng Thần thông; **Đài nhạc YouTube 16:9 (`YtFx`)** dời ra trước cây Bồ Đề `(16.2, 28.5)` chiếu live thẳng lên bảng 3D; **Quả cầu gương Disco 7 sắc cầu vồng gradient (`yt-disco`)**; **28 nệm ngồi kiểu Chánh Điện (`cd-yt-0..27`)**; và **7 Bot thiện tín (`BotFx`)** ngồi xem & tương tác theo sự kiện chùa. |

---

## 3. Chi tiết Hệ thống & Tính năng hiện có

### 3.1. Backend Game Server & API Quản trị (`server/server.js`, `server/admin/`)
- **Lưu trữ bền vững (`server/data/*.json`):**
  - Hồ sơ theo `cid` (`merit`, `todayMerit`, `weekMerit`, `days`, `streak`, `bestStreak`, `bows`, `rounds`, `countedBeads`, `sitSec`, `sitMin`, `incenseCount`, `lanternCount`, `bellCount`, `moCount`, `sweepCount`, `feedCount`, `vowCount`, `quizCount`, `tkDone`, `pet`, `chores`, `visitedZones`, `bode`, `keeps`, `leProgress`, `lvTrau`, `lvHac`, `lvRua`, `amSlots`).
  - Dữ liệu thế giới phòng (`world.json`): `incense`, `yardIncense`, `sideIncense`, `lamps`, `lanterns`, `vows`, `pinned`, `donors`, và trạng thái **Đài nhạc YouTube + Quả cầu gương (`yt`: `{ current, queue, disco }`)**.
- **Hệ thống Công đức, Nhiệm vụ & 17 Danh hiệu (`TITLE_DEFS`):**
  - Nhiệm vụ Ngày (6 việc), Tuần (9 việc), Tân thủ (3 việc ban đầu); bảng thưởng `rewards` chỉnh sửa nóng từ `/admin`.
  - 17 danh hiệu tự mở khóa theo điều kiện hoặc cấp thủ công từ Admin (`⚡ Mở hết 17 danh hiệu` / `↺ Chỉ giữ mặc định`).
- **Linh vật & Lễ hội & Đố vui:**
  - Trâu (10 tranh), Hạc trắng (7 bậc, bay `tudo`/`dua`/`tron`), Rùa thần (7 bậc); công tắc bật/tắt giới hạn khung giờ (`linhVatSessionCooldown`) và bay hạc tự do mọi lúc (`allowFreeCraneAnytime`).
  - Lễ hội (`ram`, `mung1`, `phatdan`, `vulan`, `tet`...) & Đố vui Phật pháp trực tiếp / luyện tập.
- **Cấu hình & Điều phối Trường đua (`buffaloRace`, `server/race_schedule.js`):**
  - Mặc định mở giải định kỳ mỗi 10 phút (`autoSchedule: true`, `intervalMin: 10`), cửa sổ tham gia 90 giây, cảnh báo trước **3p / 2p / 1p**, phát tín hiệu `race-sched` đồng bộ seed/mapKind/botCount/difficulty/laps.
  - Admin Tab 1 có card **Trường Đua Trâu Quanh Chùa (Bot AI)** hỗ trợ lưu config và nút **`🏁 Mở giải đua ngay`**.
- **Các handler WebSocket mới đã tích hợp:**
  - `mob-kill`: Thưởng Công đức theo 9 ID quái (`imp_*` +5/12s, `beast_*` +10/18s, `boss_*` +20/28s cooldown phòng; Boss bậc 3 phát thông báo `ann` toàn phòng).
  - `yt-add`, `yt-play`, `yt-next`, `yt-stop`, `yt-remove`, `yt-clear`, `yt-disco`: Validate ID YouTube 11 ký tự (`youtube.com/watch`, `youtu.be`, `shorts/`, `live/`, `embed/`), thêm/phát/xóa bài đang chiếu, xóa từng bài trong hàng chờ hoặc dọn sạch danh sách, đồng bộ `yt-state` realtime cả phòng và lưu `world.json`; Admin `/api/admin/world` có `action: 'clear-yt'`.
  - `duatrau-done`: Ghi nhận hạng về đích & nhân hệ số thưởng theo độ khó (`de ×1`, `trungbinh ×1.5`, `kho ×2`, `cuckho ×3`).
  - `/api/pass` trả `{ off: true }` để chạy LAN/local không bị vướng Captcha.

### 3.2. Cưỡi Hạc Bay Tự Do & Hệ thống Thần Thông (`VkFx`, `TtM`)
- **Menu Thần thông (`TtM`):** Nằm cạnh nút `Động tác` trên HUD và hỗ trợ phím tắt (tự động khóa khi đang mở các modal / nhập chat / link):
  - **`Cưỡi hạc bay tự do`:** Cất cánh tại chỗ (ngoài Chánh điện/Pháp đường); `WASD`/mũi tên/Joystick bay theo hướng camera, kéo chuột ngước lên/xuống tự do (`freeLook`), giữ `Space`/`R`/`PageUp` (hoặc nút `Bay lên`) để lên cao, `C`/`Ctrl`/`PageDown` (hoặc `Bay xuống`) để hạ độ cao; đồng bộ tọa độ `y` & dáng ngồi `fly` cho người chơi khác.
  - **`Vạn Kiếm Quy Tông` (`V`):** Gọi kiếm trận 3D (`tien_kiem.glb`, 60 thanh kiếm 3 tầng) giáng xuống phía trước, gây **2 đợt sát thương AoE (`85` + `95` HP)**.
  - **`Như Lai Thần Chưởng` (`N`):** Bàn tay Phật khổng lồ giáng từ trên mây kèm hiệu ứng hố chưởng & rung camera, gây **`200` sát thương AoE** trong bán kính `10.5m`.
  - **`Súc địa thành thốn` (`W×2` / `A×2` / `S×2` / `D×2`):** Lướt dịch chuyển tức thời kèm ấn ring & tia sáng.
  - **`Kiếm luân hộ thể` (`K`)** & **`Vòng hào quang` (`H`):** Bật/tắt 32 thanh kiếm xoay sau lưng và hào quang Phật xoay theo góc nhìn, đồng bộ qua `kl-on`/`kl-off`/`hq-on`/`hq-off`.

### 3.3. Đệ tử Theo Sau (`DtFx`) & Cưỡi Bạch Long Mã (`HmFx`)
- **3 Đệ tử theo sau (`G` hoặc chip chọn lẻ trong `Thần thông`):**
  - `ton_ngo_khong.glb` (Tôn Ngộ Không), `tru_ngo_nang.glb` (Trư Ngộ Năng), `sa_ngo_tinh.glb` (Sa Ngộ Tĩnh) — tự đi/chạy bám đội hình sau lưng, tự bay theo khi cưỡi hạc, đồng bộ bitmask `dt-0..7` sang người chơi khác.
- **Cưỡi Bạch Long Mã (`M`):**
  - Model `bach_long_ma.glb` có khớp cổ, đuôi, 4 chân bước kiệu / phi nước đại (giữ `Shift` tốc độ `×2.65`, bình thường `×1.65`), tự động thu hồi/xuống ngựa khi bước vào trong Chánh điện (`ct.hall`), đồng bộ qua `ma-1`/`ma-0`.

### 3.4. Trường Đua Quanh Chùa (`RaceSys`)
- **Cổng Đua Tây Chùa & Vòng đua bao quanh chùa:** 5 chế độ cung đường sinh động (`random`, `easy`, `medium`, `complex`, `extreme`) tránh vũng nước (giảm tốc) và khúc gỗ (va chạm chặn/trượt tường), hiển thị mini-map trực tiếp trong sảnh chờ.
- **3 Phương tiện đua:** Trâu truyền thống, **Bạch Long Mã (`ngua`)**, và **Siêu xe (`sieu_xe_hieu_ung_khoi.glb`)** với 4 bánh quay & 16 cụm khói ống xả.
- **Điều khiển:** `↑↓←→` / Joystick / `WASD` lái; `Ctrl` / `Tăng tốc` chạy thanh thể lực; `Space` / `Drift` trượt cua tích tụ Turbo bứt tốc.
- **Lịch định kỳ & Hàng chờ:** Nếu chưa tới giờ giải chính thức vẫn có thể chọn **`⏳ Vào hàng chờ`** (chờ đếm ngược xuất phát đồng bộ) hoặc **`🏇 Đua tập`** thử đường ngay.

### 3.5. Quái Vật Ngoài Chùa (`MobFx`)
- **9 quái vật tuần tra ngoài khuôn viên nội tự** (chấm hiển thị trên bản đồ nhỏ, thanh máu & sát thương nổi HUD):
  - 4 **Tiểu Yêu** (`imp_sw`, `imp_se`, `imp_w`, `imp_e`): `100 HP`, thưởng `+5 Công đức`, hồi sinh `12s`.
  - 3 **Yêu Lang / Yêu Thú** (`beast_sw`, `beast_se`, `beast_w`): `160 HP`, thưởng `+10 Công đức`, hồi sinh `18s`.
  - 2 **Ma Tướng Boss** (`boss_nw`, `boss_ne`): `320 HP`, thưởng `+20 Công đức`, hồi sinh `28s`, khi hạ gục có thông báo toàn phòng.

### 3.6. Đài Nhạc YouTube 16:9, Quả Cầu Gương 7 Sắc Cầu Vồng, 28 Nệm Ngồi & Bot Sự Kiện (`YtFx`, `BotFx`)
- **Đài nhạc YouTube 16:9 (`YtFx` tại `(16.2, 28.5)` trước cây Bồ Đề):**
  - Khung màn hình rộng chuẩn **`8.0m × 4.5m` (16:9)** nâng cao `1.10m`, chiếu video YouTube (`<iframe>`) **trực tiếp lên mặt bảng 3D ngoài sân chùa** theo góc nhìn camera thực qua CSS3D `sync3D(Pe)` (tự ẩn mặt lưng khi đứng sau bảng hoặc khi vào trong Chánh điện).
  - Bảng điều khiển hỗ trợ dán link YouTube, **Phát ngay lên bảng**, **Thêm hàng chờ**, **Bài tiếp**, **Dừng phát**, **Xóa bài đang phát / xóa từng bài trong hàng chờ / xóa sạch danh sách**, **Thu nhỏ PiP** (không bị tải lại iframe khi chuyển giữa `world` ↔ `modal` ↔ `pip`).
- **Quả cầu gương Disco 7 sắc cầu vồng Gradient (`yt-disco`):**
  - Treo trên giàn truss trước màn chiếu (`(16.2, 6.45, 33.9)`), phủ texture mosaic `48×24` ô kính + shader cầu vồng lấp lánh, **44 tia sáng mảnh 7 sắc mờ tự nhiên tỏa mọi hướng** (`_mkRaysGeo`, 1 draw call), **120 đốm sáng phản chiếu (`InstancedMesh`)** xoay dưới sân & không gian xung quanh, cùng 2 `PointLight` đổi màu cầu vồng. Bật/tắt qua click trực tiếp quả cầu, nút HUD **`Quả cầu gương`**, hoặc trong modal YouTube.
- **28 nệm ngồi kiểu Chánh Điện (`cd-yt-0..cd-yt-27`):**
  - Xếp **4 hàng × 7 cột** ngay trước màn chiếu (`x = 11.4..21.0`, `z = 31.7..38.0`), click tới ngồi hướng mặt vào màn hình (`facing = Math.PI`), tính phút tĩnh tọa `sitMin`.
- **7 Bot thiện tín (`BotFx`):**
  - Tự tìm nệm ngồi xem chiếu (tối đa 6 bot ngồi đồng thời, luôn chừa ≥22 nệm cho người chơi), phản ứng & trò chuyện bong bóng chat khi có bài YouTube mới, bật/tắt Quả cầu gương, diệt quái/Boss, người mới vào/lên cấp, dùng động tác gần bot, và tự kéo ra cổ vũ gần cổng Tây khi sắp/đang Đua trâu.

### 3.7. Âm thanh Không gian 3D & Khu Ăn Uống (`VegFx` · Tiệc Chay 12h00 & 18h00)
- **Âm thanh không gian 3D (`Je.spatial`, mặc định bật):**
  - Khoảng cách tới Bàn DJ (`(8.4, 32.0)`), Đài YouTube (`(16.2, 28.5)`), Chánh điện (`(0, -10)`), Chuông chùa (`(-15, 52)`) tự động chỉnh âm lượng xa nhỏ – gần to + stereo pan trái/phải theo góc camera, đồng bộ công tắc trong tab Âm thanh.
- **Khu Ăn Uống (`client/chay/`, trung tâm `(39, 70)` bên cạnh Tháp nghỉ chân & Vườn hoa dâng Phật):**
  - **Không gian 3D:** Cổng vòm lối vào có biển 2 mặt & đèn lồng, thềm lát đá đối xứng trục `z = 70`, **1 Trai Đường chính + 2 Chòi Mái Che cong 2 bên**, Quầy Tiệc Chay 2 nồi đồng bốc khói, **8 bàn gỗ (`32` ghế ngồi `chay-t0-0..chay-t7-3`)** bày đầy đủ **8 món chay 3D** (*Bún Huế Chay*, *Cơm Sen Lá Bồ Đề*, *Bánh Bao Chay Ngũ Sắc*, *Nem & Chả Giò Chay*, *Đậu Hũ Kho Nấm Rơm*, *Lẩu Nấm Trường Thọ*, *Trà Sen Cung Đình*, *Chè Hạt Sen & Ngũ Quả*).
  - **Lịch Tiệc Chay 12h00 & 18h00 (`server/veg_feast.js`):** Tự động mở theo giờ VN (`UTC+7`, mặc định 60 phút mỗi ca `12h00–13h00` & `18h00–19h00`), khóa thọ trai & nhận Công đức khi chưa đến giờ mở tiệc, phát thông báo nhắc trước 5 phút / 1 phút và khi khai mở, thưởng **`+15 Công đức`** cho tối đa `3` món khác nhau mỗi ca tiệc (tổng `+45 Công đức`), danh hiệu mới **`Thiện thực Tịnh tâm`** (5 lần dự tiệc), hỗ trợ nút mở/đóng thử ngay trong `/admin` và chế độ Solo.

---

## 4. Lưu ý kỹ thuật khi phát triển & bảo trì tiếp

- **Cơ chế cập nhật `client/assets/main-CPNz0KLo.js`:**
  - Frontend sử dụng bản build bundle đã minify; mọi nâng cấp JS/CSS từ ngày 16–20/11 đều được áp dụng có kiểm soát thông qua script Node / module rời (`client/dj/`, `client/chay/`) kèm audit `'use strict'` để đảm bảo không trùng biến cục bộ minify.
  - Mỗi lần sửa bundle client cần tăng query cache-bust trong [client/index.html](file:///D:/python/didenchua/client/index.html) (hiện tại `?v=2026112002`) và cập nhật khớp trong `server/tests/verify_server.mjs`, sau đó nhắc người chơi nhấn **`Ctrl + F5`**.

---

## 5. Hướng dẫn Cài đặt, Chạy & Kiểm thử

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

### Kiểm tra cú pháp & Test E2E (đã verify pass toàn bộ ở trạng thái hiện tại)
```powershell
# 1. Kiểm tra cú pháp JS (exit code 0)
node --check client/assets/main-CPNz0KLo.js
node --check client/chay/index.js
node --check server/server.js
node --check server/veg_feast.js
node --check server/admin/admin.js
node --check server/race_schedule.js
node --check server/tests/verify_server.mjs

# 2. Chạy bộ test E2E (test cô lập trên port 18080, tự backup & khôi phục server/data/)
node server/tests/verify_server.mjs
```

> **Kết quả kiểm thử gần nhất (`2026-11-20`):**
> - `node --check` trên client bundle, `client/dj/*.js`, `client/chay/index.js` & backend server đều exit code `0`.
> - Kiểm thử GitHub Pages / đường dẫn tĩnh / Offline Solo Fallback (`test_gh_pages.mjs`): **pass toàn bộ**.
> - Runtime audit `'use strict'` (`audit_racesys.mjs`), `test_veg_chay.mjs`, `test_fxsound_dj.mjs`, `test_track_math.mjs` & `sim_race.mjs`: **pass toàn bộ**.
> - `node server/tests/verify_server.mjs`: **`ALL E2E ASSERTIONS PASSED!`** (exit code `0`), xác minh đầy đủ HTTP/WS (`/client/`, `/dj/*`, `/chay/*`, `veg-eat`, `dance-*`), nhiệm vụ, 18 danh hiệu, lịch đua trâu 10 phút, lịch Tiệc Chay 12h00 & 18h00, `duatrau-done`, `mob-kill` + cooldown, `yt-*` đồng bộ phòng & lưu `players.json` / `world.json`.
