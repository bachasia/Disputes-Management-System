# Hướng dẫn về Lỗi TypeScript

## TypeScript là gì?

TypeScript là một ngôn ngữ lập trình được phát triển bởi Microsoft, là một superset của JavaScript. Nó thêm **type checking** (kiểm tra kiểu dữ liệu) vào JavaScript để giúp phát hiện lỗi sớm hơn.

## Tại sao có lỗi TypeScript?

TypeScript kiểm tra kiểu dữ liệu tại **compile time** (khi build), không phải runtime (khi chạy). Điều này giúp:
- Phát hiện lỗi sớm hơn
- Code an toàn hơn
- Dễ maintain hơn
- IDE hỗ trợ tốt hơn (autocomplete, refactoring)

## Các loại lỗi TypeScript thường gặp

### 1. Type Mismatch (Kiểu dữ liệu không khớp)

**Ví dụ:**
```typescript
// Lỗi: Type 'string' is not assignable to type 'number'
let age: number = "25"  // ❌ Lỗi
let age: number = 25    // ✅ Đúng
```

**Trong project của bạn:**
```typescript
// Lỗi: Property 'image' does not exist on type
session.user.image = token.picture  // ❌ Lỗi vì type không có 'image'
```

**Giải pháp:** Thêm `image` vào type definition hoặc cast type.

### 2. Property does not exist (Thuộc tính không tồn tại)

**Ví dụ:**
```typescript
interface User {
  name: string
  email: string
}

const user: User = { name: "John", email: "john@example.com" }
console.log(user.age)  // ❌ Lỗi: Property 'age' does not exist
```

**Trong project của bạn:**
```typescript
// Lỗi: Property 'buyer_transaction_id' does not exist
transaction?.buyer_transaction_id  // ❌ Lỗi vì type cũ không có property này
```

**Giải pháp:** Kiểm tra property có tồn tại trước khi truy cập:
```typescript
'buyer_transaction_id' in transaction ? transaction.buyer_transaction_id : undefined
```

### 3. Possibly 'undefined' or 'null' (Có thể là undefined/null)

**Ví dụ:**
```typescript
let value: number | undefined = getValue()
let result = value * 2  // ❌ Lỗi: 'value' is possibly 'undefined'
```

**Trong project của bạn:**
```typescript
// Lỗi: 'percent' is possibly 'undefined'
label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
```

**Giải pháp:** Thêm fallback value:
```typescript
label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
```

### 4. Invalid Route Export (Export không hợp lệ trong Route Handler)

**Ví dụ:**
```typescript
// ❌ Lỗi: "authOptions" is not a valid Route export field
export const authOptions = { ... }
export { handler as GET, handler as POST }
```

**Giải pháp:** Tách `authOptions` ra file riêng, route handler chỉ export GET/POST.

### 5. Type 'null' is not assignable (Không thể gán null)

**Ví dụ:**
```typescript
// ❌ Lỗi: Type 'null' is not assignable to type 'InputJsonValue'
attachments: latestMessage.attachments || null
```

**Giải pháp:** Dùng `undefined` thay vì `null` cho optional fields:
```typescript
attachments: latestMessage.attachments || undefined
```

## Cách đọc lỗi TypeScript

### Format của lỗi:
```
./path/to/file.ts:line:column
Type error: Mô tả lỗi

   line-2: code trước đó
>  line:   code có lỗi
   line+2: code sau đó
```

### Ví dụ từ log của bạn:
```
./src/lib/services/sync-service.ts:506:39
Type error: Property 'buyer_transaction_id' does not exist on type...

   504 |     // Get transaction ID
   505 |     const transactionId = transaction?.seller_transaction_id ||
> 506 |                          transaction?.buyer_transaction_id ||
      |                                       ^
   507 |                          null
```

**Giải thích:**
- File: `src/lib/services/sync-service.ts`
- Dòng: 506
- Cột: 39
- Lỗi: Property `buyer_transaction_id` không tồn tại trong type của `transaction`

## Cách sửa lỗi TypeScript

### 1. Thêm type definition

```typescript
// Trước
interface User {
  name: string
  email: string
}

// Sau
interface User {
  name: string
  email: string
  image?: string | null  // Thêm field thiếu
}
```

### 2. Type Guard (Kiểm tra type trước khi dùng)

```typescript
// Trước
transaction?.buyer_transaction_id  // ❌ Lỗi

// Sau
'buyer_transaction_id' in transaction 
  ? transaction.buyer_transaction_id 
  : undefined  // ✅ Đúng
```

### 3. Null/Undefined Check

```typescript
// Trước
(percent * 100).toFixed(0)  // ❌ Lỗi nếu percent là undefined

// Sau
((percent || 0) * 100).toFixed(0)  // ✅ Đúng
```

### 4. Type Assertion (Ép kiểu - cẩn thận)

```typescript
// Chỉ dùng khi chắc chắn về type
const value = (data as any).someProperty
```

### 5. Optional Chaining và Nullish Coalescing

```typescript
// Optional chaining
transaction?.buyer_transaction_id

// Nullish coalescing
const value = data ?? defaultValue
```

## Các lỗi đã sửa trong project

### 1. ✅ authOptions export trong route handler
- **Lỗi:** Route handler không thể export `authOptions`
- **Sửa:** Tách ra file `src/lib/auth/config.ts`

### 2. ✅ Property 'image' does not exist
- **Lỗi:** `Session.user` type không có `image`
- **Sửa:** Thêm `image?: string | null` vào type definition

### 3. ✅ Property 'buyer_transaction_id' does not exist
- **Lỗi:** Type cũ không có property này
- **Sửa:** Thêm type guard để kiểm tra property tồn tại

### 4. ✅ 'percent' is possibly 'undefined'
- **Lỗi:** Recharts label function có thể nhận `undefined`
- **Sửa:** Thêm fallback `|| 0`

### 5. ✅ Type 'null' is not assignable to Json
- **Lỗi:** Prisma JSON field không chấp nhận `null`
- **Sửa:** Dùng `undefined` thay vì `null`

## Best Practices

### 1. Luôn định nghĩa types rõ ràng
```typescript
// ❌ Tránh
const data: any = getData()

// ✅ Tốt
interface Data {
  id: string
  name: string
}
const data: Data = getData()
```

### 2. Sử dụng Optional Chaining
```typescript
// ✅ Tốt
const email = user?.profile?.email
```

### 3. Kiểm tra null/undefined
```typescript
// ✅ Tốt
const value = data ?? defaultValue
const result = (value || 0) * 2
```

### 4. Type Guards cho Union Types
```typescript
// ✅ Tốt
if ('property' in object) {
  // TypeScript biết object có property này
  console.log(object.property)
}
```

## Tắt TypeScript checking (KHÔNG KHUYẾN NGHỊ)

Nếu muốn tắt type checking (chỉ cho development):

```typescript
// @ts-ignore - Bỏ qua lỗi dòng tiếp theo
const value = data.someProperty

// @ts-nocheck - Bỏ qua toàn bộ file
```

**⚠️ Lưu ý:** Chỉ dùng khi thực sự cần thiết, không nên dùng trong production code.

## Tài liệu tham khảo

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Error Messages](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

