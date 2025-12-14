# Middleware Debug Guide

## Vấn đề
1. Middleware không protect routes - vẫn có thể truy cập mà không cần login
2. User Menu không hiển thị

## Debug Steps

### 1. Kiểm tra Middleware có được load không

**Restart dev server và xem console logs:**
```powershell
# Dừng server (Ctrl + C)
# Clear cache
Remove-Item -Recurse -Force .next
# Start lại
npm run dev
```

**Khi truy cập http://localhost:3000/disputes, bạn sẽ thấy logs:**
```
[Middleware] Processing request to: /disputes
[Middleware] Token exists: false
[Middleware] Is protected route: true
[Middleware] No token, redirecting to login
```

### 2. Nếu không thấy logs

Middleware có thể không được load. Kiểm tra:

1. **File middleware.ts phải ở root directory** (cùng level với package.json)
2. **Kiểm tra file có tồn tại:**
   ```powershell
   Test-Path middleware.ts
   ```

3. **Kiểm tra syntax:**
   ```powershell
   npm run build
   ```

### 3. Test Middleware trực tiếp

Thêm console.log vào đầu middleware function để xem có được gọi không.

### 4. Kiểm tra User Menu

UserMenu sẽ:
- Hiển thị loading state khi `status === "loading"`
- Hiển thị Login button nếu `!session?.user`
- Hiển thị full menu nếu có session

**Kiểm tra:**
- Mở browser DevTools → Console
- Xem có lỗi gì không
- Kiểm tra Network tab → Xem có request đến `/api/auth/session` không

### 5. Kiểm tra SessionProvider

SessionProvider phải wrap toàn bộ app trong `src/app/layout.tsx`

### 6. Alternative: Client-side protection

Nếu middleware không hoạt động, có thể thêm client-side check trong layout:

```typescript
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return <div>{children}</div>;
}
```

