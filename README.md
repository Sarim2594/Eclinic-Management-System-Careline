# CareLine — React + Node.js/Express Migration

## Quick Start

### 1. Configure database — edit `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=careline
DB_USER=postgres
DB_PASSWORD=your_password_here
APP_PORT=5000
```

### 2. Start backend:
```bash
cd backend && npm install && npm run dev
```
Runs on **http://localhost:5000**

### 3. Start frontend:
```bash
cd frontend && npm install && npm start
```
Runs on **http://localhost:3000**

## Test Credentials
| Role | Username | Password |
|------|----------|----------|
| Superadmin | `muhammad.yasir` | `super123` |
| Admin | `sarim.khan` | `admin123` |
| Doctor | `ahmed.ali` | `doc123` |
| Receptionist | `kamran.akmal` | `recep123` |

## What Was Migrated
- `main.py` → `backend/server.js`
- `database.py` → `backend/db.js`
- `src/auth/` → `backend/routes/auth.js`
- `src/admin/` → `backend/routes/admin.js`
- `src/doctor/` → `backend/routes/doctor.js`
- `src/receptionist/` → `backend/routes/receptionist.js`
- `src/superadmin/` → `backend/routes/superadmin.js`
- `src/bulletins/` → `backend/routes/bulletins.js`
- `src/notifications/` → `backend/routes/notifications.js`
- `src/core/` → `backend/routes/clinics.js` + `regions.js`
- `templates/index.html` → `frontend/src/pages/Login.jsx`
- `templates/admin.html` → `frontend/src/pages/Admin.jsx`
- `templates/doctor.html` → `frontend/src/pages/Doctor.jsx`
- `templates/receptionist.html` → `frontend/src/pages/Receptionist.jsx`
- `templates/superadmin.html` → `frontend/src/pages/Superadmin.jsx`
- `static/user_state.js` → `frontend/src/context/AuthContext.jsx`
- `static/notifications.js` → `frontend/src/components/NotificationBell.jsx`
- All fetch() calls → `frontend/src/api/index.js`

## Note on Email
The `/api/receptionist/email-diagnosis` endpoint is stubbed.
To enable it, install nodemailer (`npm install nodemailer`) and
configure SMTP in `backend/routes/receptionist.js`.
