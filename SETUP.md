# Setup Instructions

## Bước 1: Cài đặt Node.js và Dependencies

Đảm bảo bạn đã cài đặt Node.js 18+ trước khi tiếp tục.

Sau đó, chạy lệnh sau để cài đặt tất cả dependencies:

```bash
npm install
```

## Bước 2: Tạo file .env.local

Tạo file `.env.local` trong thư mục gốc của project và copy nội dung từ `env.local.example`:

**Trên Windows (PowerShell):**
```powershell
Copy-Item env.local.example .env.local
```

**Trên Linux/Mac:**
```bash
cp env.local.example .env.local
```

Sau đó, chỉnh sửa file `.env.local` với các giá trị thực tế của bạn:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/disputes_db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-encryption-key-here"
```

### Tạo các secret keys:

**NEXTAUTH_SECRET:**
```bash
# Trên Linux/Mac
openssl rand -base64 32

# Trên Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**ENCRYPTION_KEY:**
Sử dụng cùng cách như trên để tạo một key ngẫu nhiên 32 bytes.

## Bước 3: Setup Database

1. Đảm bảo PostgreSQL đang chạy và bạn đã tạo database:

```sql
CREATE DATABASE disputes_db;
```

2. Generate Prisma Client:
```bash
npm run db:generate
```

3. Push schema vào database:
```bash
npm run db:push
```

Hoặc tạo migration:
```bash
npm run db:migrate
```

## Bước 4: Chạy Development Server

```bash
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

## Cấu trúc Project

```
src/
├── app/
│   ├── (auth)/          # Routes xác thực
│   ├── (dashboard)/     # Routes dashboard
│   │   ├── disputes/    # Quản lý disputes
│   │   ├── accounts/    # Quản lý tài khoản PayPal
│   │   └── analytics/   # Phân tích và báo cáo
│   ├── api/             # API routes
│   │   ├── disputes/    # API endpoints cho disputes
│   │   ├── accounts/    # API endpoints cho accounts
│   │   └── webhooks/    # Webhook handlers
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── disputes/        # Components liên quan đến disputes
│   └── accounts/        # Components liên quan đến accounts
├── lib/
│   ├── paypal/          # PayPal API client
│   ├── db/              # Database utilities
│   └── utils/           # Utility functions
└── types/               # TypeScript type definitions
```

## Các Scripts Có Sẵn

- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run start` - Chạy production server
- `npm run lint` - Chạy ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes vào database
- `npm run db:migrate` - Chạy database migrations
- `npm run db:studio` - Mở Prisma Studio

## Lưu Ý

- File `.env.local` không được commit vào git (đã có trong .gitignore)
- Đảm bảo `ENCRYPTION_KEY` được giữ bí mật và không thay đổi sau khi đã mã hóa credentials
- Database schema có thể được chỉnh sửa trong `prisma/schema.prisma`



