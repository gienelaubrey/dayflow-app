# DayFlow

**DayFlow** is a full-stack productivity web application for managing tasks, calendar events, notes, habits, focus sessions, and goals in one place.

It combines a React frontend with an Express API, PostgreSQL persistence through Prisma, email-based authentication with Resend, and a production deployment using Render and Neon.

> **Plan · Focus · Grow**

---

## Overview

DayFlow was built as a complete full-stack application rather than a frontend-only productivity dashboard.

It includes:

- secure account registration and login
- email OTP verification
- forgot-password and password-reset flows
- persistent server-side sessions
- PostgreSQL-backed productivity data
- responsive desktop and mobile layouts
- Light, Dark, and System themes
- production deployment with a managed database

---

## Features

### Authentication

- Create an account
- Email verification using a 6-digit OTP
- Resend verification codes
- Login and logout
- Persistent server-side sessions
- Forgot password
- Password reset through email OTP
- Profile updates

### Dashboard

- Productivity overview
- Task summary
- Schedule overview
- Notes preview
- Habit progress

### Tasks

- Create tasks
- Edit tasks
- Complete or reopen tasks
- Delete tasks
- Priority levels
- Due dates
- Descriptions
- Filtering

### Calendar

- Month view
- Week view
- Day view
- Create and edit events
- Event categories
- Start and end times
- Locations
- Descriptions
- Task and event indicators

### Notes

- Create and edit notes
- Delete notes
- Search notes
- Categories
- Pin notes
- Favorite notes
- Quick Capture

### Habits

- Create custom habits
- Daily completion tracking
- Habit streaks
- Weekly consistency view
- Habit icons and colors

### Focus Timer

- Focus mode
- Break mode
- Configurable session durations
- Completed focus sessions saved to PostgreSQL
- Current timer state kept locally while a session is running

### Goals

- Create and edit goals
- Delete goals
- Categories
- Target dates
- Progress tracking
- Goal filtering

### Settings

- Profile settings
- Light theme
- Dark theme
- System theme
- JSON backup export
- Backup restore
- Clear application data

### Responsive UI

- Desktop layout
- Tablet layout
- Mobile navigation drawer
- Responsive forms and cards
- Dark-mode component styling

---

# Tech Stack

## Frontend

- **React 19**
- **React DOM**
- **Vite**
- **JavaScript / JSX**
- **CSS**
- **Tailwind CSS**
- **Lucide React**
- **Oxlint**

The main DayFlow interface is custom-styled with CSS, including the rose/pink design system, responsive layouts, mobile navigation, and dark mode.

## Backend

- **Node.js**
- **Express 5**
- **Prisma ORM**
- **PostgreSQL**
- **bcryptjs**
- **cookie-parser**
- **CORS**
- **dotenv**
- **Node.js crypto**
- **Resend SDK**

## Infrastructure

- **Git**
- **GitHub**
- **Render**
- **Neon PostgreSQL**
- **Resend**
- **Render Blueprint (`render.yaml`)**

---

# Architecture

DayFlow uses a single-service production architecture.

```text
Browser
   |
   v
Render Web Service
   |
   +-- React / Vite production build
   |
   +-- Express API (/api)
          |
          +-- Prisma
          |     |
          |     v
          |   Neon PostgreSQL
          |
          +-- Resend
                |
                v
          Verification / Reset Email
```

In production, Express serves both the compiled frontend and the API.

This keeps the frontend and backend on the same origin and simplifies cookie-based authentication.

---

# Project Structure

```text
dayflow/
├── public/
├── src/
│   ├── components/
│   │   ├── AuthPage.jsx
│   │   ├── Avatar.jsx
│   │   ├── CalendarPage.jsx
│   │   ├── GoalsPage.jsx
│   │   ├── HabitsFocusPage.jsx
│   │   ├── NotesPage.jsx
│   │   ├── ProfileMenu.jsx
│   │   ├── SettingsPage.jsx
│   │   └── TasksPage.jsx
│   │
│   ├── lib/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   └── otp-auth.css
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env.example
│   └── package.json
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── render.yaml
├── vite.config.js
└── README.md
```

---

# Database

DayFlow uses PostgreSQL through Prisma.

The main models are:

- `User`
- `PendingRegistration`
- `PasswordReset`
- `Session`
- `Task`
- `Event`
- `Note`
- `Habit`
- `HabitCompletion`
- `FocusSession`
- `Goal`

## Data Ownership

All productivity records are user-scoped.

A logged-in user can only access records associated with their own account.

---

# Authentication

DayFlow uses custom email/password authentication.

## Password Storage

Passwords are hashed with `bcryptjs` before being stored.

Plain-text passwords are never saved in the database.

## Email Verification

Registration follows this flow:

```text
Create account
    |
    v
Hash password
    |
    v
Create pending registration
    |
    v
Generate 6-digit OTP
    |
    v
Hash OTP
    |
    v
Send email with Resend
    |
    v
Verify code
    |
    v
Create user account
```

## Password Reset

```text
Forgot password
    |
    v
Generate reset OTP
    |
    v
Send reset email
    |
    v
Verify code
    |
    v
Set a new password
```

## Sessions

DayFlow uses database-backed sessions.

The browser receives an authentication cookie while the server stores a hashed session token in PostgreSQL.

Production cookies use secure settings such as:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`

---

# Security

DayFlow includes several backend protections:

- bcrypt password hashing
- server-side session validation
- hashed session tokens
- hashed OTP values
- OTP expiration
- OTP resend cooldown
- OTP attempt limits
- authentication middleware
- user-scoped database queries
- origin validation for mutating requests
- API rate limiting
- authentication-specific rate limiting
- security response headers
- `Cache-Control: no-store` for API responses
- secure production cookies

Secrets are stored only through environment variables.

---

# API

All application API routes use the `/api` prefix.

## Health

```http
GET /api/health
```

## Authentication

```text
POST   /api/auth/register
POST   /api/auth/verify-email
POST   /api/auth/resend-otp
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/profile
```

## Tasks

```text
GET     /api/tasks
POST    /api/tasks
PATCH   /api/tasks/:id
DELETE  /api/tasks/:id
PUT     /api/tasks
```

## Events

```text
GET     /api/events
POST    /api/events
PATCH   /api/events/:id
DELETE  /api/events/:id
PUT     /api/events
```

## Notes

```text
GET     /api/notes
POST    /api/notes
PATCH   /api/notes/:id
DELETE  /api/notes/:id
PUT     /api/notes
```

## Habits

```text
GET     /api/habits
POST    /api/habits
PATCH   /api/habits/:id
PATCH   /api/habits/:id/completion
DELETE  /api/habits/:id
PUT     /api/habits
```

## Focus Sessions

```text
GET     /api/focus-sessions
POST    /api/focus-sessions
DELETE  /api/focus-sessions/:id
PUT     /api/focus-sessions
```

## Goals

```text
GET     /api/goals
POST    /api/goals
PATCH   /api/goals/:id
DELETE  /api/goals/:id
PUT     /api/goals
```

---

# Environment Variables

Create local `.env` files from the included example files.

Never commit real secrets.

## Frontend

Example:

```env
VITE_API_URL=http://localhost:4000
```

This is mainly used for local development.

The recommended production deployment uses same-origin API requests, so a production `VITE_API_URL` is not required.

## Backend

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

PORT=4000
NODE_ENV=development

CLIENT_ORIGIN=http://localhost:5173

SESSION_DAYS=30

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="DayFlow <your-sender@example.com>"

OTP_SECRET=replace_with_a_long_random_secret
OTP_TTL_MINUTES=10
OTP_RESEND_SECONDS=45
OTP_MAX_ATTEMPTS=5

API_RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_MAX=60
```

> Never place real API keys, database credentials, passwords, or OTP secrets in the repository.

---

# Local Development

## Requirements

- Node.js 20+
- npm
- PostgreSQL
- Git
- Resend account for email verification testing

## 1. Clone the repository

```bash
git clone <repository-url>
cd dayflow
```

## 2. Install frontend dependencies

```bash
npm install
```

## 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

## 4. Configure the database

Create a PostgreSQL database and add the connection string to:

```text
server/.env
```

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/dayflow
```

## 5. Configure environment variables

Copy the example files and replace placeholder values with your own local configuration.

Do not commit the resulting `.env` files.

## 6. Generate Prisma Client

```bash
cd server
npm run prisma:generate
```

## 7. Run database migrations

```bash
npm run prisma:migrate
```

## 8. Start the backend

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:4000
```

