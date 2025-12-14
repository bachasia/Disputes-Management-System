# 🚀 BẮT ĐẦU TẠI ĐÂY - Hướng Dẫn Chạy Thử Nghiệm

## ⚡ Quick Start (5 phút)

### 1️⃣ Cài Node.js (Nếu chưa có)
- Download: https://nodejs.org/ (chọn LTS version)
- Cài đặt và khởi động lại terminal

### 2️⃣ Setup Database với Docker (Dễ nhất)

Mở PowerShell và chạy:
```powershell
docker run --name disputes-postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=disputes_db -p 5432:5432 -d postgres:14
```

**Nếu chưa có Docker:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop/
- Hoặc cài PostgreSQL trực tiếp: https://www.postgresql.org/download/windows/

### 3️⃣ Cài Đặt Dependencies

```powershell
npm install
```

### 4️⃣ Setup Database Schema

```powershell
npm run db:generate
npm run db:push
```

### 5️⃣ Chạy Server

```powershell
npm run dev
```

### 6️⃣ Mở Trình Duyệt

Truy cập: **http://localhost:3000**

---

## 📝 Chi Tiết

Xem file **QUICK_START_WINDOWS.md** để biết hướng dẫn chi tiết từng bước.

## ⚠️ Lưu Ý

1. **File `.env.local` đã được tạo sẵn** với giá trị mặc định
2. **Cập nhật DATABASE_URL** nếu bạn dùng password khác
3. **ENCRYPTION_KEY** phải có ít nhất 32 ký tự (đã có sẵn trong file)

## 🐛 Gặp Lỗi?

1. Kiểm tra Node.js đã cài: `node --version`
2. Kiểm tra PostgreSQL đang chạy: `docker ps` (nếu dùng Docker)
3. Xem file `QUICK_START_WINDOWS.md` phần Troubleshooting


