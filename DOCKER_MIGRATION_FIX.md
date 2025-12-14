# Fix Database Migration Issue trong Docker

## Vấn đề

Lỗi: `The table 'public.users' does not exist in the current database`

Nguyên nhân: Migrations chưa được chạy hoặc chưa có migrations folder.

## Giải pháp đã áp dụng

Đã cập nhật `docker-entrypoint.sh` để:
1. Kiểm tra xem có migrations folder không
2. Nếu có migrations → chạy `prisma migrate deploy`
3. Nếu không có migrations → chạy `prisma db push` để sync schema

## Cách sử dụng

### Option 1: Sử dụng db push (Tự động)

Khi container khởi động, nếu không có migrations, sẽ tự động chạy `db push`:

```bash
docker compose up -d
```

### Option 2: Tạo migrations trước (Khuyến nghị cho Production)

1. **Tạo migrations trong local development:**

```bash
# Trong local machine
npx prisma migrate dev --name init
```

2. **Commit migrations folder vào Git:**

```bash
git add prisma/migrations
git commit -m "Add initial migrations"
git push
```

3. **Rebuild Docker image:**

```bash
docker compose build --no-cache
docker compose up -d
```

4. **Migrations sẽ tự động chạy khi container khởi động**

### Option 3: Chạy migrations thủ công

```bash
# Kiểm tra migrations có tồn tại không
docker compose exec app ls -la prisma/migrations

# Nếu có migrations, chạy deploy
docker compose exec app npx prisma@5.19.0 migrate deploy

# Nếu không có migrations, chạy db push
docker compose exec app npx prisma@5.19.0 db push
```

## Tạo Initial Migration

### Trong Local Development

```bash
# 1. Đảm bảo database đã được tạo
# 2. Update DATABASE_URL trong .env.local
# 3. Tạo migration
npx prisma migrate dev --name init

# Hoặc
npm run db:migrate
```

### Trong Docker Container (Development)

```bash
# Vào container
docker compose exec app sh

# Tạo migration
npx prisma migrate dev --name init
```

## So sánh: migrate deploy vs db push

### `prisma migrate deploy`
- ✅ Khuyến nghị cho production
- ✅ Có lịch sử migrations
- ✅ Có thể rollback
- ❌ Cần migrations folder

### `prisma db push`
- ✅ Nhanh, không cần migrations
- ✅ Tự động sync schema
- ❌ Không có lịch sử migrations
- ❌ Không thể rollback
- ⚠️ Chỉ dùng cho development hoặc initial setup

## Troubleshooting

### Migrations không chạy

```bash
# Kiểm tra logs
docker compose logs app | grep -i migration

# Chạy migrations thủ công
docker compose exec app npx prisma@5.19.0 migrate deploy
```

### Schema không sync

```bash
# Kiểm tra schema
docker compose exec app npx prisma@5.19.0 validate

# Force push schema
docker compose exec app npx prisma@5.19.0 db push --force-reset
```

### Database connection error

```bash
# Kiểm tra DATABASE_URL
docker compose exec app env | grep DATABASE_URL

# Kiểm tra database connection
docker compose exec app npx prisma@5.19.0 db pull
```

## Best Practices

1. **Development**: Sử dụng `prisma migrate dev` để tạo migrations
2. **Production**: Sử dụng `prisma migrate deploy` để chạy migrations
3. **Initial Setup**: Có thể dùng `db push` nếu chưa có migrations
4. **Commit migrations**: Luôn commit `prisma/migrations` folder vào Git

## Next Steps

Sau khi migrations chạy thành công:

1. **Seed database:**
   ```bash
   docker compose exec app npm run db:seed:prod
   ```

2. **Kiểm tra tables:**
   ```bash
   docker compose exec postgres psql -U postgres -d disputes_db -c "\dt"
   ```

3. **Truy cập ứng dụng:**
   - URL: http://localhost:3000
   - Login: admin@example.com / Admin@123456

