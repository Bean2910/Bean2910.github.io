# An Tự Duyên · Chùa Online 3D (Clone)

Dự án clone hoàn chỉnh game 3D **Đi Đến Chùa** (`https://didenchua.online/?phong=chua-1`), chia tách rõ ràng thành 2 thư mục **Frontend (`client/`)** và **Backend (`server/`)**.

> [!NOTE]
> **Cam kết không cài vào máy chính:** Toàn bộ thư viện đều được cô lập 100% trong thư mục cục bộ của dự án (`didenchua/server/node_modules/`). Tuyệt đối **không** cài bất kỳ gói global (`-g`) nào lên hệ điều hành của bạn.

---

## 1. Cấu trúc thư mục

```
didenchua/
├── client/                     # FRONTEND (Giao diện 3D & Trình duyệt)
│   ├── assets/                 # Bundle JS, CSS chính của game
│   ├── draco/                  # WebAssembly decoder giải nén 3D mesh tốc độ cao
│   ├── icons/                  # PWA Icons chùa
│   ├── models/                 # 39 mô hình 3D .glb (Phật Thích Ca, Bồ Tát, La Hán, chùa, cây bồ đề, trâu, rùa...)
│   ├── music/                  # Nhạc chánh điện & bài tụng kinh (A Di Đà, Bát Nhã, Đại Bi, Vãng Sanh...)
│   ├── index.html              # Trang chủ (đã gỡ bỏ Cloudflare telemetry tracker)
│   ├── manifest.webmanifest    # Cấu hình PWA
│   ├── package.json            # Cấu hình Vite dev server (tuỳ chọn)
│   └── vite.config.js          # Proxy tự động sang backend port 8080
│
├── server/                     # BACKEND (Máy chủ Realtime WebSocket & API + Admin GUI)
│   ├── admin/                  # Trang quản trị web (/admin)
│   ├── data/                   # Dữ liệu lưu trữ bền vững (players.json, world.json, config.json)
│   ├── node_modules/           # Thư viện phụ thuộc (cục bộ chỉ trong server)
│   ├── package.json            # Cấu hình dự án backend
│   └── server.js               # Máy chủ siêu nhẹ Node.js + WebSocket (ws)
│
└── README.md                   # Hướng dẫn chi tiết
```

---

## 2. Vì sao sử dụng Node.js làm Backend?

- **Siêu nhẹ & Tiết kiệm tài nguyên:** Server viết bằng Node.js với thư viện `ws` chuẩn hiệu năng cao, chỉ chiếm **~25MB RAM** khi hoạt động.
- **Mượt mà & Độ trễ cực thấp:** Cơ chế Non-blocking Event Loop xử lý hàng nghìn kết nối WebSocket đồng thời mà không bị giật lag, độ trễ phản hồi < 1ms.
- **Tương thích ngay lập tức:** Máy tính đã có sẵn Node.js (v25), không cần cài đặt thêm trình biên dịch phức tạp (như Rust/Go/C++).
- **Hỗ trợ 2 trong 1:** Backend vừa xử lý WebSocket Multiplayer, vừa có HTTP server tích hợp stream nhạc mp3 (HTTP 206 Partial Content) và phục vụ trực tiếp thư mục `client/` mà không cần cài thêm web server nào khác.

---

## 3. Cách chạy Game

Nếu vừa clone từ GitHub (`https://github.com/Bean2910/didenchua.git`), cài phụ thuộc cục bộ cho `server/` trước:

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
