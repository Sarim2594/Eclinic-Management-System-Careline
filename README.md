# CareLine — React + Node.js/Express Migration

## Quick Start

### Local Development

### 1. Configure database — edit `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=careline
DB_USER=postgres
DB_PASSWORD=your_password_here
APP_PORT=5000
```

### 2. Initialize the normalized database:
```bash
cd backend && npm install && npm run db:init
```

### 3. Start backend:
```bash
cd backend && npm install && npm run dev
```
Runs on **http://localhost:5000**

### 4. Start frontend:
```bash
cd frontend && npm install && npm start
```
Runs on **http://localhost:3000**

## Docker Deployment

### Prerequisites
- Docker and Docker Compose installed on your VPS

### Deployment Steps

1. **Clone the repository** on your VPS:
```bash
git clone <your-repo-url>
cd careline-management-system
```

2. **Build and start the containers**:
```bash
docker-compose up -d --build
```

3. **Initialize the schema and demo data**:
```bash
docker compose run --rm backend npm run db:init
```

4. **Check if services are running**:
```bash
docker-compose ps
```

5. **View logs** (if needed):
```bash
docker-compose logs -f
```

### Access the Application
- Frontend: http://your-vps-ip
- Backend API: http://your-vps-ip:5000
- Database: Accessible internally on port 5432

### Environment Variables
The current Docker setup uses:
- Database: `careline`
- User: `sarim`
- Password: `${DB_PASSWORD}` from the root `.env`

For production, consider using Docker secrets or environment files.

### Stopping the Application
```bash
docker-compose down
```

### Updating the Application
```bash
git pull
docker-compose up -d --build
```

## Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Superadmin | `muhammad.yasir` | `super123` |
| Admin | `sarim.khan` | `admin123` |
| Doctor | `ahmed.ali` | `doc123` |
| Receptionist | `kamran.akmal` | `recep123` |

The database now comes from the migration in `backend/migrations/001_initial_redesign.js`
and the reset/seed scripts in `backend/scripts/`.

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
