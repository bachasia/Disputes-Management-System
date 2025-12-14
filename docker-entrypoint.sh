#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready
echo "Waiting for database..."
POSTGRES_USER=${POSTGRES_USER:-postgres}
until pg_isready -h postgres -p 5432 -U "$POSTGRES_USER" > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

# Run migrations using local Prisma CLI (from node_modules)
echo "Running migrations..."
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -f "./node_modules/prisma/package.json" ]; then
  # Use npx with specific version from package.json
  PRISMA_VERSION=$(node -p "require('./node_modules/prisma/package.json').version" 2>/dev/null || echo "5.19.0")
  npx "prisma@${PRISMA_VERSION}" migrate deploy
else
  # Fallback: use version from package.json or default
  npx prisma@5.19.0 migrate deploy
fi

# Start the application
echo "Starting Next.js..."
exec node server.js

