# 📔 PANDUAN LENGKAP - WEBSITE PENCATATAN LOGBOOK

## 📌 Ringkasan Project

Website pencatatan logbook berbasis web yang dibangun dengan:
- **Frontend**: Next.js 16 + React + Tailwind CSS + TypeScript
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Authentication**: JWT Token
- **Export**: Excel (.xlsx)

---

## ✅ Setup yang Sudah Dilakukan

### 1. ✓ Project Initialization
- Next.js 16 dengan TypeScript dan Tailwind CSS
- All dependencies terinstall dengan benar

### 2. ✓ Database Configuration
- Database: `logbook_db` dibuat secara otomatis
- Tables: `users`, `logbook`, dan `notes` dibuat secara otomatis via `npm run db:init`
- MySQL credentials: root / [Sesuai .env.local Anda]

### 3. ✓ Environment Setup
- File `.env.local` digunakan untuk menyimpan credentials
- File `.env.example` disediakan sebagai panduan konfigurasi

### 4. ✓ Authentication System
- Login API (`/api/auth/login`)
- Register API (`/api/auth/register`)
- Logout API (`/api/auth/logout`)
- JWT token dengan expiry 7 hari
- Password hashing dengan bcryptjs

### 5. ✓ Logbook CRUD APIs
- GET `/api/logbook` - Get all logbook entries
- POST `/api/logbook` - Create new logbook
- GET `/api/logbook/[id]` - Get logbook detail
- PUT `/api/logbook/[id]` - Update logbook
- DELETE `/api/logbook/[id]` - Delete logbook
- GET `/api/logbook/export` - Export to Excel

### 6. ✓ Frontend Pages
- **Public Pages**: Login, Register
- **Protected Pages**: 
  - Dashboard (User)
  - Logbook List, Create, Detail/Edit
  - Admin Dashboard
- **Navigation**: Navbar dengan menu user

### 7. ✓ Admin User Created
- Email: `admin@logbook.com`
- Password: `admin123`
- Role: `admin`

### 8. ✓ Telegram Bridge
- Integrasi bot @Robtechbot
- Support pengiriman foto & otomasi
- Persisten menu keyboard

---

## 🚀 Cara Menjalankan

### 1. Pastikan MySQL Running
- Buka XAMPP Control Panel
- Start MySQL Module

### 2. Jalankan Development Server
```bash
cd e:\Project\xampp\htdocs\logbook
npm run dev
```

Server akan berjalan di: `http://localhost:3000`

### 3. Test Login
- Buka: http://localhost:3000
- Login dengan:
  - **Username**: `admin`
  - **Email**: `admin@logbook.com`
  - **Password**: `admin123`

---

## 📖 Fitur & Cara Pakai

### 🔐 Authentication

#### Login
1. Buka homepage → akan redirect ke `/login`
2. Masukkan username atau email dan password
3. Klik "Login"
4. Jika berhasil, akan redirect ke dashboard

#### Register User Baru
1. Di halaman login, klik "Daftar di sini"
2. Isi form:
   - Username (unique)
   - Email (unique)
   - Password (min 6 karakter)
   - Konfirmasi password
3. Klik "Daftar"
4. Akan otomatis login dan redirect ke dashboard

#### Logout
1. Klik menu di navbar (kanan atas)
2. Klik "Logout"
3. Akan redirect ke halaman login

---

### 📊 Dashboard User

**URL**: `/dashboard`

**Fitur**:
- Statistik logbook (Total, Selesai, Draft)
- 5 logbook terbaru user
- Quick link ke halaman logbook lengkap
- Tombol "Tambah Logbook"

---

### 📝 Manajemen Logbook

#### Lihat Semua Logbook
**URL**: `/logbook`

**Fitur**:
- Tabel dengan semua logbook user
- Search by: Nama, Extensi, Lokasi
- Filter by: Status (Draft/Completed)
- Kolom: No, Extensi, Nama, Lokasi, Status, Dibuat, Aksi
- Actions: Edit, Hapus

#### Tambah Logbook Baru
**URL**: `/logbook/create`

**Form Fields**:
- **Extensi** ⭐ (Required) - Nomor extensi/telepon
- **Nama** ⭐ (Required) - Nama kegiatan
- **Lokasi** ⭐ (Required) - Lokasi kegiatan
- **Catatan** (Optional) - Catatan tambahan
- **Solusi** (Optional) - Solusi yang diberikan
- **Penyelesaian** (Optional) - Hasil penyelesaian

**Cara**:
1. Dari navbar klik "Tambah Logbook" atau dari dashboard
2. Isi form (field dengan ⭐ wajib diisi)
3. Klik "💾 Simpan Logbook"

