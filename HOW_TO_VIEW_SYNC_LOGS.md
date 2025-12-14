# Cách Xem Sync Logs

## 1. Terminal/Console của Dev Server

Khi bạn chạy `npm run dev`, logs sẽ hiển thị trong terminal đó.

### Các logs bạn sẽ thấy:

```
[Sync] First page response: { itemsCount: X, totalItems: Y, ... }
[Sync] Sample dispute structure: { ... }  <-- ĐÂY LÀ LOG BẠN CẦN XEM
[Sync] Fetched page 1: X disputes
[Sync] Parsing amount for dispute XXX: { value: "...", currency: "..." }
[Sync] Upserting dispute XXX: { amount: "...", currency: "..." }
```

## 2. Cách Xem

### Bước 1: Mở Terminal
- Nếu đang chạy dev server, mở terminal đó
- Hoặc mở terminal mới và chạy: `npm run dev`

### Bước 2: Sync Disputes
- Vào trang Disputes trong browser
- Click nút "Sync Now"
- Quay lại terminal để xem logs

### Bước 3: Tìm Log
- Scroll lên trong terminal để tìm dòng `[Sync] Sample dispute structure`
- Log này sẽ hiển thị JSON structure của dispute đầu tiên

## 3. Nếu Không Thấy Logs

### Kiểm tra:
1. **Dev server có đang chạy không?**
   ```powershell
   # Kiểm tra process
   Get-Process node
   ```

2. **Có lỗi trong terminal không?**
   - Xem có error messages không
   - Có thể sync đã fail trước khi đến bước log

3. **Thử sync lại:**
   - Click "Sync Now" lại
   - Xem terminal logs ngay lập tức

## 4. Copy Logs

Nếu thấy log `[Sync] Sample dispute structure`, copy toàn bộ JSON và gửi cho tôi để phân tích.

## 5. Alternative: Xem trong Database

Nếu không thấy logs, có thể xem `raw_data` trong database:

```sql
SELECT 
  dispute_id, 
  dispute_amount, 
  dispute_currency,
  raw_data->'transactions' as transactions,
  raw_data->'offer' as offer
FROM disputes 
WHERE dispute_amount IS NULL
LIMIT 1;
```

Hoặc dùng Prisma Studio:
```powershell
npm run db:studio
```

Sau đó:
1. Mở table `disputes`
2. Click vào một dispute
3. Xem field `raw_data` (JSON)
4. Tìm `transactions` array và xem structure

