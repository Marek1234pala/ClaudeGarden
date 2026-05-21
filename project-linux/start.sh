#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  start.sh — Pure Linux / WSL setup
#  Installs MySQL inside WSL if missing. No XAMPP needed.
#  Usage:  bash start.sh
# ─────────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}   Auth Project — Linux / WSL Setup                    ${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────────
info "Checking Node.js..."
command -v node >/dev/null 2>&1 || error "Node.js not found. Install it: https://nodejs.org"
command -v npm  >/dev/null 2>&1 || error "npm not found. Comes with Node.js."
success "Node.js $(node -v) found"

# ── 2. Install MySQL inside WSL if missing ────────────────────────
info "Checking MySQL server..."
if ! command -v mysql >/dev/null 2>&1; then
  warn "MySQL not found — installing inside WSL..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server mysql-client
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y mysql-server
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y mysql-server
  else
    error "Unsupported package manager. Install mysql-server manually then re-run."
  fi
  success "MySQL installed"
else
  success "MySQL already installed"
fi

# ── 3. Start MySQL service ────────────────────────────────────────
info "Starting MySQL service..."

start_mysql_service() {
  if command -v systemctl >/dev/null 2>&1 && systemctl list-units >/dev/null 2>&1; then
    sudo systemctl start mysql   2>/dev/null || \
    sudo systemctl start mysqld  2>/dev/null || \
    sudo systemctl start mariadb 2>/dev/null || true
  else
    sudo service mysql start   2>/dev/null || \
    sudo service mysqld start  2>/dev/null || \
    sudo service mariadb start 2>/dev/null || true
  fi
}

# Check if MySQL socket/port is accepting connections (no credentials needed)
mysql_port_open() {
  (echo > /dev/tcp/127.0.0.1/3306) >/dev/null 2>&1
}

if mysql_port_open; then
  success "MySQL is already running"
else
  start_mysql_service
  WAIT=0
  until mysql_port_open || [ $WAIT -ge 20 ]; do
    sleep 1; WAIT=$((WAIT+1))
    echo -ne "  Waiting for MySQL... ${WAIT}s\r"
  done
  echo ""
  mysql_port_open || error "MySQL failed to start. Try: sudo service mysql start"
  success "MySQL started"
fi

# ── 4. Load .env (BEFORE touching MySQL credentials) ─────────────
info "Checking backend .env..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  warn ".env created from .env.example — using defaults (root, no password)"
  echo ""
  echo -e "${YELLOW}  Edit backend/.env now if you want a custom password, then press Enter.${RESET}"
  read -rp "  Press Enter to continue..."
else
  success ".env found"
fi

# Load all vars from .env
set -a
# shellcheck disable=SC1091
source backend/.env
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-login}"

# ── 5. Verify / fix MySQL root access ────────────────────────────
info "Verifying MySQL access for user '$DB_USER'..."

# Build a test command using exactly the credentials from .env
try_connect() {
  local cmd="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER --connect-timeout=5"
  [ -n "$DB_PASSWORD" ] && cmd="$cmd -p$DB_PASSWORD"
  $cmd -e "SELECT 1;" >/dev/null 2>&1
}

if try_connect; then
  success "MySQL credentials OK"
else
  warn "Cannot connect with credentials from .env — attempting to fix..."
  echo ""

  # Ubuntu/Debian installs root with auth_socket by default.
  # We use sudo to get in, then set the password to whatever is in .env.
  if sudo mysql -u root -e "SELECT 1;" >/dev/null 2>&1; then
    info "Connected via sudo (auth_socket). Applying credentials from .env..."

    if [ -n "$DB_PASSWORD" ]; then
      sudo mysql -u root <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
SQL
      success "Root password set to the value in backend/.env"
    else
      # .env has no password — switch to native auth with empty password
      sudo mysql -u root <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
SQL
      success "Root switched to password auth (empty password)"
    fi

    # Verify the fix worked
    if try_connect; then
      success "MySQL credentials verified"
    else
      error "Still cannot connect after fix. Check DB_USER / DB_PASSWORD in backend/.env"
    fi

  else
    # sudo mysql didn't work either — ask the user for their current MySQL root password
    echo -e "${YELLOW}  Could not connect as root via sudo either.${RESET}"
    echo -e "  This means a custom root password was set previously."
    echo ""
    read -rsp "  Enter your CURRENT MySQL root password: " CURRENT_PASS
    echo ""

    if mysql -u root -p"$CURRENT_PASS" -e "SELECT 1;" >/dev/null 2>&1; then
      if [ -n "$DB_PASSWORD" ]; then
        # Update root to use the password that's in .env
        mysql -u root -p"$CURRENT_PASS" <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
SQL
        success "Root password updated to match backend/.env"
      else
        # .env has no password — save the working password into .env
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$CURRENT_PASS/" backend/.env
        DB_PASSWORD="$CURRENT_PASS"
        success "Saved working password into backend/.env"
      fi
    else
      echo ""
      echo -e "${RED}  Cannot access MySQL. Possible fixes:${RESET}"
      echo -e "  1. Make sure DB_PASSWORD in backend/.env matches your MySQL root password"
      echo -e "  2. Or reset MySQL root: sudo mysql_secure_installation"
      echo ""
      error "Cannot connect to MySQL. Fix credentials then re-run: bash start.sh"
    fi
  fi
fi

# ── 6. Create database and import schema ─────────────────────────
info "Setting up database '$DB_NAME'..."

MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER"
[ -n "$DB_PASSWORD" ] && MYSQL_CMD="$MYSQL_CMD -p$DB_PASSWORD"

if $MYSQL_CMD -e "USE $DB_NAME;" 2>/dev/null; then
  success "Database '$DB_NAME' already exists — skipping"
else
  info "Creating database and importing schema..."
  $MYSQL_CMD < backend/database/schema.sql 2>/dev/null \
    || error "Schema import failed. Check backend/.env credentials."
  success "Database '$DB_NAME' ready"
fi

# ── 7. Install Node dependencies ─────────────────────────────────
info "Installing Node.js dependencies..."
(cd backend && npm install --silent)
success "Dependencies installed"

# ── 8. Start the server ───────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  All set! Starting the server...                     ${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  Open your browser at: ${CYAN}http://localhost:3000${RESET}"

echo ""
echo -e "  ${YELLOW}WSL tip:${RESET} open the frontend from Windows by running:"
echo -e "    ${CYAN}explorer.exe frontend/index.html${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop."
echo ""

cd backend && node src/app.js
