# ImpactSensei - Enterprise Requirement Change Impact Simulator

## 🚀 Overview
ImpactSensei is a complete enterprise-grade platform that simulates how software requirement changes affect Time, Cost, Effort, and Risk.

## 👥 Roles
- **Admin** - Full system control (aniketagarwal359@gmail.com / password)
- **Project Manager** - Company/project level management
- **Client** - Own projects only

## 🛠️ Tech Stack
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + SQLite/PostgreSQL
- Auth: JWT + bcrypt + 2FA + Google OAuth
- Real-time: WebSockets

## 📦 Installation

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Deployment
- Backend: Render.com
- Frontend: Vercel
- Database: Render PostgreSQL / Supabase

## 📧 Environment Variables
Copy .env.example to .env and fill values:
- DATABASE_URL
- SECRET_KEY
- SMTP_HOST, SMTP_USER, SMTP_PASSWORD (optional)

## ✅ Features
- 3 roles with separate UIs
- Email verification + password reset
- 2FA + Google OAuth
- Real-time WebSocket updates
- Impact calculations (6 cost / 5 time / 3 effort / 5 risk)
- Gantt charts, burndown, sprint planning
- PDF/Excel/CSV/ZIP exports
- Dark mode + responsive design

## 📄 License
MIT

## 👨‍💻 Admin Access
- Email: aniketagarwal359@gmail.com
- Password: password
