# Development Troubleshooting Guide

## Kiểm tra nhanh

### 1. Kiểm tra Server đang chạy

Từ log của bạn, server đã start thành công:
```
✓ Ready in 1472ms
GET / 307 in 3501ms (redirect)
GET /disputes 200 in 4984ms (OK)
```

### 2. Kiểm tra Browser Console

Mở browser DevTools (F12) và kiểm tra:
- **Console tab**: Có lỗi JavaScript nào không?
- **Network tab**: Có request nào fail không?
- **Application tab**: Cookies và Session có được tạo không?

### 3. Kiểm tra Authentication

1. **Truy cập**: http://localhost:3000
2. **Kỳ vọng**: Redirect đến `/login` nếu chưa login
3. **Login với**:
   - Email: `admin@example.com`
   - Password: `Admin@123456` (hoặc password đã được seed)

### 4. Kiểm tra Database Connection

```bash
# Kiểm tra PostgreSQL đang chạy
# Windows
Get-Service postgresql*

# Hoặc kiểm tra connection
npm run db:studio
```

### 5. Kiểm tra Environment Variables

Đảm bảo file `.env.local` có:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/disputes_db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-32-character-key"
```

## Các vấn đề thường gặp

### Vấn đề 1: Trang trắng / Không load

**Nguyên nhân có thể:**
- JavaScript error trong browser
- Database connection failed
- Authentication error

**Giải pháp:**
1. Mở DevTools (F12) → Console tab
2. Xem lỗi cụ thể
3. Kiểm tra Network tab xem API calls có fail không

### Vấn đề 2: Redirect loop

**Nguyên nhân:**
- Middleware redirect nhưng session không được tạo
- NEXTAUTH_SECRET không đúng

**Giải pháp:**
```bash
# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Restart server
npm run dev
```

### Vấn đề 3: Database connection error

**Nguyên nhân:**
- PostgreSQL không chạy
- DATABASE_URL sai
- Database chưa được tạo

**Giải pháp:**
```bash
# Kiểm tra PostgreSQL
# Windows
Get-Service postgresql*

# Tạo database nếu chưa có
# Connect to PostgreSQL và chạy:
# CREATE DATABASE disputes_db;

# Chạy migrations
npm run db:push
npm run db:seed
```

### Vấn đề 4: Authentication không hoạt động

**Nguyên nhân:**
- NEXTAUTH_SECRET không đúng
- Session không được tạo
- Cookies bị block

**Giải pháp:**
1. Kiểm tra `.env.local` có NEXTAUTH_SECRET
2. Clear browser cookies
3. Thử Incognito/Private window
4. Kiểm tra browser có block cookies không

### Vấn đề 5: Prisma Client chưa được generate

**Lỗi:** `PrismaClient is not configured`

**Giải pháp:**
```bash
npm run db:generate
```

## Debug Steps

### Step 1: Kiểm tra Logs

Xem terminal logs khi truy cập trang:
- Có lỗi gì không?
- Middleware có chạy không?
- API calls có được gọi không?

### Step 2: Kiểm tra Browser

1. Mở DevTools (F12)
2. Console tab → Xem errors
3. Network tab → Xem failed requests
4. Application tab → Xem cookies và session

### Step 3: Test API Endpoints

```bash
# Test health check
curl http://localhost:3000/api/auth/session

# Test database
npm run db:studio
```

### Step 4: Clear và Rebuild

```bash
# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Clear node_modules (nếu cần)
Remove-Item -Recurse -Force node_modules
npm install

# Regenerate Prisma Client
npm run db:generate

# Restart server
npm run dev
```

## Kiểm tra cụ thể

### 1. Kiểm tra Middleware

Middleware logs sẽ hiển thị trong terminal:
```
[Middleware] Processing request to: /disputes
[Middleware] Token exists: true/false
[Middleware] Is protected route: true
```

### 2. Kiểm tra Session

Trong browser DevTools → Application → Cookies:
- Có cookie `next-auth.session-token` không?
- Cookie có giá trị không?

### 3. Kiểm tra Database

```bash
# Mở Prisma Studio
npm run db:studio

# Hoặc test connection
npx prisma db execute --command "SELECT 1"
```

## Common Error Messages

### "PrismaClient is not configured"
```bash
npm run db:generate
```

### "Invalid credentials"
- Kiểm tra email/password đúng chưa
- Kiểm tra user đã được seed chưa: `npm run db:seed`

### "Database connection failed"
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong `.env.local`

### "NEXTAUTH_SECRET is missing"
- Đảm bảo `.env.local` có NEXTAUTH_SECRET
- Restart server sau khi thêm

## Nếu vẫn không hoạt động

1. **Share error message cụ thể** từ browser console
2. **Share terminal logs** khi truy cập trang
3. **Kiểm tra**:
   - Database có đang chạy không?
   - `.env.local` có đúng không?
   - User đã được seed chưa?

