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

# Run migrations using Prisma CLI
echo "Running migrations..."
# Use npx to run Prisma CLI (works with global install or local)
npx prisma@5.19.0 migrate deploy

# Start the application
echo "Starting Next.js..."
exec node server.js

