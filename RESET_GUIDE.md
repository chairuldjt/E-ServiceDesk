# 🔄 RESET & REINITIALIZE GUIDE

Jika Anda ingin setup ulang atau reset aplikasi, ikuti panduan ini.

---

## ⚠️ BACKUP DULU!

Sebelum melakukan reset, backup data penting:

```bash
# Backup database
mysqldump -h localhost -u root -p"Rsdk#admin*1" logbook_db > logbook_backup.sql

# Backup environment variables (jika ada customization)
copy .env.local .env.local.backup
```

---

## 🔄 SOFT RESET (Bersihkan cache, keep database)

### Step 1: Bersihkan Next.js cache
```bash
rm -rf .next
rm -rf node_modules/.cache
```

### Step 2: Restart development server
```bash
npm run dev
```

**Result**: Cache dibersihkan, aplikasi rebuild dari scratch.

---

## 🔴 HARD RESET (Bersihkan semua, reset database)

### Step 1: Stop dev server
- Tekan `Ctrl+C` di terminal tempat npm run dev berjalan

### Step 2: Bersihkan all node cache
```bash
rm -rf node_modules
rm -rf .next
rm -rf .npm-cache
```

### Step 3: Reinstall dependencies
```bash
npm install
```

### Step 4: Reset database
```bash
# Drop database
mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db;"

# Create fresh database
mysql -h localhost -u root -p"Rsdk#admin*1" -e "CREATE DATABASE logbook_db;"

# Create tables
mysql -h localhost -u root -p"Rsdk#admin*1" logbook_db -e "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('user', 'admin') DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS logbook (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, extensi VARCHAR(100), nama VARCHAR(255), lokasi VARCHAR(255), catatan TEXT, solusi TEXT, penyelesaian TEXT, status ENUM('draft', 'completed') DEFAULT 'draft', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);"

# Create admin user
Get-Content "seed-admin.sql" | & "E:\Project\xampp\mysql\bin\mysql" -h localhost -u root -p"Rsdk#admin*1" logbook_db
```

### Step 5: Restart server
```bash
npm run dev
```

**Result**: Aplikasi fresh seperti baru install dengan empty database.

---

## 🔧 CUSTOM RESET (Pilih apa yang di-reset)

### Reset hanya database (keep code)
```bash
# Backup data dulu jika perlu
mysqldump -h localhost -u root -p"Rsdk#admin*1" logbook_db > backup.sql

# Drop & recreate database
mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db; CREATE DATABASE logbook_db;"

# Create tables & admin user (lihat script di atas)
```

### Reset hanya code (keep database)
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Reset hanya config
```bash
# Backup current
copy .env.local .env.local.backup

# Recreate default
# Copy .env.local template dan update
```

---

## 🚀 PARTIAL RESET - Permasalahan Spesifik

### Jika build error
```bash
rm -rf .next
npm run dev
```

### Jika dependency error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Jika database error
```bash
# Check connection
mysql -h localhost -u root -p"Rsdk#admin*1" -e "SELECT 1;"

# If error, recreate database (lihat section HARD RESET)
```

### Jika authentication error
```bash
# Clear browser cookies & localStorage
# Open browser DevTools → Application → Clear Storage

# Or restart browser
```

### Jika port 3000 in use
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

---

## ✅ VERIFICATION CHECKLIST

Setelah reset, verifikasi semuanya working:

- [ ] npm install selesai
- [ ] .env.local ada dan benar
- [ ] MySQL running
- [ ] Database logbook_db ada
- [ ] Tables users & logbook ada
- [ ] Admin user ada
- [ ] npm run dev tidak error
- [ ] http://localhost:3000 accessible
- [ ] Login bisa dengan admin@logbook.com / admin123
- [ ] Dashboard terbuka
- [ ] Bisa create logbook
- [ ] Bisa export ke Excel

---

## 🐛 TROUBLESHOOTING RESET

### Error: "Database does not exist"
**Solution**: 
```bash
mysql -h localhost -u root -p"Rsdk#admin*1" -e "CREATE DATABASE logbook_db;"
```

