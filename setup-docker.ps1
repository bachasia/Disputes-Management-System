# PowerShell script để setup Docker environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra file .env đã tồn tại chưa
if (Test-Path .env) {
    Write-Host "⚠️  File .env đã tồn tại!" -ForegroundColor Yellow
    $overwrite = Read-Host "Bạn có muốn ghi đè? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Đã hủy. Giữ nguyên file .env hiện tại." -ForegroundColor Red
        exit
    }
}

# Generate secrets
Write-Host "🔐 Đang generate secrets..." -ForegroundColor Green

$nextAuthSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
$encryptionKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Nhập thông tin từ user
Write-Host ""
Write-Host "📝 Nhập thông tin cấu hình:" -ForegroundColor Green

$postgresPassword = Read-Host "PostgreSQL Password (để trống = postgres)"
if ([string]::IsNullOrWhiteSpace($postgresPassword)) {
    $postgresPassword = "postgres"
}

$appPort = Read-Host "Application Port (để trống = 3000)"
if ([string]::IsNullOrWhiteSpace($appPort)) {
    $appPort = "3000"
}

$nextAuthUrl = Read-Host "NextAuth URL (để trống = http://localhost:3000)"
if ([string]::IsNullOrWhiteSpace($nextAuthUrl)) {
    $nextAuthUrl = "http://localhost:3000"
}

# Tạo nội dung file .env
$envContent = @"
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$postgresPassword
POSTGRES_DB=disputes_db
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=$appPort
NEXTAUTH_URL=$nextAuthUrl

# NextAuth Secret (auto-generated)
NEXTAUTH_SECRET=$nextAuthSecret

# Encryption Key (auto-generated)
ENCRYPTION_KEY=$encryptionKey

# Optional: Cron Secret (default: NEXTAUTH_SECRET)
CRON_SECRET=$nextAuthSecret
"@

# Ghi file .env
try {
    $envContent | Out-File -FilePath .env -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host "✅ Đã tạo file .env thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Thông tin đã cấu hình:" -ForegroundColor Cyan
    Write-Host "   - PostgreSQL Password: $postgresPassword" -ForegroundColor White
    Write-Host "   - App Port: $appPort" -ForegroundColor White
    Write-Host "   - NextAuth URL: $nextAuthUrl" -ForegroundColor White
    Write-Host "   - NextAuth Secret: [Đã generate tự động]" -ForegroundColor White
    Write-Host "   - Encryption Key: [Đã generate tự động]" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Bước tiếp theo:" -ForegroundColor Yellow
    Write-Host "   1. Chạy: docker compose up -d" -ForegroundColor White
    Write-Host "   2. Xem logs: docker compose logs -f" -ForegroundColor White
    Write-Host "   3. Truy cập: $nextAuthUrl" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Lỗi khi tạo file .env: $_" -ForegroundColor Red
    exit 1
}


