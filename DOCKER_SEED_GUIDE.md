# Hướng dẫn Seed Database trong Docker Production

## Vấn đề

Trong production Docker container, `tsx` không có sẵn vì nó là dev dependency. Do đó, không thể chạy `npm run db:seed` (sử dụng TypeScript).

## Giải pháp

Đã tạo file `prisma/seed.js` (JavaScript version) để chạy trong production container mà không cần `tsx`.

## Cách sử dụng

### Trong Docker Production Container

```bash
# Chạy seed script (JavaScript version)
docker compose exec app npm run db:seed:prod
```

Hoặc chạy trực tiếp với Node.js:

```bash
docker compose exec app node prisma/seed.js
```

### Trong Local Development

Vẫn sử dụng TypeScript version:

```bash
npm run db:seed
```

## Scripts có sẵn

- `npm run db:seed` - Chạy seed TypeScript (development, cần tsx)
- `npm run db:seed:prod` - Chạy seed JavaScript (production, không cần tsx)

## Seed Data

Script sẽ tạo:

1. **Admin User**:
   - Email: `admin@example.com`
   - Password: `Admin@123456`
   - Role: `admin`

2. **Regular User**:
   - Email: `user@example.com`
   - Password: `User@123456`
   - Role: `user`

⚠️ **Lưu ý**: Đổi mật khẩu sau lần đăng nhập đầu tiên!

## Troubleshooting

### Lỗi: "Cannot find module '@prisma/client'"

Đảm bảo Prisma Client đã được generate:

```bash
docker compose exec app npx prisma@5.19.0 generate
```

### Lỗi: "Cannot find module 'bcryptjs'"

Đảm bảo dependencies đã được cài đặt. Trong production container, các dependencies runtime đã được copy từ builder stage.

### Seed đã chạy nhưng không tạo users

Script sẽ không tạo lại users nếu đã tồn tại. Kiểm tra database:

```bash
docker compose exec app npx prisma@5.19.0 studio
```

Hoặc kiểm tra trực tiếp:

```bash
docker compose exec postgres psql -U postgres -d disputes_db -c "SELECT email, role FROM users;"
```

## Tự động Seed khi Container khởi động

Nếu muốn tự động seed khi container khởi động, có thể thêm vào `docker-entrypoint.sh`:

```bash
# Run seed (only if users table is empty)
if [ "$AUTO_SEED" = "true" ]; then
  echo "Running seed..."
  node prisma/seed.js || true
fi
```

Sau đó thêm biến môi trường trong `docker-compose.yml`:

```yaml
environment:
  AUTO_SEED: "true"
```

Tuy nhiên, **không khuyến nghị** seed tự động trong production vì có thể gây ra duplicate data.

