# 🌌 Arc Nexus - Future Tech Store dApp (Soroban)

[![Smart Contract Test](https://github.com/your-username/arc-restaurant/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/arc-restaurant/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Arc Nexus** là một ứng dụng phi tập trung (dApp) tiên phong được xây dựng trên nền tảng **Stellar Soroban**. Dự án không chỉ là một cửa hàng công nghệ tương lai mà còn là một minh chứng kỹ thuật cho khả năng tích hợp Smart Contract phức tạp, xử lý sự kiện thời gian thực và kiến trúc ứng dụng chuẩn Production.

---

## 🚀 Thông tin Deployment
- **Contract ID**: `CALNBNJF7HWOU2T4H33JSOWOZX57NPAHEVENJKDFEWE7363PKF62HCAI`
- **Mạng lưới**: Stellar Testnet (Protocol 22)
- **Token thanh toán**: XLM (via Stellar Asset Contract - SAC)
- **Địa chỉ Token**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

---

## 🛠 Yêu cầu Kỹ thuật & Giải pháp (Checklist 10/10)

### 1. Phát triển Smart Contract nâng cao
Contract được viết bằng Rust với Soroban SDK v22+, hỗ trợ quản lý trạng thái (Storage), xác thực chủ sở hữu và xử lý thanh toán minh bạch.

### 2. Giao tiếp liên Contract (Inter-contract communication)
Hệ thống sử dụng cơ chế Cross-Contract Call để tương tác với **Stellar Asset Contract (SAC)**. Khi người dùng mua hàng, Contract sẽ gọi hàm `transfer` của Token Contract để di chuyển XLM từ khách hàng sang nhà hàng.

### 3. Luồng sự kiện thời gian thực (Event streaming)
Sử dụng Soroban RPC `getEvents` để lắng nghe các sự kiện `PaymentEvent` và `InitializedEvent`. Giao diện tự động cập nhật Dashboard ngay khi giao dịch được chốt trên Ledger.

### 4. Thiết lập CI/CD Pipeline
Tích hợp **GitHub Actions** (`.github/workflows/ci.yml`) tự động chạy `cargo test` và kiểm tra định dạng code mỗi khi có commit mới.

### 5. Quy trình Deployment tự động
Cung cấp Script `deploy-contract.mjs` tùy chỉnh, tự động hóa quy trình: Biên dịch WASM -> Upload -> Create Contract -> Initialize -> Cập nhật Environment `.env`.

### 6. Mobile Responsive Frontend
Giao diện được xây dựng với CSS Grid/Flexbox và phong cách **Glassmorphism**, đảm bảo hiển thị hoàn hảo trên mọi thiết bị từ Desktop đến Smartphone.

### 7. Xử lý lỗi & Trạng thái tải (Error Handling)
Hệ thống có cơ chế phòng vệ chống lỗi XDR Parsing (`Bad union switch: 4`), tự động retry khi nạp tiền Friendbot và hiển thị Error Boundary khi có sự cố Runtime.

### 8. Viết Test đầy đủ
- **Contract Test**: 4/4 test passed (bao gồm test logic, test lỗi tiềm ẩn và test quyền hạn).
- **Frontend Test**: Đã kiểm tra luồng kết nối ví và mô phỏng giao dịch.

### 9. Kiến trúc chuẩn Production
Cấu trúc thư mục tối ưu với Frontend ở Root, tách biệt logic Blockchain (`lib/soroban.js`) và Component UI. Sử dụng bộ biên dịch `wasm32v1-none` để tối ưu kích thước và tốc độ.

### 10. Tài liệu & Demo
Tài liệu đầy đủ, mã nguồn sạch sẽ và sẵn sàng cho việc quay video demo 1-2 phút.

---

## 📦 Hướng dẫn cài đặt

1. **Cài đặt dependencies**:
   ```ps1
   npm install
   ```

2. **Biên dịch Contract (Nâng cao)**:
   Để tránh lỗi tương thích, sử dụng các cờ tối ưu:
   ```ps1
   $env:RUSTFLAGS="-C target-feature=-reference-types -C target-cpu=mvp"
   cargo build --target wasm32v1-none --release --package restaurant-contract
   ```

3. **Deploy & Khởi chạy**:
   ```ps1
   node scripts/deploy-contract.mjs
   npm run dev
   ```

## 🧪 Kết quả Kiểm thử (Test Output)
```text
running 4 tests
test test::test_init_sets_owner_and_name ... ok
test test::test_init_twice_panics - should panic ... ok
test test::test_pay_zero_amount_panics - should panic ... ok
test test::test_pay_transfers_tokens_and_updates_balance ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; finished in 0.03s
```

---

## ✅ Submission Checklist Tracking
- [x] **README with complete documentation**
- [x] **Minimum 10+ meaningful commits**
- [x] **Live demo link**: [https://arc-nexus-tech.vercel.app/](https://arc-nexus-tech.vercel.app/)
- [x] **Contract deployment address**: `CALNBNJF7HWOU2T4H33JSOWOZX57NPAHEVENJKDFEWE7363PKF62HCAI`
- [x] **Test output with 3+ passing tests** (4/4 Passed)
- [x] **CI/CD pipeline configuration** (GitHub Actions ready)
- [x] **Mobile responsive UI** (Optimized via CSS Grid/Flexbox)
- [x] **Public GitHub repository**: [https://github.com/okokok04/arc-restaurant](https://github.com/okokok04/arc-restaurant)
- [ ] **Demo video link** (User to record 1-2 mins and add link here)

---
*Built with ❤️ for the Stellar community.*
