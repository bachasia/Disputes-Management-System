# Settings Page Setup

Trang Settings đã được implement với Phase 1, bao gồm:

## ✅ Đã hoàn thành

### 1. Database Schema
- **Setting**: Model cho system-wide settings (admin only)
- **UserPreference**: Model cho user-specific preferences

### 2. API Endpoints
- `GET/PUT /api/settings` - Quản lý system settings (admin only)
- `GET/PUT /api/settings/user-preferences` - Quản lý user preferences
- `GET/PUT /api/settings/sync` - Quản lý sync settings (admin only)

### 3. Components
- **GeneralSettings**: Cài đặt chung (Timezone, Date Format, Items Per Page, Auto-refresh)
- **SyncSettings**: Cài đặt sync (Auto Sync, Frequency, Time, Alerts)
- **UserPreferences**: Preferences cá nhân (Default Filters, Sort, Columns)

### 4. Settings Page
- Trang `/settings` với 3 tabs: General, Sync, Preferences

## 📋 Cần làm sau khi setup

### Bước 1: Generate Prisma Client

Sau khi thêm models mới, cần generate Prisma Client:

```bash
# Dừng dev server trước (Ctrl+C)
npm run db:generate
```

**Lưu ý**: Nếu gặp lỗi `EPERM` trên Windows, hãy:
1. Dừng dev server (`Ctrl+C`)
2. Chạy `npm run db:generate`
3. Khởi động lại dev server (`npm run dev`)

### Bước 2: Kiểm tra Database

Đảm bảo các bảng đã được tạo:

```sql
-- Kiểm tra bảng settings
SELECT * FROM settings;

-- Kiểm tra bảng user_preferences
SELECT * FROM user_preferences;
```

## 🎯 Tính năng

### General Settings
- **Timezone**: Chọn timezone mặc định (UTC, Asia/Ho_Chi_Minh, etc.)
- **Date Format**: Format ngày tháng (MM/DD/YYYY, DD/MM/YYYY, etc.)
- **Time Format**: 12-hour hoặc 24-hour
- **Items Per Page**: 10, 20, 50, 100
- **Auto-refresh Interval**: Off, 30s, 1min, 5min, 10min

### Sync Settings (Admin only)
- **Auto Sync Enabled**: Bật/tắt auto sync
- **Sync Frequency**: Every 15min, 30min, 1hour, 6hours, Daily
- **Sync Time**: Thời gian sync (nếu chọn Daily)
- **Sync All Accounts**: Sync tất cả accounts hay chỉ selected
- **Sync on Startup**: Tự động sync khi khởi động
- **Sync Failure Alerts**: Cảnh báo khi sync thất bại

### User Preferences
- **Default Status Filter**: Filter mặc định (All, Open, Resolved, etc.)
- **Default Account Filter**: Account filter mặc định
- **Remember Last Filters**: Nhớ filters lần cuối
- **Default Sort**: Sort mặc định (Date, Amount, Status, etc.)
- **Default Sort Order**: Ascending/Descending
- **Columns to Display**: Chọn cột hiển thị trong disputes table

## 🔐 Permissions

- **General Settings**: Tất cả users có thể xem, admin có thể thay đổi system-wide settings, user có thể thay đổi preferences của mình
- **Sync Settings**: Chỉ admin có thể xem và thay đổi
- **User Preferences**: Mỗi user có thể thay đổi preferences của mình

## 📝 Lưu ý

1. Settings được lưu trong database, không phải localStorage
2. User preferences được lưu riêng cho mỗi user
3. System settings (admin) áp dụng cho toàn bộ hệ thống
4. Cần restart application để một số settings có hiệu lực (như auto-refresh interval)

## 🚀 Next Steps (Phase 2)

- Security Settings (Session timeout, Password policy)
- Notification Settings (Email notifications, SMTP)
- Data Management (Retention, Export)

