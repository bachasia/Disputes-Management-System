# Gợi ý Settings cho Trang /settings

Dựa trên ứng dụng PayPal Disputes Dashboard, đây là các settings nên có:

## 🔧 1. General Settings (Cài đặt chung)

### A. Application Settings
- **Application Name**: Tên ứng dụng (có thể customize)
- **Default Timezone**: Chọn timezone mặc định (UTC, Asia/Ho_Chi_Minh, etc.)
- **Date Format**: Format hiển thị ngày tháng (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- **Time Format**: 12-hour hoặc 24-hour format
- **Items Per Page**: Số items hiển thị mỗi trang (10, 20, 50, 100)
- **Auto-refresh Interval**: Tự động refresh data (Off, 30s, 1min, 5min, 10min)

### B. Display Settings
- **Theme**: Light mode / Dark mode (nếu có)
- **Language**: Ngôn ngữ hiển thị (English, Vietnamese, etc.)
- **Currency Display**: Currency format mặc định
- **Number Format**: Format số (1,000.00 hoặc 1.000,00)

## 🔐 2. Security Settings

### A. Encryption Settings
- **Encryption Key Status**: Hiển thị trạng thái encryption key (đã set chưa)
- **Regenerate Encryption Key**: Tạo lại encryption key mới (⚠️ Warning: sẽ cần re-encrypt tất cả PayPal credentials)
- **Key Rotation**: Lịch sử rotation encryption keys

### B. Session Settings
- **Session Timeout**: Thời gian timeout session (15min, 30min, 1hour, 2hours)
- **Remember Me Duration**: Thời gian "Remember me" (7 days, 30 days, 90 days)
- **Force Logout**: Đăng xuất tất cả sessions khác

### C. Password Policy
- **Minimum Password Length**: Độ dài password tối thiểu (8, 12, 16)
- **Require Special Characters**: Yêu cầu ký tự đặc biệt
- **Password Expiration**: Thời gian hết hạn password (30 days, 90 days, Never)
- **Password History**: Số lượng password cũ không được dùng lại

## 🔄 3. Sync Settings

### A. Auto Sync Settings
- **Auto Sync Enabled**: Bật/tắt auto sync
- **Sync Frequency**: Tần suất sync tự động (Every 15min, Every 30min, Every 1hour, Every 6hours, Daily)
- **Sync Time**: Thời gian sync (nếu chọn Daily)
- **Sync All Accounts**: Sync tất cả accounts hay chỉ active accounts
- **Sync on Startup**: Tự động sync khi khởi động ứng dụng

### B. Sync Notifications
- **Email Notifications**: Gửi email khi sync thành công/thất bại
- **Sync Failure Alerts**: Cảnh báo khi sync thất bại
- **Sync Summary**: Gửi summary hàng ngày/tuần

## 📧 4. Notification Settings

### A. Email Notifications
- **Email Enabled**: Bật/tắt email notifications
- **SMTP Settings**: 
  - SMTP Host
  - SMTP Port
  - SMTP Username
  - SMTP Password
  - From Email
  - From Name
- **Test Email**: Gửi test email để kiểm tra

### B. Notification Preferences
- **New Dispute Alert**: Cảnh báo khi có dispute mới
- **Dispute Status Change**: Thông báo khi status thay đổi
- **Sync Failure**: Thông báo khi sync thất bại
- **Daily Summary**: Summary hàng ngày
- **Weekly Report**: Báo cáo hàng tuần

## 📊 5. Analytics & Reporting Settings

### A. Default Analytics Period
- **Default Time Period**: Period mặc định khi mở Analytics (Last 7 days, Last 30 days, This month, etc.)
- **Default Date Range**: Date range mặc định

### B. Report Settings
- **Report Format**: Format export (CSV, Excel, PDF)
- **Include Charts**: Include charts trong reports
- **Auto-generate Reports**: Tự động generate reports (Daily, Weekly, Monthly)

## 🔍 6. Filter & Search Settings

### A. Default Filters
- **Default Status Filter**: Status filter mặc định (All, Open, Resolved)
- **Default Account Filter**: Account filter mặc định
- **Remember Last Filters**: Nhớ filters lần cuối

### B. Search Settings
- **Search Sensitivity**: Case-sensitive hay case-insensitive
- **Search Fields**: Fields nào được search (Dispute ID, Transaction ID, Customer Email, etc.)

## 🗄️ 7. Data Management Settings

### A. Data Retention
- **Dispute Retention Period**: Giữ disputes bao lâu (30 days, 90 days, 1 year, Forever)
- **Sync Log Retention**: Giữ sync logs bao lâu (7 days, 30 days, 90 days)
- **History Retention**: Giữ dispute history bao lâu
- **Auto Archive**: Tự động archive disputes cũ

### B. Data Export
- **Export Format**: Format mặc định (CSV, Excel, JSON)
- **Include Raw Data**: Include raw_data trong export
- **Batch Export Size**: Số lượng records mỗi batch

## 🔗 8. Integration Settings

### A. PayPal API Settings
- **API Timeout**: Timeout cho API calls (30s, 60s, 120s)
- **Retry Attempts**: Số lần retry khi API fail (1, 2, 3)
- **Rate Limiting**: Giới hạn số requests mỗi giờ
- **Sandbox Mode Default**: Mặc định dùng sandbox mode khi add account mới

### B. Webhook Settings (nếu có)
- **Webhook URL**: URL để nhận webhooks từ PayPal
- **Webhook Secret**: Secret key cho webhooks
- **Webhook Events**: Events nào muốn nhận (dispute.created, dispute.updated, etc.)

## 👥 9. User Preferences (User-specific)

### A. Dashboard Preferences
- **Default View**: View mặc định (Table, Cards, List)
- **Columns to Display**: Cột nào hiển thị trong disputes table
- **Sort Preference**: Sort mặc định (Date, Status, Amount)
- **Items Per Page**: Số items mỗi trang

### B. Notification Preferences (User-level)
- **Email Notifications**: Bật/tắt email cho user này
- **In-app Notifications**: Bật/tắt in-app notifications
- **Notification Types**: Loại notifications muốn nhận

## ⚙️ 10. System Settings (Admin only)

### A. System Configuration
- **Maintenance Mode**: Bật/tắt maintenance mode
- **System Status**: Trạng thái hệ thống
- **Database Status**: Trạng thái database connection
- **API Status**: Trạng thái PayPal API connectivity

### B. Backup & Restore
- **Auto Backup**: Tự động backup database
- **Backup Frequency**: Tần suất backup (Daily, Weekly, Monthly)
- **Backup Retention**: Giữ bao nhiêu backups
- **Manual Backup**: Tạo backup thủ công
- **Restore from Backup**: Restore từ backup

### C. Logging Settings
- **Log Level**: Log level (Debug, Info, Warning, Error)
- **Log Retention**: Giữ logs bao lâu
- **Enable Request Logging**: Log tất cả API requests
- **Enable Error Tracking**: Track errors chi tiết

## 📋 11. UI/UX Suggestions

### Layout Structure:
```
┌─────────────────────────────────────────┐
│  Header: Settings                       │
├─────────────────────────────────────────┤
│  Tabs:                                  │
│  - General                              │
│  - Security                             │
│  - Sync                                 │
│  - Notifications                        │
│  - Analytics                            │
│  - Data Management                      │
│  - Integrations                         │
│  - Preferences (User-specific)          │
│  - System (Admin only)                  │
└─────────────────────────────────────────┘
```

### Features:
- **Save Button**: Lưu settings với confirmation
- **Reset to Default**: Reset về mặc định
- **Export Settings**: Export settings ra file
- **Import Settings**: Import settings từ file
- **Settings History**: Lịch sử thay đổi settings (Admin)

## 🎯 12. Priority Implementation Order

### Phase 1 (Essential):
1. General Settings (Timezone, Date Format, Items Per Page)
2. Sync Settings (Auto Sync, Frequency)
3. User Preferences (Dashboard preferences)

### Phase 2 (Important):
4. Security Settings (Session timeout, Password policy)
5. Notification Settings (Email notifications)
6. Data Management (Retention, Export)

### Phase 3 (Nice to have):
7. Analytics Settings
8. Integration Settings
9. System Settings (Admin)
10. Backup & Restore

## 💡 13. Additional Suggestions

### A. Quick Actions
- **Clear Cache**: Xóa cache
- **Refresh Data**: Force refresh tất cả data
- **Test Connection**: Test kết nối PayPal API
- **View System Logs**: Xem system logs

### B. Help & Support
- **Documentation**: Link đến documentation
- **API Documentation**: PayPal API docs
- **Support Contact**: Thông tin liên hệ support
- **Version Info**: Hiển thị version của ứng dụng

### C. Advanced Settings
- **Debug Mode**: Bật/tắt debug mode
- **Verbose Logging**: Logging chi tiết
- **Performance Monitoring**: Monitor performance metrics
- **Feature Flags**: Enable/disable features

---

**Lưu ý**: 
- Settings nên được lưu trong database (bảng `Settings` hoặc `UserPreferences`)
- User-specific settings lưu theo user_id
- System-wide settings chỉ admin mới có thể thay đổi
- Có validation và confirmation cho các thay đổi quan trọng

Bạn muốn tôi implement phần nào trước?

