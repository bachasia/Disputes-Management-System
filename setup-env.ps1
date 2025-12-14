# Script to setup .env.local with default values
# Run: .\setup-env.ps1

$envFile = ".env.local"

# Check if file exists
if (Test-Path $envFile) {
    Write-Host "File .env.local already exists. Overwrite? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
}

# Generate secrets
Write-Host "Generating secrets..." -ForegroundColor Cyan

$nextAuthSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
$encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Create file content
$content = @"
# Database Configuration
# Update with your PostgreSQL information
# If using Docker: postgresql://postgres:postgres123@localhost:5432/disputes_db
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/disputes_db"

# NextAuth Configuration
NEXTAUTH_SECRET="$nextAuthSecret"
NEXTAUTH_URL="http://localhost:3000"

# Encryption Key (must be at least 32 characters)
ENCRYPTION_KEY="$encryptionKey"

# Application Environment
NODE_ENV="development"
"@

# Write file
$content | Out-File -FilePath $envFile -Encoding utf8

Write-Host "Successfully created .env.local file!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Update DATABASE_URL if you use a different password" -ForegroundColor Yellow
Write-Host "2. If you don't have PostgreSQL, run Docker:" -ForegroundColor Yellow
Write-Host "   docker run --name disputes-postgres -e POSTGRES_PASSWORD=postgres123 -e POSTGRES_DB=disputes_db -p 5432:5432 -d postgres:14" -ForegroundColor Cyan
Write-Host ""
