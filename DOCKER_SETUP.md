# Docker Setup Guide

Hướng dẫn triển khai ứng dụng PayPal Disputes Management System trên Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (để clone repository)

## Quick Start

### 1. Tạo file `.env` cho Docker

Tạo file `.env` trong thư mục root của project:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=disputes_db
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=3000
NEXTAUTH_URL=http://localhost:3000

# NextAuth Secret (generate với openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_here

# Encryption Key (32 characters minimum)
ENCRYPTION_KEY=your_32_character_encryption_key

# Optional: Cron Secret
CRON_SECRET=your_cron_secret_here
```

### 2. Production Deployment

#### Build và chạy với Docker Compose:

```bash
# Build và start containers
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop containers
docker-compose down

# Stop và xóa volumes (database data sẽ bị xóa)
docker-compose down -v
```

#### Setup database sau khi containers đã chạy:

```bash
# Chạy migrations
docker-compose exec app npx prisma migrate deploy

# Seed initial data
docker-compose exec app npm run db:seed
```

### 3. Development với Docker

```bash
# Build và chạy development containers
docker-compose -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop containers
docker-compose -f docker-compose.dev.yml down
```

**Lưu ý**: Development mode sẽ mount source code để hot reload hoạt động.

## Chi tiết các Services

### PostgreSQL Database

- **Image**: `postgres:16-alpine`
- **Port**: 5432 (có thể thay đổi trong `.env`)
- **Data Volume**: `postgres_data` (production) hoặc `postgres_data_dev` (development)
- **Health Check**: Tự động kiểm tra database readiness

### Next.js Application

- **Base Image**: `node:20-alpine`
- **Port**: 3000 (có thể thay đổi trong `.env`)
- **Build**: Multi-stage build để tối ưu image size
- **Output**: Standalone mode cho production

## Database Migrations

### Production

```bash
# Deploy migrations
docker-compose exec app npx prisma migrate deploy

# Seed data
docker-compose exec app npm run db:seed
```

### Development

```bash
# Create migration
docker-compose -f docker-compose.dev.yml exec app npx prisma migrate dev

# Reset database
docker-compose -f docker-compose.dev.yml exec app npm run db:reset
```

## Environment Variables

### Required Variables

- `DATABASE_URL`: Tự động tạo từ POSTGRES_* variables
- `NEXTAUTH_URL`: URL của ứng dụng
- `NEXTAUTH_SECRET`: Secret key cho NextAuth
- `ENCRYPTION_KEY`: Key để encrypt PayPal credentials (32+ characters)

### Optional Variables

- `CRON_SECRET`: Secret cho cron jobs (default: NEXTAUTH_SECRET)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `APP_PORT`: Application port (default: 3000)

## Useful Commands

### Production

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Execute commands in container
docker-compose exec app npm run db:generate
docker-compose exec app npx prisma studio

# Stop services
docker-compose stop

# Remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Execute commands
docker-compose -f docker-compose.dev.yml exec app npm run lint
docker-compose -f docker-compose.dev.yml exec app npx prisma studio
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d disputes_db
```

### Application Build Issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check build logs
docker-compose build 2>&1 | tee build.log
```

### Prisma Issues

```bash
# Regenerate Prisma Client
docker-compose exec app npx prisma generate

# Reset database
docker-compose exec app npx prisma migrate reset
```

### Port Already in Use

Nếu port đã được sử dụng, thay đổi trong `.env`:

```env
APP_PORT=3001
POSTGRES_PORT=5433
```

## Production Deployment Best Practices

1. **Use Secrets Management**: Không commit `.env` file, sử dụng Docker secrets hoặc environment variables từ hosting platform

2. **Use Reverse Proxy**: Sử dụng Nginx hoặc Traefik để reverse proxy và SSL termination

3. **Backup Database**: Setup regular backups cho PostgreSQL volume

4. **Monitor Logs**: Setup log aggregation (ELK, Loki, etc.)

5. **Health Checks**: Monitor container health với health checks

6. **Resource Limits**: Set CPU và memory limits trong docker-compose.yml

## Example với Nginx Reverse Proxy

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - dispute-network

  # ... existing services
```

## Backup và Restore Database

### Backup

```bash
docker-compose exec postgres pg_dump -U postgres disputes_db > backup.sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U postgres disputes_db < backup.sql
```

## Security Considerations

1. **Change Default Passwords**: Đổi tất cả default passwords
2. **Use Strong Secrets**: Generate strong secrets cho NEXTAUTH_SECRET và ENCRYPTION_KEY
3. **Network Isolation**: Sử dụng Docker networks để isolate services
4. **Non-root User**: Application chạy với non-root user (nextjs)
5. **Read-only Volumes**: Mount volumes với read-only khi có thể

## Scaling

Để scale application:

```bash
# Scale app service
docker-compose up -d --scale app=3

# Use load balancer (Nginx, Traefik, etc.)
```

## Cleanup

```bash
# Remove all containers, networks, and volumes
docker-compose down -v

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

