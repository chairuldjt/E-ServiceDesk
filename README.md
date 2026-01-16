# 📔 E-ServiceDesk

Sistem Manajemen Logbook Internal yang modern, responsif, dan mudah digunakan. Dibangun dengan Next.js, MySQL, dan Tailwind CSS.

## ✨ Fitur Utama
- **📚 Logbook Management**: Pencatatan kegiatan, keluhan, dan solusi secara terstruktur.
- **📝 Notepad Interactive**: Catatan tempel digital untuk catatan cepat.
- **🛡️ Admin Dashboard**: Manajemen user (Add, Edit, Activate/Deactivate, Reset Password) dan monitoring sistem.
- **📥 Export Excel**: Kemudahan laporan dengan satu klik.
- **🔒 Secure Auth**: Autentikasi menggunakan JWT dan enkripsi password Bcrypt.
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

### 4. Setup Database
1. Buka **phpMyAdmin** (http://localhost/phpmyadmin).
2. Buat database baru dengan nama `logbook_db`.
3. Buat tabel `users` dan `logbook` menggunakan skema standar (atau jalankan script inisialisasi di bawah).

### 5. Jalankan Script Inisialisasi
Jalankan perintah berikut untuk menyiapkan tabel dan user admin default:

```bash
# Tambah kolom is_active dan update schema user
npx tsx update-users-schema.ts

# Inisialisasi Tabel Notepad
npx tsx setup-notepad.ts

# Seed Admin User Default
npx tsx seed-admin.ts
```

## 🏃 Menjalankan Aplikasi

Jalankan server pengembangan:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🔐 Akun Login Default
Gunakan akun ini untuk masuk pertama kali sebagai Admin:
- **Email**: `admin@logbook.com`
- **Password**: `admin123`

## 📁 Struktur Dokumen
- [QUICKSTART.md](QUICKSTART.md) - Panduan cepat 5 menit.
- [PANDUAN.md](PANDUAN.md) - Dokumentasi fitur lengkap.
- [DEPLOYMENT.md](DEPLOYMENT.md) - Cara deploy ke production.

## 📄 Lisensi
[MIT License](LICENSE)