### Error: "Port 3000 already in use"
**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Error: "MySQL connection refused"
**Solution**:
1. Open XAMPP Control Panel
2. Verify MySQL is running (green indicator)
3. Try again

### Error: "node_modules broken"
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Permission denied" (Linux/Mac)
**Solution**:
```bash
chmod +x status-check.sh
./status-check.sh
```

---

## 💾 BACKUP & RESTORE DATA

### Create Backup
```bash
# Full backup (database + all tables)
mysqldump -h localhost -u root -p"Rsdk#admin*1" logbook_db > logbook_$(date +%Y%m%d_%H%M%S).sql

# Just data (no structure)
mysqldump --no-create-info -h localhost -u root -p"Rsdk#admin*1" logbook_db > logbook_data.sql
```

### Restore Backup
```bash
# Drop existing database first
mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db;"

# Create fresh database
mysql -h localhost -u root -p"Rsdk#admin*1" -e "CREATE DATABASE logbook_db;"

# Restore from backup
mysql -h localhost -u root -p"Rsdk#admin*1" logbook_db < logbook_backup.sql
```

### Keep Only Recent Data
```bash
# Export current data
mysqldump -h localhost -u root -p"Rsdk#admin*1" logbook_db > backup.sql

# Drop database
mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db;"

# Recreate & restore
mysql -h localhost -u root -p"Rsdk#admin*1" -e "CREATE DATABASE logbook_db;"
mysql -h localhost -u root -p"Rsdk#admin*1" logbook_db < backup.sql

# Re-create admin user if needed
Get-Content "seed-admin.sql" | & "E:\Project\xampp\mysql\bin\mysql" -h localhost -u root -p"Rsdk#admin*1" logbook_db
```

---

## 📋 RESET SCENARIOS

### Scenario 1: Fresh Start After Crash
1. Stop dev server (Ctrl+C)
2. Run: `rm -rf .next`
3. Run: `npm run dev`
4. If still error, see HARD RESET section

### Scenario 2: Lost Data Recovery
1. Restore dari backup: `mysql logbook_db < backup.sql`
2. Restart: `npm run dev`
3. Verify data ada di aplikasi

### Scenario 3: Complete Rebuild
1. Backup data: `mysqldump logbook_db > backup.sql`
2. Follow HARD RESET section
3. Restore data if needed: `mysql logbook_db < backup.sql`

### Scenario 4: Move to New Machine
1. Copy project folder
2. Ensure Node.js & MySQL installed
3. Run: `npm install`
4. Create database & restore from backup
5. Update .env.local if different
6. Run: `npm run dev`

---

## ⚡ QUICK RESET COMMANDS

```bash
# Soft reset (just clear cache)
rm -rf .next && npm run dev

# Clean cache (keep node_modules)
rm -rf .next .npm-cache && npm run dev

# Full node reset
rm -rf node_modules .next && npm install && npm run dev

# Database reset
mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db; CREATE DATABASE logbook_db;"

# All reset
rm -rf node_modules .next && npm install && mysql -h localhost -u root -p"Rsdk#admin*1" -e "DROP DATABASE logbook_db; CREATE DATABASE logbook_db;" && npm run dev
```

---

## 🎯 RECOMMENDED RESET FLOW

1. **Try Soft Reset first** - 90% of issues solved
2. **If not working, try Hard Reset** - Clears cache & reinstalls
3. **If database error, reset database only** - Keep your code
4. **If completely broken, follow Full Reset** - Start from scratch

---

## ✅ VERIFY AFTER RESET

Run this command to verify:

```bash
# Windows PowerShell
node --version
npm --version
mysql --version
ls app/api
ls app/dashboard
```

Expected output:
```
v18.x.x or higher
9.x.x or higher
mysql Ver 8.x
(folder structures present)
```

---

## 📞 NEED HELP?

1. Check [PANDUAN.md](PANDUAN.md) troubleshooting section
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) for production issues
3. Review error messages carefully
4. Check MySQL is running (XAMPP)
5. Check Node.js & npm installed

---

**Last Updated**: January 15, 2026
**Version**: 1.0.0
