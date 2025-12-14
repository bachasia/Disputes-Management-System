# Fix OpenSSL Issue trong Docker Build

## Vấn đề

Prisma cần OpenSSL để chạy, nhưng Alpine Linux mới (3.17+) đã chuyển sang OpenSSL 3.0 và không còn package `openssl1.1-compat`.

## Giải pháp đã áp dụng

Đã thay đổi từ `openssl1.1-compat` sang `openssl` (OpenSSL 3.0) vì:
- Prisma 5.19.0+ đã hỗ trợ OpenSSL 3.0
- Alpine Linux mới chỉ có OpenSSL 3.0

## Nếu vẫn gặp lỗi

### Giải pháp 1: Cập nhật Prisma (Khuyến nghị)

```bash
npm install @prisma/client@latest prisma@latest
```

### Giải pháp 2: Sử dụng OpenSSL 1.1 từ Edge Repository

Nếu Prisma vẫn cần OpenSSL 1.1, thêm edge repository:

```dockerfile
RUN apk add --no-cache libc6-compat && \
    apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main openssl1.1-compat
```

### Giải pháp 3: Sử dụng Debian-based Image

Thay vì Alpine, sử dụng Debian:

```dockerfile
FROM node:20-slim AS base
# Debian có OpenSSL 1.1 sẵn
```

### Giải pháp 4: Build Prisma với OpenSSL 3.0

Thêm biến môi trường để Prisma sử dụng OpenSSL 3.0:

```dockerfile
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
```

## Kiểm tra

Sau khi build, kiểm tra Prisma có hoạt động:

```bash
docker compose exec app npx prisma --version
docker compose exec app npx prisma generate
```

