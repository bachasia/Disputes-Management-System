# Hướng dẫn Deploy lên VPS Server

Hướng dẫn chi tiết cách download và deploy ứng dụng từ Git repository lên VPS server.

## Prerequisites

- VPS server với Ubuntu/Debian (hoặc Linux distribution khác)
- SSH access đến VPS
- Git đã được cài đặt trên VPS
- Docker và Docker Compose đã được cài đặt (nếu dùng Docker)

## Cách 1: Clone Repository từ GitHub/GitLab

### Bước 1: SSH vào VPS

```bash
ssh username@your-vps-ip
# hoặc
ssh username@your-domain.com
```

### Bước 2: Cài đặt Git (nếu chưa có)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
```

### Bước 3: Clone Repository

#### Public Repository

```bash
# Tạo thư mục cho project
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

#### Private Repository (với SSH Key)

**3.1. Tạo SSH Key trên VPS (nếu chưa có):**

```bash
# Tạo SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
# Nhấn Enter để chấp nhận default location
# Nhấn Enter để không set passphrase (hoặc set nếu muốn)

# Xem public key
cat ~/.ssh/id_ed25519.pub
```

**3.2. Thêm SSH Key vào GitHub/GitLab:**

- **GitHub**: Settings → SSH and GPG keys → New SSH key → Paste public key
- **GitLab**: Settings → SSH Keys → Add SSH Key → Paste public key

**3.3. Clone với SSH:**

```bash
git clone git@github.com:your-username/your-repo-name.git
# hoặc
git clone git@gitlab.com:your-username/your-repo-name.git
```

#### Private Repository (với Personal Access Token)

**3.1. Tạo Personal Access Token:**

- **GitHub**: Settings → Developer settings → Personal access tokens → Generate new token
- **GitLab**: Settings → Access Tokens → Add new token

**3.2. Clone với token:**

```bash
git clone https://YOUR_TOKEN@github.com/your-username/your-repo-name.git
# hoặc
git clone https://YOUR_TOKEN@gitlab.com/your-username/your-repo-name.git
```

### Bước 4: Setup Environment Variables

```bash
# Copy file example
cp env.example .env
# hoặc nếu có .env.example
cp .env.example .env

# Edit file .env
nano .env
# hoặc
vi .env
```

Cập nhật các giá trị trong `.env`:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=disputes_db
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=3000
NEXTAUTH_URL=http://your-domain.com
# hoặc
NEXTAUTH_URL=http://your-vps-ip:3000

# NextAuth Secret
NEXTAUTH_SECRET=your_nextauth_secret_here

# Encryption Key
ENCRYPTION_KEY=your_32_character_encryption_key

# Optional: Cron Secret
CRON_SECRET=your_cron_secret_here
```

### Bước 5: Deploy với Docker

```bash
# Build và start containers
docker-compose up -d

# Xem logs
docker-compose logs -f

# Setup database
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

## Cách 2: Download ZIP từ GitHub/GitLab

### Bước 1: Download ZIP

```bash
# Tạo thư mục
mkdir -p ~/projects
cd ~/projects

# Download ZIP (thay URL bằng URL thực tế của repository)
wget https://github.com/your-username/your-repo-name/archive/refs/heads/main.zip
# hoặc
curl -L -o repo.zip https://github.com/your-username/your-repo-name/archive/refs/heads/main.zip

# Giải nén
unzip main.zip
# hoặc
unzip repo.zip

# Di chuyển vào thư mục
cd your-repo-name-main
```

### Bước 2: Setup như trên

Làm theo các bước từ Bước 4 trở đi.

## Cách 3: Sử dụng Git với Credential Helper

### Setup Git Credential Helper

```bash
# Cache credentials trong 1 giờ
git config --global credential.helper 'cache --timeout=3600'

# Hoặc lưu credentials vĩnh viễn (ít bảo mật hơn)
git config --global credential.helper store
```

Sau đó clone repository, Git sẽ hỏi username/password lần đầu và lưu lại.

## Cách 4: Sử dụng Deploy Key (cho Private Repo)

### Bước 1: Tạo Deploy Key trên VPS

```bash
# Tạo SSH key riêng cho deploy
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Xem public key
cat ~/.ssh/deploy_key.pub
```

### Bước 2: Thêm Deploy Key vào Repository

- **GitHub**: Repository Settings → Deploy keys → Add deploy key → Paste public key
- **GitLab**: Repository Settings → Repository → Deploy Keys → Add key → Paste public key

### Bước 3: Clone với Deploy Key

```bash
# Clone với specific SSH key
GIT_SSH_COMMAND="ssh -i ~/.ssh/deploy_key" git clone git@github.com:your-username/your-repo-name.git
```

## Cách 5: Sử dụng GitLab CI/CD hoặc GitHub Actions

### Tạo file `.gitlab-ci.yml` hoặc `.github/workflows/deploy.yml`

Xem phần CI/CD trong file này để tự động deploy.

## Cập nhật Code sau khi Deploy

### Pull Latest Changes

```bash
cd ~/projects/your-repo-name

# Pull latest code
git pull origin main
# hoặc
git pull origin master

# Rebuild containers (nếu dùng Docker)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations nếu có
docker-compose exec app npx prisma migrate deploy
```

## Setup Nginx Reverse Proxy (Optional)

### Cài đặt Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### Tạo Nginx Config

```bash
sudo nano /etc/nginx/sites-available/dispute-app
```

Nội dung:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/dispute-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Setup SSL với Let's Encrypt

```bash
# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (đã được setup tự động)
sudo certbot renew --dry-run
```

## Firewall Configuration

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # App (nếu không dùng Nginx)
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Monitoring và Logs

### Xem Application Logs

```bash
# Docker logs
docker-compose logs -f app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Setup PM2 (nếu không dùng Docker)

```bash
# Cài đặt PM2
npm install -g pm2

# Start application
pm2 start npm --name "dispute-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## Troubleshooting

### Git Clone Issues

**Permission denied (publickey):**
```bash
# Kiểm tra SSH key
ssh -T git@github.com
# hoặc
ssh -T git@gitlab.com

# Thêm SSH key vào ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

**Repository not found:**
- Kiểm tra repository URL
- Kiểm tra quyền truy cập (private repo cần authentication)

### Docker Issues

**Port already in use:**
```bash
# Kiểm tra port đang sử dụng
sudo netstat -tulpn | grep :3000
# hoặc
sudo lsof -i :3000

# Kill process hoặc đổi port trong .env
```

**Database connection failed:**
```bash
# Kiểm tra PostgreSQL container
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d disputes_db
```

## Best Practices

1. **Sử dụng SSH Keys**: An toàn hơn password
2. **Deploy Key**: Cho production servers (read-only)
3. **Environment Variables**: Không commit `.env` file
4. **Backup**: Backup database thường xuyên
5. **Monitoring**: Setup monitoring và alerts
6. **Updates**: Giữ system và dependencies updated
7. **Security**: Sử dụng firewall và SSL

## Quick Reference Commands

```bash
# Clone repository
git clone https://github.com/username/repo.git

# Pull latest changes
git pull origin main

# Setup environment
cp .env.example .env
nano .env

# Deploy với Docker
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down
```

## Support

Nếu gặp vấn đề, kiểm tra:
1. Logs: `docker-compose logs -f`
2. Container status: `docker-compose ps`
3. Network: `docker network ls`
4. Volumes: `docker volume ls`

