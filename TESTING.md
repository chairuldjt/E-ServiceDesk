# 🧪 TESTING GUIDE - WEBSITE PENCATATAN LOGBOOK

## 📋 Test Checklist

Gunakan checklist ini untuk memastikan semua fitur berfungsi dengan baik.

---

## ✅ 1. AUTHENTICATION TESTING

### Login Test
- [ ] Go to http://localhost:3000
- [ ] Should redirect to /login
- [ ] Enter email: `admin@logbook.com`
- [ ] Enter password: `admin123`
- [ ] Click "Login"
- [ ] Should redirect to /dashboard
- [ ] Navbar should show username "admin"

### Login Validation Test
- [ ] Leave email empty, try login → Should show error
- [ ] Leave password empty, try login → Should show error
- [ ] Enter wrong email/password → Should show error "Email atau password salah"
- [ ] Error message should disappear when user corrects input

### Register Test
- [ ] Click "Daftar di sini" link
- [ ] Should go to /register page
- [ ] Fill form with:
  - Username: `testuser1`
  - Email: `test@example.com`
  - Password: `password123`
  - Confirm Password: `password123`
- [ ] Click "Daftar"
- [ ] Should auto login and redirect to /dashboard
- [ ] Navbar should show username "testuser1"

### Register Validation Test
- [ ] Leave any field empty → Show error
- [ ] Enter password < 6 chars → Show error
- [ ] Enter mismatched passwords → Show error
- [ ] Try register with existing email → Show error
- [ ] Try register with existing username → Show error

### Logout Test
- [ ] Click dropdown menu in navbar
- [ ] Click "Logout"
- [ ] Should redirect to /login
- [ ] localStorage should be cleared

---

## ✅ 2. DASHBOARD TESTING

### Dashboard Display
- [ ] Go to /dashboard
- [ ] Should show welcome message with username
- [ ] Should show 3 statistics cards (Total, Selesai, Draft)
- [ ] Should show "5 Logbook Terbaru" section
- [ ] Should show "Tambah Logbook" button

### Statistics Accuracy
- [ ] Create 3 logbook entries
- [ ] Dashboard should show Total: 3
- [ ] Mark 1 as completed
- [ ] Dashboard should show Selesai: 1, Draft: 2
- [ ] Delete 1 entry
- [ ] Statistics should update correctly

### Recent Logbook Display
- [ ] Create logbook entry
- [ ] Should appear in "5 Logbook Terbaru"
- [ ] Should show extensi, nama, lokasi, status, date
- [ ] Click "Lihat Semua" → Should go to /logbook

---

## ✅ 3. LOGBOOK CRUD TESTING

### Create Logbook Test
- [ ] Click "➕ Tambah Logbook"
- [ ] Should go to /logbook/create
- [ ] Page title should be "➕ Tambah Logbook Baru"
- [ ] Form should have all required fields

### Create - Required Fields Test
- [ ] Try save with empty Extensi → Show error
- [ ] Try save with empty Nama → Show error
- [ ] Try save with empty Lokasi → Show error
- [ ] After error, should stay on page and keep form data

### Create - Valid Entry Test
- [ ] Fill all required fields:
  - Extensi: `ext. 1001`
  - Nama: `Server Maintenance`
  - Lokasi: `Data Center`
- [ ] Fill optional fields:
  - Catatan: `Maintenance rutin bulanan`
  - Solusi: `Update patches`
  - Penyelesaian: `Maintenance selesai`
- [ ] Click "💾 Simpan Logbook"
- [ ] Should show success message
- [ ] Should redirect to /logbook
- [ ] New logbook should appear in list

### Read - List View Test
- [ ] Go to /logbook
- [ ] Page title: "📚 Daftar Logbook"
- [ ] Should show table with columns:
  - No, Extensi, Nama, Lokasi, Status, Dibuat, Aksi
- [ ] Should show "Tambah Logbook" button
- [ ] Should show search field
- [ ] Should show status filter
- [ ] Should show "Export ke Excel" button

### Read - Detail View Test
- [ ] Create a logbook entry
- [ ] Click "Edit" on the entry
- [ ] Should go to /logbook/[id]
- [ ] Should show all logbook details
- [ ] Should show timestamps (Dibuat, Diupdate)
- [ ] Should show status badge

### Update Logbook Test
- [ ] From detail page, click "✏️ Edit"
- [ ] Form should become editable
- [ ] Change Nama to: `Server Maintenance - Updated`
- [ ] Change status from Draft to Completed
- [ ] Click "💾 Simpan"
- [ ] Should show success message
- [ ] Should see updated data
- [ ] Back to list, entry should show updated data

