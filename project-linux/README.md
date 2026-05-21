# Auth Project — Linux / WSL

Runs entirely inside Linux (or WSL). No XAMPP. MySQL is installed inside WSL.

## Requirements
- WSL (Ubuntu/Debian recommended) or any Linux distro
- Node.js v18+ → https://nodejs.org

## Start

```bash
bash start.sh
```

### What the script does automatically
1. Installs `mysql-server` inside WSL via `apt` if not already installed
2. Starts the MySQL service (supports both systemd and non-systemd WSL)
3. Configures root access (handles Ubuntu's `auth_socket` quirk)
4. Creates the `backend/.env` from the example
5. Creates the `login` database and imports the schema
6. Runs `npm install`
7. Starts the API on `http://localhost:3000`

### Open the frontend (WSL)
```bash
explorer.exe frontend/index.html
```
Or open `frontend/index.html` from Windows Explorer.

## Project layout
```
project-linux/
├── start.sh
├── frontend/
│   ├── index.html
│   ├── homepage.html
│   ├── script.js
│   └── style.css
└── backend/
    ├── src/
    ├── database/schema.sql
    ├── package.json
    └── .env.example
```

## API
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET  | `/api/auth/me` | Current user |
