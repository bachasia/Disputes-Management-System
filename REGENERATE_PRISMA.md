# Hướng dẫn Regenerate Prisma Client

Khi thêm field mới vào Prisma schema, bạn cần regenerate Prisma Client.

## Các bước:

1. **Dừng Dev Server:**
   - Nhấn `Ctrl+C` trong terminal đang chạy `npm run dev`

2. **Regenerate Prisma Client:**
   ```powershell
   npm run db:generate
   ```

3. **Khởi động lại Dev Server:**
   ```powershell
   npm run dev
   ```

## Lưu ý:

- Nếu gặp lỗi `EPERM: operation not permitted`, đảm bảo dev server đã được dừng hoàn toàn
- Sau khi regenerate, restart dev server để áp dụng thay đổi
- Field `invoiceNumber` đã được thêm vào schema và sẽ hoạt động sau khi regenerate

