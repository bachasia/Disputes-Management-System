# Middleware Authentication Fix

## Vấn đề
Middleware không protect routes, vẫn có thể truy cập các trang mà không cần login.

## Giải pháp
Đã cập nhật `middleware.ts` với matcher pattern cụ thể để chỉ protect các routes cần thiết.

## Cách kiểm tra

### 1. Restart Dev Server
**QUAN TRỌNG**: Middleware chỉ được load khi start server, cần restart:

```powershell
# Dừng server (Ctrl + C)
# Sau đó start lại
npm run dev
```

### 2. Test Authentication

1. **Clear browser cookies/session**:
   - Mở DevTools (F12)
   - Application tab → Cookies → Clear all
   - Hoặc dùng Incognito/Private window

2. **Truy cập các routes**:
   - http://localhost:3000/ → Should redirect to /login
   - http://localhost:3000/disputes → Should redirect to /login
   - http://localhost:3000/accounts → Should redirect to /login
   - http://localhost:3000/admin/users → Should redirect to /login

3. **Sau khi login**:
   - Có thể truy cập tất cả routes (trừ admin routes nếu không phải admin)
   - Admin routes chỉ accessible với role = 'admin'

## Routes được protect

- `/` (home - redirects to /disputes)
- `/disputes/*`
- `/accounts/*`
- `/analytics/*`
- `/settings/*`
- `/profile/*`
- `/admin/*` (requires admin role)

## Routes không bị protect

- `/login` - Login page
- `/api/auth/*` - NextAuth API routes
- `/_next/*` - Next.js internal files
- Static files (images, etc.)

## Troubleshooting

Nếu vẫn không hoạt động:

1. **Kiểm tra file middleware.ts ở root**:
   ```powershell
   Test-Path middleware.ts
   # Should return True
   ```

2. **Kiểm tra NEXTAUTH_SECRET trong .env.local**:
   ```env
   NEXTAUTH_SECRET="your-secret-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Clear Next.js cache**:
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

4. **Kiểm tra console logs**:
   - Mở browser DevTools
   - Xem Network tab khi truy cập routes
   - Kiểm tra có redirect đến /login không

