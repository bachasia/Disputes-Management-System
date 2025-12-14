# Regenerate Prisma Client

## Vấn đề
Lỗi `Unknown field 'lastLoginAt'` xảy ra vì Prisma Client chưa được regenerate sau khi thêm field mới vào schema.

## Giải pháp

1. **Dừng dev server** (nếu đang chạy):
   - Nhấn `Ctrl+C` trong terminal đang chạy `npm run dev`

2. **Regenerate Prisma Client**:
   ```bash
   npm run db:generate
   ```
   hoặc
   ```bash
   npx prisma generate
   ```

3. **Khởi động lại dev server**:
   ```bash
   npm run dev
   ```

## Lưu ý
- Lỗi `EPERM` xảy ra khi dev server đang chạy và lock file Prisma Client
- Cần dừng dev server trước khi regenerate
- Sau khi regenerate xong, khởi động lại dev server