#### Edit Logbook
**URL**: `/logbook/[id]`

**Cara**:
1. Dari daftar logbook, klik "Edit" pada logbook yang ingin diedit
2. Halaman akan menampilkan detail logbook
3. Klik tombol "✏️ Edit"
4. Form berubah menjadi editable
5. Ubah data yang diperlukan (termasuk status jika ingin mark as completed)
6. Klik "💾 Simpan"

#### Hapus Logbook
1. Dari daftar logbook, klik "Hapus" pada logbook yang ingin dihapus
2. Akan muncul konfirmasi
3. Klik "OK" untuk confirm delete

---

### 📥 Export ke Excel

#### User Export
1. Dari halaman `/logbook`, scroll ke bawah
2. Klik tombol "📥 Export ke Excel"
3. File Excel akan otomatis ter-download
4. File name: `logbook-export-YYYY-MM-DD-HHmmss.xlsx`
5. Format: Spreadsheet dengan kolom No, Extensi, Nama, Lokasi, Catatan, Solusi, Penyelesaian, Status, Dibuat, Diupdate

#### Admin Export
1. Akses `/admin`
2. Di bagian "Semua Logbook", klik tombol "📥 Export Excel"
3. Semua logbook dari semua user akan di-export ke Excel

---

### 👥 Admin Dashboard

**URL**: `/admin`

**Akses**: Hanya user dengan role `admin`

**Fitur**:
- Statistik keseluruhan (Total, Selesai, Draft)
- Tabel semua logbook dari semua user
- Export semua data ke Excel
- View hanya (tidak bisa edit/delete dari dashboard admin)

---

### ✈️ Telegram Bridge

**URL**: `/telegram`

**Fitur**:
- **Connection Wizard**: Hubungkan akun Telegram Anda langsung dari dashboard.
- **Mac OS Style Terminal**: Log aktivitas bot dengan antarmuka terminal yang elegan.
- **Photo Support**: Kirim foto (upload/paste) langsung ke @Robtechbot.
- **Smart Automation**: Tombol "Jalankan Update Otomatis" untuk memicu bot mengerjakan tugas rutin.
- **Bot Menu**: Akses tombol keyboard bot langsung di bawah layar chat.
- **Live Stream**: Update pesan bot secara real-time.

---

## 🔄 API Reference

### Authentication APIs

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "message": "Login berhasil",
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "user",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}

