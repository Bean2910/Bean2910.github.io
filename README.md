# An Tự Duyên · Chùa Online 3D (Clone)

Dự án clone hoàn chỉnh game 3D **Đi Đến Chùa** (`https://didenchua.online/?phong=chua-1`), chia tách rõ ràng thành 2 thư mục **Frontend (`client/`)** và **Backend (`server/`)**.

> [!NOTE]
> **Cam kết không cài vào máy chính:** Toàn bộ thư viện đều được cô lập 100% trong thư mục cục bộ của dự án (`didenchua/server/node_modules/`). Tuyệt đối **không** cài bất kỳ gói global (`-g`) nào lên hệ điều hành của bạn.

---

## 1. Cấu trúc thư mục

```
didenchua/
├── index.html                  # Trang chuyển hướng vào ./client/ cho GitHub Pages (Folder: /(root))
├── .nojekyll                    # Tắt xử lý Jekyll để GitHub Pages phục vụ file tĩnh trực tiếp
├── client/                     # FRONTEND (Giao diện 3D & Trình duyệt — đường dẫn tương đối ./ )
│   ├── assets/                 # Bundle JS, CSS chính của game (hỗ trợ cả GitHub Pages Solo & WS)
│   ├── dj/                     # Module Bàn DJ 3D, FxSound EQ DSP & Động tác nhảy theo nhạc
│   ├── draco/                  # WebAssembly decoder giải nén 3D mesh tốc độ cao
│   ├── icons/                  # PWA Icons chùa
│   ├── models/                 # 45 mô hình 3D .glb (Phật Thích Ca, Bồ Tát, La Hán, Bạch Long Mã, 3 Đệ Tử, Siêu Xe...)
│   ├── music/                  # Nhạc chánh điện & bài tụng kinh (A Di Đà, Bát Nhã, Đại Bi, Vãng Sanh...)
│   ├── index.html              # Trang chủ game (đã gỡ Cloudflare telemetry, hỗ trợ ?server=wss://...)
│   ├── manifest.webmanifest    # Cấu hình PWA
│   ├── package.json            # Cấu hình Vite dev server (tuỳ chọn)
│   └── vite.config.js          # Proxy tự động sang backend port 8080
│
├── server/                     # BACKEND (Máy chủ Realtime WebSocket & API + Admin GUI)
│   ├── admin/                  # Trang quản trị web (/admin)
│   ├── data/                   # Dữ liệu lưu trữ bền vững (players.json, world.json, config.json)
│   ├── node_modules/           # Thư viện phụ thuộc (cục bộ chỉ trong server)
│   ├── tests/                  # Bộ kiểm thử E2E verify_server.mjs
│   ├── race_schedule.js        # Bộ tính lịch giải Đua Trâu theo giờ VN
│   ├── package.json            # Cấu hình dự án backend
│   └── server.js               # Máy chủ siêu nhẹ Node.js + WebSocket (ws)
│
├── run.bat                     # Script chạy nhanh trên Windows
├── BAN_GIAO_CONG_VIEC.md       # Tài liệu bàn giao chi tiết
└── README.md                   # Hướng dẫn chi tiết
```

---

## 2. Chạy trên GitHub Pages (Static + Chế độ Solo / Kết nối Server ngoài)

Repo đã được cấu hình sẵn để chạy trực tiếp với **GitHub Pages** (`https://github.com/Bean2910/Bean2910.github.io.git`, `Branch: main`, `Folder: /(root)` -> **`https://bean2910.github.io/`**):

- Mở `https://bean2910.github.io/` tự động chuyển hướng vào `./client/` (giữ nguyên tham số `?phong=...` hoặc `?server=...`).
- Vì GitHub Pages chỉ phục vụ file tĩnh (không chạy Node.js), client tự kích hoạt **Chế độ Solo Offline** khi chạy trên `*.github.io`: toàn bộ thế giới 3D, **Đài nhạc YouTube 16:9** (lưu cục bộ trên trình duyệt), **Quả cầu gương 7 sắc**, **Bàn DJ FxSound EQ**, **Động tác nhảy theo nhạc (J)**, **Đua Trâu / Bạch Long Mã / Siêu Xe**, **Cưỡi Hạc bay tự do**, **7 Bot tương tác** đều hoạt động đầy đủ.
- Nếu muốn chơi Multiplayer online từ GitHub Pages với backend Node.js (`server/`) host riêng (Render/Railway/VPS/ngrok...), truyền thêm `?server=wss://ten-mien-server` hoặc bấm mục **Máy chủ** trong game để dán URL server.

