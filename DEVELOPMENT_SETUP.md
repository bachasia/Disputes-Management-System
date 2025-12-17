# Development Setup Guide

Hướng dẫn setup môi trường development cho PayPal Disputes Dashboard.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed (hoặc Docker)
- npm hoặc yarn package manager

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup Environment Variables

1. Copy file `.env.local.example` thành `.env.local`:

```bash
# Windows (PowerShell)
Copy-Item env.local.example .env.local

# Linux/Mac
cp env.local.example .env.local
```

2. Mở file `.env.local` và cập nhật các giá trị:

### Database Configuration

```env
DATABASE_URL="postgresql://user:password@localhost:5432/disputes_db"
```

Thay đổi:
- `user`: PostgreSQL username (thường là `postgres`)
- `password`: PostgreSQL password
- `localhost:5432`: Host và port (mặc định là localhost:5432)
- `disputes_db`: Tên database

### Generate Secrets

**NEXTAUTH_SECRET:**
```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

**ENCRYPTION_KEY:**
```bash
# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

**Lưu ý:** ENCRYPTION_KEY phải có ít nhất 32 ký tự.

### Final .env.local Example

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/disputes_db"
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-generated-32-character-key-here"
NODE_ENV="development"
```

## Step 3: Setup PostgreSQL Database

### Option A: Install PostgreSQL Locally

1. **Download và cài đặt PostgreSQL:**
   - Windows: https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql@14`
   - Linux: `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL service:**
   ```bash
   # Windows (Services)
   # Tìm "postgresql" trong Services và start

   # Mac/Linux
   brew services start postgresql@14
   # hoặc
   sudo systemctl start postgresql
   ```

3. **Tạo database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Tạo database
   CREATE DATABASE disputes_db;

   # Exit
   \q
   ```

### Option B: Use Docker

1. **Chạy PostgreSQL container:**
   ```bash
   docker run --name disputes-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=yourpassword \
     -e POSTGRES_DB=disputes_db \
     -p 5432:5432 \
     -d postgres:14
   ```

2. **Update DATABASE_URL trong .env.local:**
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/disputes_db"
   ```

## Step 4: Setup Database Schema

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Push schema to database:**
   ```bash
   npm run db:push
   ```

   Hoặc tạo migration:
   ```bash
   npm run db:migrate
   ```

## Step 5: (Optional) Seed Initial Data

Chạy seed script để tạo dữ liệu mẫu:

```bash
npm run db:seed
```

Điều này sẽ tạo:
- Test user: `admin@example.com` / `password123`
- Sample PayPal account

## Step 6: Start Development Server

```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed initial data

## Prisma Studio

Để xem và quản lý dữ liệu trực quan:

```bash
npm run db:studio
```

Mở trình duyệt tại [http://localhost:5555](http://localhost:5555)

## Troubleshooting

### Database Connection Error

1. Kiểm tra PostgreSQL đang chạy:
   ```bash
   # Windows
   # Check Services

   # Mac/Linux
   brew services list
   # hoặc
   sudo systemctl status postgresql
   ```

2. Kiểm tra DATABASE_URL trong `.env.local` đúng format

3. Test connection:
   ```bash
   psql $DATABASE_URL
   ```

### Prisma Client Not Generated

```bash
npm run db:generate
```

### Migration Issues

Nếu có lỗi migration, có thể reset database (⚠️ sẽ xóa tất cả dữ liệu):

```bash
npx prisma migrate reset
```

### Port Already in Use

Nếu port 3000 đã được sử dụng:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

Hoặc chạy trên port khác:

```bash
PORT=3001 npm run dev
```

## Next Steps

1. ✅ Setup hoàn tất
2. Thêm PayPal accounts qua UI tại `/accounts`
3. Sync disputes từ PayPal accounts
4. Xem disputes tại `/disputes`

## Security Notes

- ⚠️ **KHÔNG** commit file `.env.local` vào git
- ⚠️ Sử dụng strong secrets trong production
- ⚠️ Encrypt PayPal credentials trước khi lưu vào database
- ⚠️ Sử dụng environment variables khác nhau cho dev/staging/production