### Update - Edit Form Test
- [ ] Click edit on a logbook
- [ ] Change Extensi, Nama, Lokasi
- [ ] Change optional fields
- [ ] Click "Batal"
- [ ] Changes should not be saved
- [ ] Click edit again and verify original data

### Delete Logbook Test
- [ ] Create a test logbook with unique name
- [ ] From list, click "Hapus"
- [ ] Confirm dialog should appear
- [ ] Click "OK"
- [ ] Entry should be removed from list
- [ ] Check database to verify deletion

---

## ✅ 4. SEARCH & FILTER TESTING

### Search Test
- [ ] Create 3 logbook entries:
  1. `ext. 1001 | Server A | Ruang Server`
  2. `ext. 1002 | Server B | Ruang Network`
  3. `ext. 1003 | Client Support | Ruang Help Desk`
- [ ] Search: "Server" → Should show entry 1 & 2
- [ ] Search: "ext. 1002" → Should show entry 2
- [ ] Search: "Network" → Should show entry 2
- [ ] Search: "xxx" → Should show "Tidak ada data"
- [ ] Clear search → Should show all

### Filter by Status Test
- [ ] Mark entry 1 as completed
- [ ] Filter: "Draft" → Should show entry 2 & 3
- [ ] Filter: "Selesai" → Should show entry 1
- [ ] Filter: "Semua Status" → Should show all 3
- [ ] Filters should work together with search

---

## ✅ 5. EXPORT TO EXCEL TESTING

### Export Basic Test
- [ ] Create 2-3 logbook entries
- [ ] Go to /logbook
- [ ] Click "📥 Export ke Excel"
- [ ] File should download
- [ ] Filename format: `logbook-export-YYYY-MM-DD-HHmmss.xlsx`
- [ ] File should not be corrupted

### Export Content Test
- [ ] Open downloaded Excel file
- [ ] Verify columns:
  - No, Extensi, Nama, Lokasi, Catatan, Solusi, Penyelesaian, Status, Dibuat, Diupdate
- [ ] Verify data matches database
- [ ] Verify dates are formatted correctly
- [ ] Status should show "draft" or "completed"

### Export Permission Test
- [ ] Login as regular user
- [ ] Create logbook entry
- [ ] Export should only include own logbook
- [ ] Create another user and test export for that user
- [ ] Each user should only see own data

---

## ✅ 6. ADMIN FEATURES TESTING

### Admin Dashboard Access Test
- [ ] Login as admin@logbook.com
- [ ] Go to /admin
- [ ] Should show admin dashboard
- [ ] If not admin, trying to access /admin should redirect to /dashboard

### Admin Statistics Test
- [ ] Create multiple logbooks from different users
- [ ] Admin dashboard should show total of all logbooks
- [ ] Statistics should include entries from all users
- [ ] Should count "Selesai" and "Draft" correctly

### Admin Export Test
- [ ] Login as admin
- [ ] Go to /admin
- [ ] Click "📥 Export Excel"
- [ ] File should contain ALL logbooks from ALL users
- [ ] Verify file has more data than individual user export

### Admin Logbook View Test
- [ ] Admin should see table with all logbooks
- [ ] Should show extensi, nama, lokasi, status, dibuat
- [ ] Should show logbooks from all users
- [ ] Should not have edit/delete buttons (view only)

---

## ✅ 7. NAVBAR & NAVIGATION TESTING

### Navbar Display Test
- [ ] Login to any account
- [ ] Navbar should show at top
- [ ] Should show "📔 Logbook" logo on left
- [ ] Should show username and role on right
- [ ] Should show "Menu ▼" dropdown

### Navbar Menu Test
- [ ] Click "Menu ▼" dropdown
- [ ] Should show menu items:
  - Dashboard
  - Logbook
  - Admin Dashboard (if admin)
  - Logout
- [ ] Click "Dashboard" → Go to /dashboard
- [ ] Click "Logbook" → Go to /logbook
- [ ] Click "Admin Dashboard" (if admin) → Go to /admin
- [ ] Dropdown should close after clicking

### Protected Routes Test
- [ ] Logout from account
- [ ] Try go to /dashboard directly → Should redirect to /login
- [ ] Try go to /logbook directly → Should redirect to /login
- [ ] Try go to /admin directly → Should redirect to /login

---

## ✅ 8. RESPONSIVE DESIGN TESTING

### Desktop View
- [ ] Open on desktop browser
- [ ] All pages should display correctly
- [ ] Tables should be readable
- [ ] Forms should have proper spacing
- [ ] Buttons should be clickable

