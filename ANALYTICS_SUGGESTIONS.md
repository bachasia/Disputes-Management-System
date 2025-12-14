# Gợi ý Thống Kê cho Trang Analytics

Dựa trên dữ liệu Disputes có sẵn, đây là các thống kê nên có trong trang Analytics:

## 📊 1. Overview Metrics (KPI Cards)

### Cards hiển thị ở đầu trang:
- **Total Disputes** - Tổng số disputes
- **Open Disputes** - Số disputes đang mở
- **Resolved Disputes** - Số disputes đã giải quyết
- **Win Rate** - Tỷ lệ thắng (%)
- **Total Dispute Amount** - Tổng giá trị disputes (theo currency)
- **Average Resolution Time** - Thời gian giải quyết trung bình (ngày)
- **Disputes This Month** - Số disputes trong tháng này
- **Disputes Last Month** - Số disputes tháng trước (để so sánh)

## 📈 2. Charts & Visualizations

### A. Disputes Over Time (Line Chart)
- **Mục đích**: Xem xu hướng disputes theo thời gian
- **Dữ liệu**: Số disputes theo ngày/tuần/tháng
- **Filter**: Có thể chọn timeframe (7 days, 30 days, 90 days, 1 year)
- **Hiển thị**: 
  - Line cho total disputes
  - Có thể thêm line cho resolved disputes
  - So sánh với tháng trước

### B. Disputes by Status (Pie/Donut Chart)
- **Mục đích**: Phân bổ disputes theo trạng thái
- **Dữ liệu**: 
  - OPEN
  - WAITING_FOR_SELLER_RESPONSE
  - UNDER_REVIEW
  - RESOLVED
  - CLOSED
- **Hiển thị**: Pie chart với màu sắc phân biệt

### C. Disputes by Type/Reason (Bar Chart)
- **Mục đích**: Xem loại disputes nào phổ biến nhất
- **Dữ liệu**: 
  - MERCHANDISE_OR_SERVICE_NOT_RECEIVED
  - MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED
  - UNAUTHORISED
  - CREDIT_NOT_PROCESSED
- **Hiển thị**: Horizontal bar chart, sắp xếp theo số lượng

### D. Disputes by Account (Bar Chart)
- **Mục đích**: Xem account nào có nhiều disputes nhất
- **Dữ liệu**: Group by `paypalAccountId`
- **Hiển thị**: Bar chart với tên account

### E. Win Rate Trend (Line Chart)
- **Mục đích**: Xem xu hướng win rate theo thời gian
- **Dữ liệu**: Win rate theo tháng
- **Hiển thị**: Line chart với target line (ví dụ: 80%)

### F. Dispute Amount by Currency (Bar Chart)
- **Mục đích**: Xem tổng giá trị disputes theo từng currency
- **Dữ liệu**: Sum `disputeAmount` group by `disputeCurrency`
- **Hiển thị**: Bar chart với currency labels

### G. Resolution Time Distribution (Histogram)
- **Mục đích**: Xem phân bổ thời gian giải quyết disputes
- **Dữ liệu**: `resolvedAt - disputeCreateTime` (tính bằng ngày)
- **Hiển thị**: Histogram với buckets (0-7 days, 8-14 days, 15-30 days, 30+ days)

## 📅 3. Time-based Analysis

### A. Daily/Weekly/Monthly Disputes
- **Tabs**: Daily | Weekly | Monthly
- **Hiển thị**: Table hoặc bar chart với số disputes theo từng period
- **Filter**: Date range picker

### B. Trends Comparison
- **Mục đích**: So sánh tháng này vs tháng trước
- **Metrics**:
  - Total disputes: +X% hoặc -X%
  - Win rate: +X% hoặc -X%
  - Average resolution time: +X days hoặc -X days
- **Hiển thị**: Cards với arrows (up/down) và màu sắc (green/red)

### C. Peak Dispute Periods
- **Mục đích**: Xác định thời điểm có nhiều disputes nhất
- **Dữ liệu**: Group by day of week, hour of day
- **Hiển thị**: Heatmap hoặc bar chart

## 🏢 4. Account Performance

### A. Disputes per Account (Table)
- **Columns**: 
  - Account Name
  - Total Disputes
  - Open Disputes
  - Resolved Disputes
  - Win Rate
  - Total Amount
  - Average Resolution Time
- **Sortable**: Có thể sort theo bất kỳ column nào
- **Filter**: Có thể filter theo account

