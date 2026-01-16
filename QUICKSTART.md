# ⚡ QUICK START GUIDE

## 📋 Checklist

- [x] Project initialized dengan Next.js
- [x] Database & Tables created via `init-db.ts`
- [x] Admin user created via `init-db.ts`
- [x] All APIs implemented
- [x] Frontend pages completed
- [x] Authentication & Export CDR working
- [x] Development server running

---

## 🎯 Dalam 5 Menit

### 1. Start MySQL (2 detik)
- Buka XAMPP Control Panel
- Klik "Start" pada MySQL

### 2. Start Dev Server (3 detik)
```bash
cd e:\Project\xampp\htdocs\logbook
npm run dev
```

### 3. Login (1 menit)
- Buka: http://localhost:3000
- Username: `admin` (atau Email: `admin@logbook.com`)
- Password: `admin123`
- Klik "Login"

### 4. Test Features (2 menit)
- Click "Tambah Logbook"
- Isi form
- Klik "Simpan"
- Verify logbook muncul di list
- Klik "Export Excel"
- Download & open file

---

## 🧪 Test Accounts

### Admin Account
```
Email: admin@logbook.com
Password: admin123
Role: Admin
Access: /admin dashboard
```

### Create New User
1. Klik "Daftar di sini" dari login page
2. Isi form
3. Klik "Daftar"
4. Auto login & redirect ke dashboard

---

## 📍 Important URLs

| Feature | URL | Access |
|---------|-----|--------|
| Homepage | / | Public (redirect) |
| Login | /login | Public |
| Register | /register | Public |
| Dashboard | /dashboard | Protected (user) |
| Logbook List | /logbook | Protected (user) |
| Create Logbook | /logbook/create | Protected (user) |
| Edit Logbook | /logbook/[id] | Protected (user) |
| Export Excel | /api/logbook/export | Protected (user) |
| Admin Dashboard | /admin | Protected (admin only) |

---

## 🔑 Key Features

### ✅ Complete
- User Authentication (Login/Register/Logout)
- CRUD Operations (Create/Read/Update/Delete)
- Search & Filter
- Export to Excel
- Admin Dashboard
- Role-Based Access

### 📦 What's Included
- 10 complete pages
- 9 API endpoints
- 2 database tables
- 8 reusable components & hooks
- Tailwind CSS styling
- TypeScript type safety
- JWT authentication
- MySQL integration

---

## 🚀 Next Steps

### For Development
1. Review [PANDUAN.md](PANDUAN.md) for detailed guide
2. Check API docs di PANDUAN.md section "API Reference"
3. Customize styling & branding
4. Add more features

### For Production
1. Read [DEPLOYMENT.md](DEPLOYMENT.md)
2. Update environment variables
3. Setup monitoring & logging
4. Configure SSL/HTTPS
5. Deploy to server

### For Testing
1. Create multiple test users
2. Add sample logbook entries
3. Test all CRUD operations
4. Test export functionality
5. Test admin features
6. Test different roles

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Can't connect to MySQL" | Check XAMPP MySQL running |
| "Port 3000 in use" | Kill process or use different port |
| "Login failed" | Check credentials (admin / admin@logbook.com / admin123) |
| "Can't see logbook" | Make sure you created one & you're logged in |
| "Export not working" | Check xlsx package installed |

---

## 📁 Key Files

```
Core API
├── app/api/auth/login/route.ts      → Login logic
├── app/api/auth/register/route.ts   → Register logic
├── app/api/logbook/route.ts         → CRUD operations
└── app/api/logbook/export/route.ts  → Excel export

Frontend Pages
├── app/login/page.tsx               → Login form
├── app/register/page.tsx            → Register form
├── app/dashboard/page.tsx           → User dashboard
├── app/logbook/page.tsx             → Logbook list
├── app/logbook/create/page.tsx      → Create form
├── app/logbook/[id]/page.tsx        → Detail/Edit
└── app/admin/page.tsx               → Admin dashboard

Configuration
├── lib/db.ts                        → MySQL connection
├── lib/jwt.ts                       → JWT utils
├── hooks/useAuth.ts                 → Auth hook
└── .env.local                       → Environment vars
```

---

## 💡 Tips

1. **Always login first** - Most features require authentication
2. **Required fields** - Extensi, Nama, Lokasi harus diisi
3. **Export Excel** - Works for own logbook (user) or all (admin)
4. **Edit status** - You can mark logbook as "Completed"
5. **Search** - Works on Nama, Extensi, Lokasi
6. **Admin view** - Go to `/admin` to see all logbook
7. **Token expiry** - Re-login if token expired (7 days)

---

## 📚 Documentation

- **[PANDUAN.md](PANDUAN.md)** - Complete feature guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Setup & deployment
- **[README.md](README.md)** - Overview & quick ref

---

## 🎉 Ready!

Everything is setup and ready to use!

**Start**: `npm run dev`
**Login**: admin@logbook.com / admin123
**Enjoy**: Create, edit, and export your logbook! 📔

---

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: January 15, 2026
