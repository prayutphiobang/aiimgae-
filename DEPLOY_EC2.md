# Deploy AIIMGAE บน AWS EC2 (เครื่องเดียว: Next.js + MySQL)

คู่มือนี้รัน Next.js และ MySQL บน EC2 instance ตัวเดียว เหมาะกับโปรเจกต์นี้ที่สุด
(มีไฟล์อัปโหลดบนดิสก์ + background jobs + ต้องมี public URL ให้ Mojen ดึงรูป)

ค่าใช้จ่ายโดยประมาณ: **t3.small ~$15/เดือน** (หรือ t3.micro ถ้าอยู่ใน free tier)

---

## 1) Launch EC2 instance

AWS Console → **EC2** → **Launch instance**

- **Name**: `aiimgae`
- **AMI**: Ubuntu Server 24.04 LTS (x86_64)
- **Instance type**: `t3.small` (2 GB RAM — พอสำหรับ Next.js build + MySQL)
  - ประหยัดกว่า: `t3.micro` (1 GB) ได้ แต่ build อาจช้า/ต้องเพิ่ม swap
- **Key pair**: สร้างใหม่ (ดาวน์โหลดไฟล์ `.pem` เก็บไว้ — ใช้ SSH)
- **Network settings** → Edit → **Security group** เปิด inbound:
  | Type  | Port | Source |
  |-------|------|--------|
  | SSH   | 22   | My IP |
  | HTTP  | 80   | Anywhere (0.0.0.0/0) |
  | HTTPS | 443  | Anywhere (0.0.0.0/0) |
- **Storage**: 20 GB gp3
- Launch

จด **Public IPv4 address** ของ instance ไว้ (เช่น 13.250.x.x)

---

## 2) SSH เข้า server

จากเครื่องคุณ (PowerShell ที่โฟลเดอร์ที่เก็บไฟล์ .pem):

```powershell
ssh -i "aiimgae.pem" ubuntu@<PUBLIC_IP>
```

> ถ้า Windows บ่นเรื่องสิทธิ์ไฟล์ .pem: คลิกขวาไฟล์ → Properties → Security → จำกัดให้เฉพาะ user คุณ

---

## 3) ติดตั้ง Node 20 + MySQL + nginx + pm2  (รันบน server ทีละบล็อก)

```bash
# อัปเดต + เครื่องมือพื้นฐาน
sudo apt update && sudo apt -y upgrade
sudo apt -y install git nginx

# Node.js 20 (จาก NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v   # ควรขึ้น v20.x

# pm2 (ตัวรันโปรเซสถาวร)
sudo npm i -g pm2

# MySQL server
sudo apt -y install mysql-server
sudo systemctl enable --now mysql
```

### (t3.micro เท่านั้น) เพิ่ม swap กัน build ตาย
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4) สร้างฐานข้อมูล + user

```bash
sudo mysql
```
ใน prompt ของ MySQL (เปลี่ยน `CHANGE_ME` เป็นรหัสจริง):
```sql
CREATE DATABASE aiimgae CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'aiimgae'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT ALL PRIVILEGES ON aiimgae.* TO 'aiimgae'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5) ดึงโค้ด + ติดตั้ง

```bash
cd ~
git clone https://github.com/prayutphiobang/aiimgae-.git app
cd app
npm ci
```

> ถ้า repo เป็น private: ตอน clone จะถาม login → ใช้ GitHub username + Personal Access Token

---

## 6) สร้างไฟล์ .env บน server

```bash
nano .env
```
วางค่านี้ (แก้ให้ตรงของจริง):
```env
# Database (ในเครื่องเดียวกัน)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=aiimgae
DB_PASSWORD=CHANGE_ME
DB_NAME=aiimgae

# Public URL = โดเมน หรือ http://<PUBLIC_IP>  (ต้องเข้าถึงได้จากเน็ต ให้ Mojen ดึงรูป)
APP_URL=http://<PUBLIC_IP>

# Auth — สุ่มยาว ๆ
AUTH_SECRET=<ใส่สตริงสุ่มยาว>
ADMIN_EMAIL=admin@example.com

# Mojen
MOJEN_API_BASE=https://api.mojen.ai/api/v1
MOJEN_API_KEY=<key ของคุณ>
MOJEN_FEATURE_UID=feature_3FcCteXnsjxeCxxIL3LIUn2m99D

# Stripe (ถ้าใช้)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
# STRIPE_WEBHOOK_SECRET=whsec_...   (ตั้งทีหลังได้)

# Google OAuth (ถ้าใช้) — redirect URI ต้องเป็น <APP_URL>/api/auth/google/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

THB_PER_CREDIT=1
```
กด `Ctrl+O`, Enter, `Ctrl+X` เพื่อบันทึก

> สุ่ม AUTH_SECRET เร็ว ๆ: `openssl rand -hex 32`

---

## 7) ใส่ข้อมูลเดิมจาก backup (ทางเลือก)

ถ้าอยากยกข้อมูลจากเครื่องคุณมาด้วย: อัปโหลดไฟล์ `backup_aiimgae_*.sql` ขึ้น server แล้ว import

จากเครื่องคุณ (คนละหน้าต่าง PowerShell):
```powershell
scp -i "aiimgae.pem" backup_aiimgae_20261023_153548.sql ubuntu@<PUBLIC_IP>:~/app/
```
บน server:
```bash
mysql -u aiimgae -p aiimgae < ~/app/backup_aiimgae_20261023_153548.sql
```

**ถ้าไม่ยกข้อมูลเดิม** ให้สร้าง schema เปล่าแทน:
```bash
npm run db:init
```

---

## 8) Build + รัน

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # แล้ว copy คำสั่ง sudo ที่มันพิมพ์มา รันตาม (ให้ start ตอน reboot)
```

เช็คว่ารันอยู่: `pm2 status` และ `curl http://localhost:3000` (ควรได้ HTML)

---

## 9) ตั้ง nginx reverse proxy (port 80 → 3000)

```bash
sudo nano /etc/nginx/sites-available/aiimgae
```
วาง:
```nginx
server {
    listen 80;
    server_name _;          # หรือใส่โดเมนของคุณ
    client_max_body_size 20M;   # เผื่ออัปโหลดรูปใหญ่

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
เปิดใช้งาน:
```bash
sudo ln -s /etc/nginx/sites-available/aiimgae /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

ตอนนี้เปิดเว็บได้ที่ **http://<PUBLIC_IP>**

---

## 10) (มีโดเมน) ต่อ domain + HTTPS ฟรี

1. ที่ผู้ให้บริการโดเมน ตั้ง A record ชี้ไป `<PUBLIC_IP>`
2. แก้ `server_name _;` ใน nginx เป็น `server_name yourdomain.com;` แล้ว reload
3. ออก SSL ฟรี:
```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
4. แก้ `.env`: `APP_URL=https://yourdomain.com` แล้ว `pm2 restart aiimgae`
5. ถ้าใช้ Google login: ไปเพิ่ม redirect URI `https://yourdomain.com/api/auth/google/callback` ใน Google Console

---

## อัปเดตโค้ดครั้งถัดไป (หลังแก้โค้ด + push ขึ้น GitHub)

```bash
cd ~/app
git pull
npm ci
npm run build
pm2 restart aiimgae
```

---

## คำสั่งที่ใช้บ่อย
| ทำอะไร | คำสั่ง |
|--------|--------|
| ดูสถานะ | `pm2 status` |
| ดู log | `pm2 logs aiimgae` |
| รีสตาร์ท | `pm2 restart aiimgae` |
| ดู nginx error | `sudo tail -f /var/log/nginx/error.log` |
