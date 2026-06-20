# Impact Grid - Change Impact Simulator

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)

**Impact Grid** is a platform designed to simulate how software requirement changes affect **Time**, **Cost**, **Effort**, and **Risk**. It is built to help evaluate the impact of scope changes before approval.

> **Live Demo**: [impact-sensei.vercel.app](https://impact-sensei.vercel.app)

## Features
- **Impact Analysis**: Automatically calculates impact across cost, time, effort, and risk dimensions.
- **Authentication**: Secure JWT authentication, 6-digit Email OTP, and 2FA via Google Authenticator. Single-device sessions are enforced.
- **User Roles**: Supports Super Admin, Project Manager, and Client roles with varying access levels.
- **Reporting**: Export reports to PDF and view interactive data charts.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, Recharts
- **Backend**: FastAPI, SQLAlchemy, JWT + bcrypt, SQLite (or PostgreSQL)

## User Roles
1. **Super Admin**: Full system control.
2. **Project Manager**: Create projects, approve changes.
3. **Client**: Submit change requests.

## Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python run.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the `backend` folder and refer to the `.env.example` file for the required keys (like `DATABASE_URL`, `SECRET_KEY`, etc.).