### Mobile View
- [ ] Open on mobile browser or use DevTools mobile view
- [ ] Layout should adapt to screen size
- [ ] Menu should collapse (if implemented)
- [ ] Tables should be scrollable
- [ ] Forms should be usable on small screen

### Tablet View
- [ ] Open on tablet or medium screen
- [ ] Should display well
- [ ] Should be between desktop and mobile layout

---

## ✅ 9. ERROR HANDLING TESTING

### Network Error Test
- [ ] Disconnect internet
- [ ] Try create logbook
- [ ] Should show error message
- [ ] Reconnect internet

### Database Error Simulation
- [ ] Note: This requires DB manipulation
- [ ] If database is down, API should return error
- [ ] Error message should be displayed to user

### Validation Error Test
- [ ] Try submit empty form → Error message
- [ ] Try invalid email → Error message
- [ ] Try short password → Error message
- [ ] All errors should be clear and helpful

### 404 Test
- [ ] Go to invalid URL: /invalid-page
- [ ] Should show 404 or redirect
- [ ] Should be able to navigate back

---

## ✅ 10. PERFORMANCE TESTING

### Page Load Time
- [ ] Dashboard should load in < 2 seconds
- [ ] Logbook list should load in < 2 seconds
- [ ] Detail page should load in < 1 second

### Export Performance
- [ ] Export with 10 records: < 2 seconds
- [ ] Export with 100 records: < 5 seconds

### Search Performance
- [ ] Search should be instant (< 500ms)
- [ ] Filter should be instant

---

## ✅ 11. SECURITY TESTING

### Authentication Test
- [ ] Token should work after login
- [ ] Token should expire after 7 days (logout required)
- [ ] Password should be hashed (not visible in DB)

### Authorization Test
- [ ] User A should not see User B's logbook
- [ ] User should not see admin dashboard (/admin)
- [ ] Admin should see all logbooks

### SQL Injection Test
- [ ] Try search: `' OR '1'='1`
- [ ] Should return no results (safe)
- [ ] Should not expose database

---

## ✅ 12. DATA INTEGRITY TESTING

### Cascading Delete
- [ ] Delete a user (if possible)
- [ ] All logbook entries of that user should be deleted

### Data Consistency
- [ ] Created logbook timestamp should be correct
- [ ] Updated logbook timestamp should be correct
- [ ] Status should be either "draft" or "completed"

### Duplicate Prevention
- [ ] Create user with same email
- [ ] Should show error about duplicate email
- [ ] Should not create duplicate

---

## 📊 Test Results Summary

Use this template to record test results:

```
Date: ___________
Tester: ___________
Build Version: 1.0.0

PASS: ___/102 items
FAIL: ___/102 items
SKIP: ___/102 items

Issues Found:
1. ________________
2. ________________
3. ________________

Overall Status: [PASS / FAIL / CONDITIONAL]
Notes: ________________
```

---

## 🔍 Test Scenarios

### Scenario 1: Complete User Journey
1. Register new account
2. Login to account
3. Go to dashboard
4. Create logbook entry
5. Edit logbook entry
6. View logbook list
7. Search/filter logbook
8. Export to Excel
9. Logout

**Expected Result**: All steps should succeed

### Scenario 2: Admin Workflow
1. Login as admin
2. Go to admin dashboard
3. View all logbooks
4. Export all data
5. Verify Excel has all data

**Expected Result**: Admin should see all data

### Scenario 3: Multi-User Test
1. Create user A and user B
2. Login as user A, create logbook
3. Login as user B, create logbook
4. User A should only see own logbook
5. User B should only see own logbook
6. Admin should see both

**Expected Result**: Proper data isolation

---

## 🐛 Bug Report Template

When finding a bug, use this template:

```
Title: [Brief description of bug]

Priority: [Critical / High / Medium / Low]

Steps to Reproduce:
1. ...
2. ...
3. ...

Expected Result:
...

Actual Result:
...

Environment:
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari/Edge]
- Screen Size: [Desktop/Mobile/Tablet]
- User Role: [Admin/User]

Screenshots: [Attach if possible]

Notes: [Any additional info]
```

---

## ✨ Test Success Criteria

Project is **READY FOR PRODUCTION** when:
- ✅ All 12 test categories pass
- ✅ No critical or high priority bugs
- ✅ Performance meets benchmarks
- ✅ Security review complete
- ✅ Admin user can see all data
- ✅ Regular users see only own data
- ✅ Export to Excel works correctly
- ✅ Mobile responsive works
- ✅ All error messages are helpful
- ✅ Data is properly persisted in database

---

**Status**: Ready for Testing
**Created**: January 15, 2026
**Version**: 1.0.0
