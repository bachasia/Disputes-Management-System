# Prisma Setup Instructions

Sau khi đã cài đặt Node.js và chạy `npm install`, thực hiện các bước sau:

## 1. Generate Prisma Client

```bash
npx prisma generate
```

Hoặc sử dụng npm script:
```bash
npm run db:generate
```

## 2. Push Schema vào Database

```bash
npx prisma db push
```

Hoặc sử dụng npm script:
```bash
npm run db:push
```

**Lưu ý:** Đảm bảo bạn đã:
- Tạo file `.env.local` với `DATABASE_URL` đúng
- PostgreSQL đang chạy
- Database đã được tạo (ví dụ: `disputes_db`)

## 3. (Tùy chọn) Tạo Migration

Nếu muốn sử dụng migrations thay vì `db push`:

```bash
npx prisma migrate dev --name init
```

## 4. (Tùy chọn) Mở Prisma Studio

Để xem và quản lý dữ liệu trực quan:

```bash
npx prisma studio
```

## Schema Overview

### Tables Created:

1. **users** - Quản lý người dùng hệ thống
2. **paypal_accounts** - Lưu thông tin tài khoản PayPal
3. **disputes** - Lưu thông tin disputes từ PayPal
4. **dispute_history** - Lịch sử thay đổi của disputes
5. **dispute_messages** - Tin nhắn/evidence của disputes
6. **sync_logs** - Log các lần sync dữ liệu từ PayPal

### Key Features:

- Tất cả ID sử dụng UUID
- Relations đầy đủ với cascade delete
- Indexes được tối ưu cho các truy vấn thường dùng
- Hỗ trợ JSONB cho dữ liệu linh hoạt (raw_data, metadata, attachments)
- Timestamps tự động (created_at, updated_at)


