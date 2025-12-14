# Các bước tiếp theo sau khi Build Docker thành công

## ✅ Bước 1: Tạo file `.env`

Tạo file `.env` trong thư mục root với các biến môi trường cần thiết:

```bash
# Windows PowerShell
Copy-Item env.example .env
```

Hoặc tạo file `.env` thủ công với nội dung:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=disputes_db
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=3000
NEXTAUTH_URL=http://localhost:3000

# NextAuth Secret (generate với: openssl rand -base64 32)
# Hoặc Windows PowerShell: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
NEXTAUTH_SECRET=your_nextauth_secret_here

# Encryption Key (32 characters minimum)
# Generate với: openssl rand -base64 32
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Optional: Cron Secret (default: NEXTAUTH_SECRET)
CRON_SECRET=your_cron_secret_here
```

**⚠️ Quan trọng**: Thay thế các giá trị `your_secure_password_here`, `your_nextauth_secret_here`, `your_32_character_encryption_key_here` bằng các giá trị thực tế và bảo mật.

## ✅ Bước 2: Khởi động Docker Containers

```bash
# Khởi động containers (detached mode)
docker compose up -d

# Xem logs để kiểm tra
docker compose logs -f
```

**Lưu ý**: 
- Container `postgres` sẽ khởi động trước
- Container `app` sẽ đợi `postgres` healthy rồi mới khởi động
- Entrypoint script sẽ tự động chạy migrations khi container khởi động

## ✅ Bước 3: Kiểm tra Containers đang chạy

```bash
# Xem trạng thái containers
docker compose ps

# Kiểm tra logs của app
docker compose logs app

# Kiểm tra logs của postgres
docker compose logs postgres
```

## ✅ Bước 4: Setup Database (nếu chưa tự động)

Nếu migrations chưa chạy tự động, chạy thủ công:

```bash
# Chạy migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data (admin user, etc.)
docker compose exec app npm run db:seed
```

**Lưu ý**: 
- File `docker-entrypoint.sh` đã được cấu hình để tự động chạy migrations khi container khởi động
- Nếu migrations đã chạy tự động, bạn có thể bỏ qua bước này

## ✅ Bước 5: Truy cập ứng dụng

Mở trình duyệt và truy cập:
- **URL**: http://localhost:3000
- **Login**: 
  - Email: `admin@example.com`
  - Password: `Admin@123456` (hoặc password đã được seed)

## ✅ Bước 6: Kiểm tra ứng dụng hoạt động

1. **Đăng nhập** với tài khoản admin
2. **Kiểm tra Dashboard** - xem có hiển thị đúng không
3. **Thêm PayPal Account** - thử thêm một PayPal account để test
4. **Sync Disputes** - thử sync disputes từ PayPal

## 🔧 Troubleshooting

### Container không khởi động

```bash
# Xem logs chi tiết
docker compose logs -f app

# Kiểm tra database connection
docker compose exec app npx prisma db pull
```

### Database connection error

```bash
# Kiểm tra postgres container
docker compose ps postgres

# Kiểm tra database đã sẵn sàng
docker compose exec postgres pg_isready -U postgres
```

### Migrations không chạy

```bash
# Chạy migrations thủ công
docker compose exec app npx prisma migrate deploy

# Kiểm tra Prisma schema
docker compose exec app npx prisma validate
```

### Reset database (nếu cần)

```bash
# Dừng containers
docker compose down

# Xóa volumes (database data sẽ bị xóa)
docker compose down -v

# Khởi động lại
docker compose up -d

# Chạy migrations và seed
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

## 📝 Các lệnh hữu ích

```bash
# Xem logs real-time
docker compose logs -f app

# Vào container app
docker compose exec app sh

# Vào container postgres
docker compose exec postgres psql -U postgres -d disputes_db

# Restart containers
docker compose restart

# Stop containers
docker compose stop

# Stop và xóa containers
docker compose down

# Rebuild và restart
docker compose up -d --build
```

## 🚀 Bước tiếp theo (Production Deployment)

Sau khi test thành công trên local, bạn có thể:

1. **Deploy lên VPS/Server**:
   - Xem file `VPS_DEPLOYMENT.md` để biết hướng dẫn chi tiết
   - Cấu hình Nginx reverse proxy
   - Setup SSL với Let's Encrypt

2. **Cấu hình Auto Sync**:
   - Vào Settings > Sync Settings
   - Bật Auto Sync
   - Cấu hình frequency và sync type

3. **Thêm PayPal Accounts**:
   - Vào PayPal Accounts page
   - Thêm các PayPal accounts cần quản lý
   - Test credentials trước khi sync

4. **Quản lý Users**:
   - Vào User Management (Admin only)
   - Thêm users mới
   - Phân quyền (Admin, User, Viewer)

## 📚 Tài liệu tham khảo

- `DOCKER_SETUP.md` - Hướng dẫn chi tiết về Docker setup
- `VPS_DEPLOYMENT.md` - Hướng dẫn deploy lên VPS
- `README.md` - Tổng quan về project