## 9. Start the frontend

In another terminal:

```bash
cd ..
npm run dev
```

The Vite frontend runs on:

```text
http://localhost:5173
```

---

# Development Commands

## Frontend

```bash
npm run dev
```

Start Vite.

```bash
npm run build
```

Create a production build.

```bash
npm run lint
```

Run linting.

```bash
npm run preview
```

Preview the Vite production build.

## Backend

Run these from `server/`.

```bash
npm run dev
```

Start the backend in development mode.

```bash
npm start
```

Start the backend normally.

```bash
npm run prisma:generate
```

Generate Prisma Client.

```bash
npm run prisma:migrate
```

Run development migrations.

```bash
npm run prisma:studio
```

Open Prisma Studio.

```bash
npm run start:prod
```

Run production migrations and start the server.

---

# Testing the Production Build Locally

Build the frontend:

```bash
npm run build
```

Then start the Express server in production mode.

PowerShell example:

```powershell
$env:NODE_ENV="production"
cd server
npm start
```

Open:

```text
http://localhost:4000
```

In production mode, Express serves the compiled frontend from `dist/`.

When editing frontend files, use Vite during development for instant updates.

Before testing through port `4000`, rebuild the frontend.

---

# Deployment

DayFlow is configured for deployment using:

- GitHub
- Render
- Neon PostgreSQL
- Resend

## Render

`render.yaml` contains the production service configuration.

The deployment process:

1. installs frontend dependencies
2. builds the React application
3. installs backend dependencies
4. generates Prisma Client
5. applies production migrations
6. starts the Express server
7. serves the built frontend
8. exposes the `/api` routes

## Neon

Neon provides the production PostgreSQL database.

The Neon connection string is configured as the production `DATABASE_URL`.

## Resend

Resend sends:

- verification OTP emails
- password-reset OTP emails

For a public deployment, use a verified sending domain.

---

# Data Persistence

The following data is stored in PostgreSQL:

- user accounts
- authentication sessions
- pending registrations
- password-reset records
- tasks
- events
- notes
- habits
- habit completion history
- completed focus sessions
- goals

The following remain browser-local by design:

- Light / Dark / System appearance preference
- currently running focus timer state

---

# Backup and Restore

The Settings page supports JSON backups.

Users can:

- download a backup
- restore a backup
- clear DayFlow data

This provides a portable copy of productivity data for recovery or migration.

---

# Themes

DayFlow supports:

```text
Light
Dark
System
```

The appearance preference is stored locally on the device.

The interface includes:

- custom rose/pink visual design
- dark mode
- responsive cards and forms
- desktop sidebar
- off-canvas mobile navigation
- focus-visible styling
- reduced-motion support

---

# Development Journey

DayFlow was developed incrementally:

1. React/Vite frontend
2. Productivity dashboard UI
3. Responsive/mobile interface
4. Express backend
5. PostgreSQL + Prisma
6. Authentication and sessions
7. Resend OTP verification
8. Password-reset flow
9. Task persistence
10. Calendar persistence
11. Notes persistence
12. Habits and completion history
13. Focus-session persistence
14. Goals persistence
15. Light/Dark/System themes
16. Responsive and contrast fixes
17. Security hardening
18. Production configuration
19. Neon production database
20. Render deployment
21. Final frontend polish

---

# Built With

```text
React
React DOM
Vite
JavaScript
JSX
CSS
Tailwind CSS
Lucide React

Node.js
Express
Prisma
PostgreSQL
bcryptjs
cookie-parser
CORS
dotenv
Node.js crypto
Resend

Neon
Render
Git
GitHub
Oxlint
```

---

# Security Notice

This repository intentionally does **not** contain production credentials.

Before running your own deployment:

- create your own PostgreSQL database
- create your own Resend API key
- generate a strong OTP secret
- configure environment variables locally or through your hosting provider
- never commit `.env` files

If a credential is accidentally committed, rotate it immediately.

---

# Status

**DayFlow v1** is a complete full-stack productivity application with authentication, database persistence, email verification, responsive design, and production deployment support.

---

## License

This project is currently provided as a personal full-stack development project.

Add a license file if you plan to allow reuse, modification, or redistribution.

---

## Author

Built as a full-stack development project for **DayFlow**.

**Plan · Focus · Grow**
