# 🏢 E-ServiceDesk

Internal Service Desk System yang modern, responsif, dan mudah digunakan. Dibangun dengan Next.js, MySQL, dan Tailwind CSS.

## ✨ Fitur Utama
- **🏢 Service Desk Management**: Pencatatan kegiatan, keluhan, dan solusi secara terstruktur.
- **📝 Notepad Interactive**: Catatan tempel digital untuk catatan cepat.
- **🛡️ Admin Dashboard**: Manajemen user (Add, Edit, Activate/Deactivate, Reset Password) dan monitoring sistem.
- **📊 Export CDR**: Export rekaman telepon dari Divatel langsung ke CSV.
- **📥 Export Excel**: Kemudahan laporan logbook dengan satu klik.
- **🔒 Secure Auth**: Login menggunakan **Username** atau **Email** dengan JWT dan Bcrypt.
- **🎨 Modern UI**: Antarmuka bersih dengan dukungan backdrop-blur dan micro-animations.

## 🚀 Persiapan (Prerequisites)
Sebelum memulai, pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (Versi terbaru disarankan)
- [XAMPP](https://www.apachefriends.org/) atau MySQL Server lokal

## 🛠️ Langkah Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/chairuldjt/E-ServiceDesk.git
cd E-ServiceDesk
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env.local`)
Buat file bernama `.env.local` di root folder dan isi dengan konfigurasi berikut:
```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=logbook_db

# Security
JWT_SECRET=rahasia_anda_yang_sangat_kuat_123!
JWT_EXPIRES_IN=7d
```

### 4. Setup & Inisialisasi Database
Jalankan perintah berikut untuk membuat database, tabel, dan user admin secara otomatis:

```bash
npx tsx init-db.ts
```

Script ini akan:
1. Membuat database `logbook_db` jika belum ada.
2. Membuat semua tabel (`users`, `logbook`, `notes`).
3. Menyiapkan user admin default.

### 5. Utility: Reset Admin Password
Jika Anda lupa password admin atau ingin mereset akun admin ke default:
```bash
npx tsx reset-admin.ts
```
Akun akan direset menjadi: `admin` / `admin123`.

---

## 🌐 Production Deployment (Ubuntu/Linux Server)

Langkah-langkah untuk mendeploy aplikasi ini ke server production:

### 1. Persiapan Server
Pastikan server Anda sudah terinstal Node.js (v18+) dan MySQL.

### 2. Setup Project
```bash
# Clone repository
git clone https://github.com/chairuldjt/E-ServiceDesk.git
cd E-ServiceDesk

# Install dependensi
npm install
```

### 3. Konfigurasi Environment
Salin template env dan sesuaikan dengan database server Anda:
```bash
cp .env.example .env.local
nano .env.local
```

### 4. Build & Inisialisasi Database
```bash
# Inisialisasi Database & Tabel (Hanya jalankan sekali)
npx tsx init-db.ts

# Build aplikasi Next.js
npm run build
```

### 5. Jalankan Aplikasi
Jalankan server production:
```bash
npm start
```
Aplikasi akan berjalan pada port default (3000). Untuk urusan startup otomatis atau process management, silakan sesuaikan dengan konfigurasi server Anda (seperti PM2, Systemd, atau Docker).

## 🏃 Menjalankan Aplikasi

Jalankan server pengembangan:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🔐 Akun Login Default
Gunakan akun ini untuk masuk pertama kali (bisa menggunakan Email atau Username):
- **Username**: `admin`
- **Email**: `admin@logbook.com`
- **Password**: `admin123`

## 📁 Struktur Dokumen
- [QUICKSTART.md](QUICKSTART.md) - Panduan cepat 5 menit.
- [PANDUAN.md](PANDUAN.md) - Dokumentasi fitur lengkap.
- [DEPLOYMENT.md](DEPLOYMENT.md) - Cara deploy ke production.

## 📄 Lisensi
[MIT License](LICENSE)