---

## 3. Vì sao sử dụng Node.js làm Backend?

- **Siêu nhẹ & Tiết kiệm tài nguyên:** Server viết bằng Node.js với thư viện `ws` chuẩn hiệu năng cao, chỉ chiếm **~25MB RAM** khi hoạt động.
- **Mượt mà & Độ trễ cực thấp:** Cơ chế Non-blocking Event Loop xử lý hàng nghìn kết nối WebSocket đồng thời mà không bị giật lag, độ trễ phản hồi < 1ms.
- **Tương thích ngay lập tức:** Máy tính đã có sẵn Node.js (v25), không cần cài đặt thêm trình biên dịch phức tạp (như Rust/Go/C++).
- **Hỗ trợ 2 trong 1:** Backend vừa xử lý WebSocket Multiplayer, vừa có HTTP server tích hợp stream nhạc mp3 (HTTP 206 Partial Content) và phục vụ trực tiếp thư mục `client/` mà không cần cài thêm web server nào khác.

---

## 4. Cách chạy Local Full Multiplayer

Nếu vừa clone từ GitHub (`https://github.com/Bean2910/Bean2910.github.io.git`), cài phụ thuộc cục bộ cho `server/` trước:

```powershell
cd server
npm install
npm start
```
*(hoặc nhấp đúp [`run.bat`](./run.bat) trên Windows, hoặc chạy `node server/server.js`)*

Sau đó mở trình duyệt truy cập:
- 👉 **Game 3D:** `http://localhost:8080/?phong=chua-1`
- 👉 **Trang Quản trị (Admin GUI):** `http://localhost:8080/admin` (hỗ trợ bật/tắt chia giờ Sáng/Chiều linh vật, cưỡi hạc tự do, chỉnh nhiệm vụ, điểm công đức, lễ hội, đố vui trực tiếp, người chơi, danh hiệu và Bảng vàng)

Kiểm thử E2E server:
```powershell
node server/tests/verify_server.mjs
```

Xem chi tiết tiến độ và phần việc tiếp theo trong tài liệu bàn giao: [`BAN_GIAO_CONG_VIEC.md`](./BAN_GIAO_CONG_VIEC.md).

*Lưu ý: Bạn không cần chạy `npm install` ở thư mục `client` trừ khi muốn chỉnh sửa code giao diện với Vite.*

---

## 4. Các tính năng & Tài nguyên đã clone

1. **Đồ hoạ 3D Three.js & Draco:**
   - Đầy đủ 39 mô hình 3D (.glb): Tượng Phật Thích Ca, Di Lặc, Quan Âm, Hộ Pháp, 18 vị La Hán, Chánh điện, Cây bồ đề, Hạc, Rùa, Trâu linh vật...
2. **Âm thanh chân thực:**
   - Tiếng chuông chùa, mõ, khánh, tiếng quét lá, tung hoa được tổng hợp thời gian thực bằng **Web Audio API** (không tốn dung lượng tải).
   - Nhạc thiền chánh điện & tụng kinh chất lượng cao (`/music/chanh-dien.mp3`, kinh A Di Đà, Bát Nhã, Chú Đại Bi...).
3. **Multiplayer Realtime:**
   - Hệ thống phòng (`phong=chua-1`, v.v.).
   - Đồng bộ vị trí di chuyển, xoay người, động tác ngồi thiền, lạy Phật, quét lá, lần tràng hạt.
   - Thắp hương (chánh điện, sân chùa, ban thờ), thỉnh chuông, gõ mõ, cúng dường đèn dầu.
   - Thả hoa đăng cầu an trên hồ sen, gửi lời nguyện, kết duyên.
   - Chat cộng đồng và bắn biểu cảm (chắp tay, thả tim, cúi chào...).
4. **Bỏ qua Captcha:**
   - Endpoint `/api/pass` tự động trả về `{ "off": true }`, giúp người chơi vào thẳng chùa mà không bị chặn bởi Cloudflare Turnstile.
