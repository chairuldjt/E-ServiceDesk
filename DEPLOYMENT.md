# 🏗️ SETUP & DEPLOYMENT GUIDE

## 💻 Development Environment Setup

### Prerequisites
- Node.js 18 atau lebih tinggi
- MySQL Server 5.7+
- Git (optional)
- Text Editor atau IDE (VS Code recommended)

### Step-by-Step Setup

#### 1. Install Node.js
- Download dari: https://nodejs.org
- Install LTS version
- Verify: `node --version` & `npm --version`

#### 2. MySQL Setup (XAMPP)
- Download XAMPP dari: https://www.apachefriends.org
- Install XAMPP
- Start XAMPP Control Panel
- Click "Start" on MySQL module

#### 3. Clone/Download Project
```bash
cd e:\Project\xampp\htdocs
# Project folder: logbook
```

#### 4. Install Dependencies
```bash
cd logbook
npm install
```

#### 5. Database Setup & Initialization
Jalankan script otomatis untuk membuat database, tabel, dan admin:
```bash
npx tsx init-db.ts
```

#### 6. Environment Configuration
File `.env.local` sudah disiapkan. Pastikan `MYSQL_USER` dan `MYSQL_PASSWORD` sesuai dengan server Anda.

#### 8. Run Development Server
```bash
npm run dev
```

Server berjalan di: http://localhost:3000

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

**Security**:
- [ ] Update `JWT_SECRET` di `.env.local` dengan value random yang kuat
- [ ] Review semua environment variables
- [ ] Enable HTTPS/SSL certificates
- [ ] Implement rate limiting
- [ ] Add input validation & sanitization
- [ ] Setup CORS properly

**Performance**:
- [ ] Optimize database queries
- [ ] Add database indexing
- [ ] Setup caching (Redis optional)
- [ ] Minify & optimize assets
- [ ] Setup CDN for static files
- [ ] Enable gzip compression

**Monitoring**:
- [ ] Setup error logging (Sentry/LogRocket)
- [ ] Setup performance monitoring (Vercel Analytics)
- [ ] Setup uptime monitoring
- [ ] Setup automated backups

**Testing**:
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing

### Deployment Options

#### Option 1: Vercel (Recommended for Next.js)

**Advantages**:
- Zero-config deployment
- Auto-scaling
- Built-in analytics
- Free tier available

**Steps**:
1. Push code ke GitHub
2. Go to https://vercel.com
3. Import project
4. Add environment variables
5. Deploy!

**Connect Database**:
- Use PlanetScale atau Supabase untuk managed MySQL

#### Option 2: Heroku

**Steps**:
1. Install Heroku CLI
2. `heroku create appname`
3. Add buildpacks for Node.js
4. Add environment variables: `heroku config:set KEY=value`
5. Push: `git push heroku main`

#### Option 3: Digital Ocean / AWS / Azure

**Steps**:
1. Create VM instance
2. Install Node.js
3. Setup MySQL database
4. Clone project
5. Install dependencies
6. Run: `npm run build && npm start`
7. Use PM2 for process management
8. Setup Nginx as reverse proxy
9. Setup SSL with Let's Encrypt

#### Option 4: Self-Hosted (Your Server)

**Requirements**:
- VPS/Dedicated Server
- SSH access
- Command line knowledge

**Setup**:
```bash
# SSH ke server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone project
git clone <repository-url>
cd logbook

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "logbook" -- start
pm2 startup
pm2 save
```

### Environment Variables untuk Production

```env
# Database
MYSQL_HOST=production-db-host
MYSQL_USER=prod_user
MYSQL_PASSWORD=strong_random_password
MYSQL_DATABASE=logbook_db

# JWT
JWT_SECRET=very_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d

# API
NEXT_PUBLIC_API_URL=https://yourdomain.com
NODE_ENV=production

# Optional: Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password

# Optional: Analytics
SENTRY_DSN=your-sentry-dsn
```

### Database Migration untuk Production

**Backup Database Development**:
```bash
mysqldump -h localhost -u root -p"Rsdk#admin*1" logbook_db > backup.sql
```

**Restore ke Production**:
```bash
mysql -h prod-host -u prod-user -p < backup.sql
```

---

## 🔧 Build & Deployment Commands

### Development
```bash
npm run dev      # Run development server (port 3000)
```

### Production Build
```bash
npm run build    # Create optimized production build
npm start        # Run production server
```

### Other Commands
```bash
npm run lint     # Run ESLint
npm run type-check # Check TypeScript
npm run build && npm start  # Build and start
```

---

## 📦 Docker Deployment (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MYSQL_HOST=mysql
      - MYSQL_USER=root
      - MYSQL_PASSWORD=password
      - MYSQL_DATABASE=logbook_db
    depends_on:
      - mysql

  mysql:
    image: mysql:5.7
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=logbook_db
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### Deploy dengan Docker
```bash
docker-compose up -d
```

---

## 🔍 Monitoring & Maintenance

### Server Monitoring
- CPU & Memory usage
- Disk space
- Network traffic
- Process uptime

### Application Monitoring
- Request/Response times
- Error rates
- Database query performance
- User analytics

### Database Maintenance
```bash
# Backup regular
mysqldump -h host -u user -p database > backup_$(date +%Y%m%d).sql

# Optimize tables
OPTIMIZE TABLE users, logbook;

# Check database
CHECK TABLE users, logbook;

# Repair if needed
REPAIR TABLE users, logbook;
```

### Performance Optimization
1. Add database indexes
```sql
ALTER TABLE logbook ADD INDEX idx_user_id (user_id);
ALTER TABLE logbook ADD INDEX idx_status (status);
ALTER TABLE logbook ADD INDEX idx_created_at (created_at);
```

2. Enable query caching (MySQL)
3. Implement application-level caching
4. Use CDN for static files
5. Implement API rate limiting

---

## 🆘 Common Issues & Solutions

### Issue: MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution**:
1. Check MySQL is running
2. Verify credentials in `.env.local`
3. Check firewall settings
4. Verify MySQL port (default 3306)

### Issue: Port 3000 Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

### Issue: Out of Memory
**Solution**:
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm start`
- Optimize queries
- Implement pagination
- Use connection pooling

### Issue: Slow Database Queries
**Solution**:
- Add indexes on frequently queried columns
- Use EXPLAIN to analyze queries
- Implement query caching
- Paginate results

---

## 📊 Performance Benchmarks

### Expected Performance
- Page load: < 2 seconds
- API response: < 500ms
- Database query: < 100ms
- Export Excel: < 5 seconds (for 1000 records)

### Optimization Tips
1. Use database indexes
2. Implement caching
3. Minimize API calls
4. Optimize bundle size
5. Use CDN for assets
6. Enable compression
7. Lazy load images
8. Implement pagination

---

## 🔐 Security Checklist

- [ ] HTTPS/SSL enabled
- [ ] Environment variables not exposed
- [ ] Database backups automated
- [ ] Rate limiting implemented
- [ ] Input validation & sanitization
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention
- [ ] Regular security updates
- [ ] Penetration testing
- [ ] Security headers configured
- [ ] CORS properly configured

---

## 📞 Support Resources

- Next.js Docs: https://nextjs.org/docs
- MySQL Docs: https://dev.mysql.com/doc/
- Node.js Docs: https://nodejs.org/docs/
- Deployment Guides: https://vercel.com/docs

---

**Last Updated**: January 15, 2026
**Version**: 1.0.0
