# Hướng Dẫn Chạy Thử Nghiệm Trên Windows

Hướng dẫn từng bước để chạy PayPal Disputes Dashboard trên PC Windows của bạn.

## Bước 1: Cài Đặt Node.js

1. **Download Node.js:**
   - Truy cập: https://nodejs.org/
   - Download phiên bản LTS (khuyến nghị: v20.x hoặc v18.x)
   - Chọn file `.msi` cho Windows

2. **Cài đặt:**
   - Chạy file `.msi` vừa download
   - Click "Next" và làm theo hướng dẫn
   - ✅ Đảm bảo tích chọn "Add to PATH" trong quá trình cài đặt

3. **Kiểm tra cài đặt:**
   Mở PowerShell hoặc Command Prompt mới và chạy:
   ```powershell
   node --version
   npm --version
   ```
   Nếu hiển thị version number thì đã cài đặt thành công!

## Bước 2: Setup PostgreSQL Database

### Option A: Dùng Docker (Khuyến nghị - Dễ nhất)

1. **Cài đặt Docker Desktop:**
   - Download: https://www.docker.com/products/docker-desktop/
   - Cài đặt và khởi động Docker Desktop

2. **Chạy PostgreSQL container:**
   Mở PowerShell trong thư mục project và chạy:
   ```powershell
   docker run --name disputes-postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=disputes_db -p 5432:5432 -d postgres:14
   ```

3. **Kiểm tra container đang chạy:**
   ```powershell
   docker ps
   ```

### Option B: Cài PostgreSQL Trực Tiếp

1. **Download PostgreSQL:**
   - Truy cập: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 14 hoặc 15
   - Cài đặt với password: `postgres123` (hoặc password bạn muốn)

2. **Tạo database:**
   - Mở pgAdmin hoặc psql
   - Tạo database mới tên: `disputes_db`

## Bước 3: Tạo File .env.local

1. **Copy file template:**
   Mở PowerShell trong thư mục project:
   ```powershell
   Copy-Item env.local.example .env.local
   ```

2. **Mở file `.env.local` và cập nhật:**

   **Nếu dùng Docker (Option A):**
   ```env
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/disputes_db"
   NEXTAUTH_SECRET="your-secret-here-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ENCRYPTION_KEY="your-32-character-encryption-key-here-must-be-at-least-32-chars"
   NODE_ENV="development"
   ```

   **Nếu cài PostgreSQL trực tiếp (Option B):**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/disputes_db"
   NEXTAUTH_SECRET="your-secret-here-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ENCRYPTION_KEY="your-32-character-encryption-key-here-must-be-at-least-32-chars"
   NODE_ENV="development"
   ```

3. **Generate secrets (tùy chọn nhưng khuyến nghị):**

   Mở PowerShell và chạy để generate NEXTAUTH_SECRET:
   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

   Generate ENCRYPTION_KEY (phải ít nhất 32 ký tự):
   ```powershell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```

   Copy kết quả và paste vào file `.env.local`

## Bước 4: Cài Đặt Dependencies

Mở PowerShell trong thư mục project và chạy:
```powershell
npm install
```

Quá trình này có thể mất vài phút để download tất cả packages.

## Bước 5: Setup Database

1. **Generate Prisma Client:**
   ```powershell
   npm run db:generate
   ```

2. **Push schema vào database:**
   ```powershell
   npm run db:push
   ```

   Nếu thành công, bạn sẽ thấy message: "Your database is now in sync with your Prisma schema."

## Bước 6: (Tùy chọn) Seed Dữ Liệu Mẫu

Chạy để tạo user test:
```powershell
npm run db:seed
```

Sẽ tạo user: `admin@example.com` / `password123`

## Bước 7: Chạy Development Server

```powershell
npm run dev
```

Bạn sẽ thấy:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in Xs
```

## Bước 8: Mở Trình Duyệt

Mở trình duyệt và truy cập: **http://localhost:3000**

## Các Lệnh Hữu Ích

### Xem Database (Prisma Studio)
```powershell
npm run db:studio
```
Mở trình duyệt tại: http://localhost:5555

### Dừng Development Server
Nhấn `Ctrl + C` trong terminal

### Dừng PostgreSQL Container (nếu dùng Docker)
```powershell
docker stop disputes-postgres
```

### Khởi động lại PostgreSQL Container
```powershell
docker start disputes-postgres
```

## Troubleshooting

### Lỗi: "Cannot find module"
```powershell
# Xóa node_modules và cài lại
Remove-Item -Recurse -Force node_modules
npm install
```

### Lỗi: "Port 3000 already in use"
```powershell
# Tìm process đang dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay <PID> bằng số PID từ lệnh trên)
taskkill /PID <PID> /F
```

### Lỗi: "Database connection failed"
1. Kiểm tra PostgreSQL đang chạy:
   - Docker: `docker ps` (phải thấy disputes-postgres)
   - Local: Check Services (tìm "postgresql")

2. Kiểm tra DATABASE_URL trong `.env.local` đúng chưa

3. Test connection:
   ```powershell
   # Nếu dùng Docker
   docker exec -it disputes-postgres psql -U postgres -d disputes_db
   
   # Nếu cài local
   psql -U postgres -d disputes_db
   ```

### Lỗi: "ENCRYPTION_KEY must be at least 32 characters"
Đảm bảo ENCRYPTION_KEY trong `.env.local` có ít nhất 32 ký tự.

## Next Steps

Sau khi chạy thành công:

1. ✅ Truy cập http://localhost:3000
2. ✅ Thêm PayPal account tại `/accounts`
3. ✅ Sync disputes tại `/disputes`
4. ✅ Xem chi tiết dispute

## Cần Giúp Đỡ?

- Xem file `DEVELOPMENT_SETUP.md` để biết thêm chi tiết
- Kiểm tra logs trong terminal để xem lỗi cụ thể



