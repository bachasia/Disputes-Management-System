# Fix Prisma Version Issue trong Docker

## Vấn đề

Khi chạy `npx prisma migrate deploy` trong Docker container, Prisma CLI đang sử dụng version 7.1.0 (mới nhất) thay vì version 5.19.0 được định nghĩa trong `package.json`. Prisma 7.x có breaking changes và không tương thích với schema hiện tại.

## Giải pháp đã áp dụng

### 1. Copy Prisma packages vào runner stage

Đã cập nhật `Dockerfile` để copy các Prisma packages từ builder stage:

```dockerfile
# Copy Prisma and related packages to ensure correct version
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json
```

### 2. Sử dụng local Prisma CLI

Đã cập nhật `docker-entrypoint.sh` để sử dụng Prisma CLI từ `node_modules` thay vì tải version mới nhất:

```bash
# Run migrations using local Prisma CLI (from node_modules)
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -f "./node_modules/prisma/package.json" ]; then
  # Use npx with specific version from package.json
  PRISMA_VERSION=$(node -p "require('./node_modules/prisma/package.json').version" 2>/dev/null || echo "5.19.0")
  npx "prisma@${PRISMA_VERSION}" migrate deploy
else
  # Fallback: use version from package.json or default
  npx prisma@5.19.0 migrate deploy
fi
```

### 3. Cài đặt postgresql-client

Đã thêm `postgresql-client` vào runner stage để có `pg_isready` command cho database health check:

```dockerfile
RUN apk add --no-cache libc6-compat openssl postgresql-client
```

## Cách sử dụng

### Rebuild Docker image

```bash
docker compose build --no-cache
```

### Chạy containers

```bash
docker compose up -d
```

### Kiểm tra Prisma version trong container

```bash
docker compose exec app ./node_modules/.bin/prisma --version
```

Kết quả mong đợi: `prisma 5.19.0` (hoặc version trong package.json)

### Chạy migrations thủ công (nếu cần)

```bash
docker compose exec app ./node_modules/.bin/prisma migrate deploy
```

## Lưu ý

- **Không sử dụng `npx prisma`** trực tiếp trong container vì nó sẽ tải version mới nhất
- **Luôn sử dụng `./node_modules/.bin/prisma`** hoặc `npx prisma@5.19.0` để đảm bảo version đúng
- Nếu cần upgrade Prisma, cập nhật `package.json` và rebuild image

## Troubleshooting

### Nếu vẫn gặp lỗi Prisma 7.x

1. Kiểm tra Prisma version trong container:
   ```bash
   docker compose exec app cat node_modules/prisma/package.json | grep version
   ```

2. Nếu version không đúng, rebuild image:
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

3. Xóa cache và rebuild:
   ```bash
   docker compose down -v
   docker system prune -a
   docker compose build --no-cache
   docker compose up -d
   ```

### Nếu migrations không chạy tự động

Chạy thủ công:
```bash
docker compose exec app ./node_modules/.bin/prisma migrate deploy
```