### B. Account Comparison Chart
- **Mục đích**: So sánh performance giữa các accounts
- **Hiển thị**: Multi-series bar chart
  - Series 1: Total Disputes
  - Series 2: Win Rate (%)

## 🔍 5. Dispute Reasons Analysis

### A. Most Common Dispute Reasons
- **Mục đích**: Xem lý do disputes phổ biến nhất
- **Dữ liệu**: Count by `disputeReason`
- **Hiển thị**: Horizontal bar chart

### B. Resolution Rate by Reason
- **Mục đích**: Xem lý do nào dễ giải quyết nhất
- **Dữ liệu**: Win rate group by `disputeReason`
- **Hiển thị**: Bar chart với win rate %

## 📋 6. Additional Insights

### A. Response Time Analysis
- **Mục đích**: Xem thời gian phản hồi disputes
- **Dữ liệu**: `responseDueDate - disputeCreateTime`
- **Hiển thị**: 
  - Average response time
  - Disputes approaching deadline (warning)
  - Overdue disputes (critical)

### B. Dispute Channel Analysis
- **Mục đích**: Xem disputes đến từ kênh nào
- **Dữ liệu**: Count by `disputeChannel` (INTERNAL, EXTERNAL, etc.)
- **Hiển thị**: Pie chart

### C. Customer Analysis
- **Mục đích**: Xem khách hàng nào có nhiều disputes
- **Dữ liệu**: Count by `customerEmail` hoặc `customerName`
- **Hiển thị**: Table với top 10 customers có nhiều disputes nhất

## 🎨 7. UI/UX Suggestions

### Layout Structure:
```
┌─────────────────────────────────────────┐
│  Header: Analytics + Date Range Filter  │
├─────────────────────────────────────────┤
│  KPI Cards Row (4-8 cards)              │
├─────────────────────────────────────────┤
│  Charts Section:                        │
│  ┌──────────────┬──────────────┐        │
│  │ Disputes     │ Status       │        │
│  │ Over Time    │ Distribution │        │
│  └──────────────┴──────────────┘        │
│  ┌──────────────┬──────────────┐        │
│  │ Disputes by  │ Win Rate     │        │
│  │ Type/Reason  │ Trend        │        │
│  └──────────────┴──────────────┘        │
│  ┌──────────────┬──────────────┐        │
│  │ Account      │ Resolution   │        │
│  │ Performance  │ Time         │        │
│  └──────────────┴──────────────┘        │
├─────────────────────────────────────────┤
│  Tables Section:                        │
│  - Account Performance Table            │
│  - Top Customers Table                  │
└─────────────────────────────────────────┘
```

### Features:
- **Date Range Filter**: Cho phép chọn timeframe (Last 7 days, Last 30 days, Last 90 days, Custom range)
- **Account Filter**: Filter theo PayPal account
- **Export**: Export charts/data ra CSV/PDF
- **Refresh**: Auto-refresh hoặc manual refresh button
- **Responsive**: Mobile-friendly layout

## 🛠️ 8. Technical Implementation

### API Endpoints cần tạo:
1. `/api/analytics/overview` - KPI metrics
2. `/api/analytics/disputes-over-time` - Time series data
3. `/api/analytics/disputes-by-status` - Status distribution
4. `/api/analytics/disputes-by-type` - Type distribution
5. `/api/analytics/account-performance` - Account metrics
6. `/api/analytics/win-rate-trend` - Win rate over time
7. `/api/analytics/resolution-time` - Resolution time analysis

### Libraries suggested:
- **Charts**: Recharts (React) hoặc Chart.js
- **Date handling**: date-fns (đã có)
- **Tables**: shadcn/ui Table component (đã có)

## 📝 9. Priority Implementation Order

### Phase 1 (Essential):
1. KPI Cards (Overview Metrics)
2. Disputes Over Time Chart
3. Disputes by Status Chart
4. Date Range Filter

### Phase 2 (Important):
5. Disputes by Type/Reason Chart
6. Account Performance Table
7. Win Rate Trend Chart

### Phase 3 (Nice to have):
8. Resolution Time Analysis
9. Customer Analysis
10. Export functionality

---

**Lưu ý**: Tất cả các thống kê nên hỗ trợ filter theo:
- Date range
- PayPal Account
- Status
- Dispute Type

Bạn muốn tôi implement phần nào trước?