Response 201:
{
  "message": "Registrasi berhasil",
  "token": "eyJ...",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### Logout
```
POST /api/auth/logout

Response 200:
{
  "message": "Logout berhasil"
}
```

### Logbook APIs (All require authentication)

#### Get All Logbook
```
GET /api/logbook

Response 200:
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "extensi": "ext. 1234",
      "nama": "Rapat Meeting",
      "lokasi": "Ruang 101",
      "catatan": "...",
      "solusi": "...",
      "penyelesaian": "...",
      "status": "draft",
      "created_at": "2026-01-15T...",
      "updated_at": "2026-01-15T..."
    }
  ]
}
```

#### Create Logbook
```
POST /api/logbook
Content-Type: application/json

{
  "extensi": "ext. 1234",
  "nama": "Rapat Meeting",
  "lokasi": "Ruang 101",
  "catatan": "...",
  "solusi": "...",
  "penyelesaian": "..."
}

Response 201:
{
  "message": "Logbook berhasil dibuat",
  "data": { ... }
}
```

#### Get Detail Logbook
```
GET /api/logbook/1

Response 200:
{
  "data": { ... }
}
```

#### Update Logbook
```
PUT /api/logbook/1
Content-Type: application/json

{
  "extensi": "ext. 1234",
  "nama": "...",
  "lokasi": "...",
  "catatan": "...",
  "solusi": "...",
  "penyelesaian": "...",
  "status": "completed"
}

Response 200:
{
  "message": "Logbook berhasil diupdate",
  "data": { ... }
}
```

#### Delete Logbook
```
DELETE /api/logbook/1

Response 200:
{
  "message": "Logbook berhasil dihapus"
}
```

#### Export to Excel
```
GET /api/logbook/export

Response 200 (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
[Binary Excel File]
```

---

## 📊 Database Schema

### Table: users
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: logbook
```sql
CREATE TABLE logbook (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  extensi VARCHAR(100),
  nama VARCHAR(255),
  lokasi VARCHAR(255),
  catatan TEXT,
  solusi TEXT,
  penyelesaian TEXT,
  status ENUM('draft', 'completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔐 Keamanan & Best Practices

### Implemented
- ✅ Password hashing (bcryptjs, 10 rounds)
- ✅ JWT authentication
- ✅ HTTP-only cookies for token storage
- ✅ Protected routes (frontend check)
- ✅ Server-side authorization check
- ✅ Role-based access control
- ✅ User can only see their own logbook
- ✅ Admin can see all logbook

### Production Recommendations
- [ ] Change `JWT_SECRET` ke nilai random yang kuat
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Add input validation & sanitization
- [ ] Add CSRF protection
- [ ] Add request logging & monitoring
- [ ] Regular security audits
- [ ] Database backups
- [ ] Error handling improvements
- [ ] Add API versioning

---

## 📁 Project Structure

```
e:\Project\xampp\htdocs\logbook\
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts          (POST login)
│   │   │   ├── register/route.ts       (POST register)
│   │   │   └── logout/route.ts         (POST logout)
│   │   └── logbook/
│   │       ├── route.ts                (GET all, POST create)
│   │       ├── [id]/route.ts           (GET, PUT, DELETE)
│   │       └── export/route.ts         (GET export Excel)
│   ├── admin/
│   │   └── page.tsx                    (Admin Dashboard)
│   ├── dashboard/
│   │   └── page.tsx                    (User Dashboard)
│   ├── logbook/
│   │   ├── page.tsx                    (List)
│   │   ├── create/page.tsx             (Create Form)
│   │   └── [id]/page.tsx               (Detail/Edit)
│   ├── login/
│   │   └── page.tsx                    (Login Page)
│   ├── register/
│   │   └── page.tsx                    (Register Page)
│   ├── layout.tsx                      (Root Layout)
│   └── page.tsx                        (Root - Redirect)
├── components/
│   ├── Navbar.tsx                      (Top Navigation)
│   └── ProtectedRoute.tsx              (Route Protection)
├── hooks/
│   └── useAuth.ts                      (Auth Hook)
├── lib/
│   ├── db.ts                           (MySQL Connection Pool)
│   └── jwt.ts                          (JWT Utilities)
├── .env.local                          (Environment Variables)
├── .gitignore
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── seed-admin.sql                      (Admin User Seed)
├── seed-admin.ts                       (Alternative Seed)
└── package.json
```

---

## 🚨 Troubleshooting

### Problem: "Connection refused" - tidak bisa connect ke MySQL
**Solution**:
1. Pastikan XAMPP MySQL module running
2. Check credentials di `.env.local`
3. Verify database `logbook_db` ada di MySQL
4. Run: `mysql -h localhost -u root -p` dan verify connection

### Problem: "Token expired" - harus login ulang
**Solution**:
- Token expiry 7 hari (setting di `.env.local`)
- Clear browser cookies dan login kembali
- Untuk production, implementasi token refresh mechanism

### Problem: "Logbook tidak muncul" - data kosong
**Solution**:
1. Verify ada data di database: `SELECT * FROM logbook;`
2. Check user_id di logbook sesuai dengan user yang login
3. Admin bisa lihat semua logbook

### Problem: "Export Excel error"
**Solution**:
1. Verify `xlsx` package terinstall: `npm list xlsx`
2. Verify ada data di database
3. Check browser allow downloads
4. Try export di browser lain

### Problem: Port 3000 sudah terpakai
**Solution**:
```bash
# Windows - kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or run pada port lain
npm run dev -- -p 3001
```

---

## 📝 Notes & Development

### Technologies Used
- Next.js 16.1.2 (React 19, Turbopack)
- TypeScript 5
- Tailwind CSS 4
- MySQL 5.7+
- Node.js 18+

### Key Dependencies
- `mysql2/promise` - MySQL driver with promises
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `xlsx` - Excel file generation
- `axios` - (optional) HTTP client

### Performance Notes
- Database connection pooling implemented
- JWT token caching in localStorage (client)
- Server-side pagination tidak diimplementasikan (untuk future)
- Consider adding: indexing on (user_id, status) columns

### Future Enhancements
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] File attachment upload
- [ ] Comments/discussion threads
- [ ] Email notifications
- [ ] Bulk operations
- [ ] Advanced reporting & analytics
- [ ] Mobile app (React Native)
- [ ] Dark mode theme

---

## 📧 Support & Contact

Untuk bantuan atau pertanyaan:
- Check README.md for quick reference
- Review API documentation di section API Reference
- Check logs di browser console (F12)

---

**Project Version**: 1.0.0
**Last Updated**: January 15, 2026
**Status**: ✅ Ready for Development & Testing
