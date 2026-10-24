# DayFlow

**DayFlow** is a full-stack productivity web application designed to help users organize their day, stay focused, build habits, and track personal goals in one place.

> **Plan · Focus · Grow**

## Features

- Task management
- Calendar and event planning
- Notes and quick capture
- Habit tracking and streaks
- Focus timer
- Goal tracking
- User authentication
- Email verification and password recovery
- Light, Dark, and System themes
- Responsive desktop and mobile interface
- Backup and restore support

## Tech Stack

### Frontend
- React
- Vite
- JavaScript / JSX
- CSS
- Tailwind CSS
- Lucide React

### Backend
- Node.js
- Express
- Prisma
- PostgreSQL

### Services
- Neon
- Resend
- Render
- GitHub

## Getting Started

### Requirements

- Node.js 20+
- npm
- PostgreSQL

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd dayflow
```

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
```

Create your local environment files from the provided `.env.example` files and add your own configuration values.

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run the database migrations:

```bash
npm run prisma:migrate
```

Start the backend:

```bash
npm run dev
```

In another terminal, start the frontend:

```bash
cd ..
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

## Production Build

Create the frontend production build with:

```bash
npm run build
```

DayFlow is configured for production deployment with Render and a managed PostgreSQL database.

## Security

Sensitive values such as database credentials, API keys, and application secrets are stored using environment variables and are not included in this repository.

Never commit `.env` files or production credentials.

## Project Status

**DayFlow v1** is complete and deployed.

The project includes the core productivity features, authentication, persistent storage, responsive design, and production support needed for personal everyday use.

## Author

Built as a full-stack development project for **DayFlow**.

**Plan · Focus · Grow**
