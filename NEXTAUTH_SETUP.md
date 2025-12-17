# NextAuth.js Setup Instructions

## ✅ Đã Hoàn Thành

### 1. Dependencies
- ✅ `next-auth` - Đã có trong package.json
- ✅ `@next-auth/prisma-adapter` - Đã cài đặt
- ✅ `bcryptjs` - Đã cài đặt
- ✅ `@types/bcryptjs` - Đã cài đặt

### 2. Prisma Schema
- ✅ Đã thêm models: `Account`, `Session`, `VerificationToken`
- ✅ Đã thêm model: `UserAccountPermission` cho permissions
- ✅ Đã update `User` model với các fields cần thiết
- ✅ Đã update `PayPalAccount` model với relation đến permissions

### 3. NextAuth API Route
- ✅ Đã tạo: `src/app/api/auth/[...nextauth]/route.ts`
- ✅ Credentials provider với email/password
- ✅ JWT strategy
- ✅ Session callbacks với role support

### 4. TypeScript Types
- ✅ Đã tạo: `src/types/next-auth.d.ts`
- ✅ Extended User, Session, và JWT types

## 🔄 Bước Tiếp Theo

### 1. Dừng Dev Server (nếu đang chạy)
Nhấn `Ctrl + C` trong terminal đang chạy `npm run dev`

### 2. Generate Prisma Client
```powershell
npm run db:generate
```

### 3. Push Schema vào Database
```powershell
npm run db:push
```

### 4. Update Seed Data (nếu cần)
```powershell
npm run db:seed
```

### 5. Start Dev Server
```powershell
npm run dev
```

## 📝 Test Authentication

1. Truy cập: http://localhost:3000/api/auth/signin
2. Đăng nhập với:
   - Email: `admin@example.com`
   - Password: `password123`

## 🔐 Environment Variables

Đảm bảo file `.env.local` có:
```env
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

## 📚 Next Steps

1. Tạo login page tại `/login`
2. Tạo middleware để protect routes
3. Tạo session provider cho client components
4. Implement logout functionality


