# Git Setup Guide

## Bước 1: Cài đặt Git (nếu chưa có)

### Windows
1. Tải Git từ: https://git-scm.com/download/win
2. Cài đặt với các tùy chọn mặc định
3. Mở lại terminal/PowerShell

### Kiểm tra Git đã cài đặt
```powershell
git --version
```

## Bước 2: Cấu hình Git (lần đầu tiên)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Bước 3: Khởi tạo Git Repository

```powershell
# Di chuyển vào thư mục dự án
cd "D:\Vibe Coding\dispute"

# Khởi tạo git repository
git init

# Kiểm tra trạng thái
git status
```

## Bước 4: Thêm files vào Git

```powershell
# Thêm tất cả files (trừ những file trong .gitignore)
git add .

# Kiểm tra files sẽ được commit
git status
```

## Bước 5: Tạo commit đầu tiên

```powershell
git commit -m "Initial commit: PayPal Disputes Management System

- Next.js 14 with App Router
- Authentication with NextAuth.js
- Multi-account PayPal dispute management
- Auto sync functionality
- Analytics dashboard
- User management system
- Settings and preferences"
```

## Bước 6: Tạo Repository trên GitHub/GitLab

1. Đăng nhập vào GitHub/GitLab
2. Tạo repository mới (không khởi tạo README)
3. Copy URL của repository

## Bước 7: Kết nối với Remote Repository

```powershell
# Thêm remote repository
git remote add origin <repository-url>

# Ví dụ:
# git remote add origin https://github.com/username/dispute.git
# hoặc
# git remote add origin git@github.com:username/dispute.git
```

## Bước 8: Push lên Remote

```powershell
# Push code lên remote (branch main)
git branch -M main
git push -u origin main
```

## Các lệnh Git thường dùng

### Xem trạng thái
```powershell
git status
```

### Xem lịch sử commit
```powershell
git log
git log --oneline  # Compact view
```

### Tạo branch mới
```powershell
git checkout -b feature/new-feature
```

### Commit changes
```powershell
git add .
git commit -m "Description of changes"
git push
```

### Xem remote repositories
```powershell
git remote -v
```

### Pull latest changes
```powershell
git pull origin main
```

## Lưu ý quan trọng

1. **Không commit file `.env.local`**: File này chứa thông tin nhạy cảm và đã được thêm vào `.gitignore`

2. **Không commit `node_modules`**: Thư mục này rất lớn và có thể được tái tạo bằng `npm install`

3. **Commit thường xuyên**: Commit các thay đổi nhỏ thay vì commit một lần với nhiều thay đổi lớn

4. **Commit message rõ ràng**: Viết commit message mô tả rõ ràng những gì đã thay đổi

## Troubleshooting

### Nếu gặp lỗi "git is not recognized"
- Đảm bảo Git đã được cài đặt
- Restart terminal/PowerShell
- Kiểm tra Git có trong PATH: `$env:Path -split ';' | Select-String git`

### Nếu cần thay đổi remote URL
```powershell
git remote set-url origin <new-url>
```

### Nếu cần xóa remote
```powershell
git remote remove origin
```


