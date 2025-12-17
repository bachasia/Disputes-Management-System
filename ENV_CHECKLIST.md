# Checklist kiểm tra file .env

## ✅ Những gì ĐÚNG:

1. ✅ **POSTGRES_USER**: `postgres` - OK
2. ✅ **POSTGRES_PASSWORD**: `dtcadmin123456` - OK (nhưng nên dùng password mạnh hơn)
3. ✅ **POSTGRES_DB**: `disputes_db` - OK
4. ✅ **POSTGRES_PORT**: `5432` - OK
5. ✅ **APP_PORT**: `5000` - OK (khác với default 3000)
6. ✅ **NEXTAUTH_URL**: `http://ppdispute.ngohoan.com:5000` - OK (có domain và port)
7. ✅ **NEXTAUTH_SECRET**: Có giá trị - OK
8. ✅ **ENCRYPTION_KEY**: Có giá trị - OK
9. ✅ **CRON_SECRET**: Có giá trị - OK

## ⚠️ Những gì cần SỬA:

### 1. Bỏ dấu ngoặc kép trong NEXTAUTH_SECRET và ENCRYPTION_KEY

**SAI:**
```env
NEXTAUTH_SECRET="OVSPhBWryJhvLR8YLeitiMBtg/k8SqzD71ZdXfBN0ak="
ENCRYPTION_KEY="aG1PhQ4NVnDzNFoS20x9w9o41RzIPj78bm0RylKIbaM="
```

**ĐÚNG:**
```env
NEXTAUTH_SECRET=OVSPhBWryJhvLR8YLeitiMBtg/k8SqzD71ZdXfBN0ak=
ENCRYPTION_KEY=aG1PhQ4NVnDzNFoS20x9w9o41RzIPj78bm0RylKIbaM=
```

**Lý do:** Trong file `.env`, giá trị không cần dấu ngoặc kép. Nếu có dấu ngoặc kép, nó sẽ được đọc như là một phần của giá trị (bao gồm cả dấu ngoặc kép).

## 📝 File .env ĐÚNG:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dtcadmin123456
POSTGRES_DB=disputes_db
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=5000
NEXTAUTH_URL=http://ppdispute.ngohoan.com:5000

# NextAuth Secret
NEXTAUTH_SECRET=OVSPhBWryJhvLR8YLeitiMBtg/k8SqzD71ZdXfBN0ak=

# Encryption Key
ENCRYPTION_KEY=aG1PhQ4NVnDzNFoS20x9w9o41RzIPj78bm0RylKIbaM=

# Optional: Cron Secret
CRON_SECRET=sdkfsdl9849854985
```

## 🔒 Lưu ý về Bảo mật:

1. **POSTGRES_PASSWORD**: Nên dùng password mạnh hơn (ít nhất 16 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt)
2. **NEXTAUTH_SECRET**: Đã OK (base64 encoded, đủ dài)
3. **ENCRYPTION_KEY**: Đã OK (base64 encoded, đủ dài)
4. **CRON_SECRET**: Nên dùng giá trị mạnh hơn (tương tự NEXTAUTH_SECRET)

## ✅ Sau khi sửa:

1. Lưu file `.env` với format đúng (không có dấu ngoặc kép)
2. Kiểm tra lại file:
   ```bash
   cat .env
   ```
3. Start Docker containers:
   ```bash
   docker-compose up -d
   ```
4. Kiểm tra logs:
   ```bash
   docker-compose logs -f
   ```

## 🧪 Test kết nối:

Sau khi containers chạy, test:
1. Truy cập: `http://ppdispute.ngohoan.com:5000`
2. Kiểm tra database connection trong logs
3. Chạy migrations:
   ```bash
   docker-compose exec app npx prisma migrate deploy
   docker-compose exec app npm run db:seed
   ```


