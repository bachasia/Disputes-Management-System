# Auto Sync Setup Guide

## Overview

Auto Sync đã được triển khai để tự động đồng bộ disputes từ PayPal accounts theo lịch trình đã cấu hình.

## Components

### 1. API Endpoint: `/api/cron/sync`

- **POST**: Trigger auto sync (được gọi bởi cron job)
- **GET**: Health check endpoint để kiểm tra trạng thái

### 2. Auto Sync Service: `src/lib/services/auto-sync.ts`

Service xử lý logic auto sync:
- Kiểm tra settings từ database
- Xác định thời điểm chạy sync dựa trên frequency
- Trigger sync cho tất cả active accounts

### 3. Settings UI: `/settings`

Admin có thể cấu hình:
- **Auto Sync Enabled**: Bật/tắt auto sync
- **Sync Frequency**: Tần suất sync (15 phút, 30 phút, 1 giờ, 6 giờ, Daily)
- **Sync Time**: Thời gian sync (cho Daily)
- **Sync Type**: Loại sync (Incremental, 90 Days, Full)
- **Sync on Startup**: Tự động sync khi app khởi động
- **Sync Failure Alerts**: Cảnh báo khi sync thất bại

## Setup Instructions

### Option 1: Vercel Cron Jobs (Recommended)

1. File `vercel.json` đã được cấu hình với cron job chạy mỗi 15 phút
2. Khi deploy lên Vercel, cron job sẽ tự động hoạt động
3. Vercel sẽ gọi `POST /api/cron/sync` mỗi 15 phút

### Option 2: External Cron Service

Nếu không dùng Vercel, có thể setup external cron service:

1. **EasyCron** hoặc **cron-job.org**:
   - URL: `https://your-domain.com/api/cron/sync`
   - Method: POST
   - Headers: `Authorization: Bearer <CRON_SECRET>`
   - Schedule: Mỗi 15 phút (`*/15 * * * *`)

2. **Set CRON_SECRET** trong environment variables:
   ```env
   CRON_SECRET=your-secret-token-here
   ```

### Option 3: Manual Testing

Có thể test auto sync bằng cách gọi API trực tiếp:

```bash
# Test health check
curl https://your-domain.com/api/cron/sync

# Test trigger sync (với authentication)
curl -X POST https://your-domain.com/api/cron/sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## How It Works

1. **Cron job** gọi `POST /api/cron/sync` mỗi 15 phút
2. **AutoSyncService.checkAndRunAutoSync()** được gọi:
   - Kiểm tra `autoSyncEnabled` trong settings
   - Nếu disabled → skip
   - Nếu enabled → kiểm tra frequency:
     - **Daily (1440 minutes)**: Chỉ chạy khi thời gian hiện tại khớp với `syncTime` (trong khoảng 5 phút)
     - **Interval-based** (15, 30, 60, 360 minutes): Chỉ chạy nếu đã qua đủ thời gian từ lần sync cuối
3. Nếu điều kiện thỏa mãn → trigger sync cho tất cả active accounts
4. Lưu `lastAutoSyncCheck` vào database để track lần check cuối

## Sync Types

- **Incremental**: Chỉ sync disputes đã update từ lần sync trước (nhanh nhất)
- **90 Days**: Sync tất cả disputes từ 90 ngày trước
- **Full**: Sync tất cả disputes từ đầu (chậm nhất, chỉ dùng khi cần)

## Security

- Endpoint `/api/cron/sync` được bảo vệ bởi `CRON_SECRET` hoặc `NEXTAUTH_SECRET`
- Chỉ admin mới có thể thay đổi auto sync settings
- External cron service cần gửi `Authorization: Bearer <SECRET>` header

## Monitoring

- Check logs trong console để xem auto sync status
- Health check endpoint (`GET /api/cron/sync`) trả về:
  - `autoSyncEnabled`: Trạng thái bật/tắt
  - `syncFrequency`: Tần suất sync
  - `syncType`: Loại sync
  - `lastAutoSyncCheck`: Thời gian check cuối

## Troubleshooting

1. **Auto sync không chạy**:
   - Kiểm tra `autoSyncEnabled` trong settings
   - Kiểm tra cron job có đang chạy không
   - Kiểm tra logs trong console

2. **Sync chạy quá thường xuyên**:
   - Kiểm tra `syncFrequency` setting
   - Kiểm tra `lastAutoSyncCheck` trong database

3. **Daily sync không chạy đúng giờ**:
   - Kiểm tra `syncTime` setting (format: HH:mm, 24-hour)
   - Kiểm tra timezone của server

## Notes

- Auto sync chỉ chạy khi có ít nhất 1 active PayPal account
- Sync on startup sẽ chạy khi app khởi động (nếu enabled)
- Tất cả sync operations đều được log vào `sync_logs` table


