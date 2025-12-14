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
# Check if migrations directory exists
if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "Migrations directory found, running migrate deploy..."
  npx prisma@5.19.0 migrate deploy --skip-generate
else
  echo "No migrations found, using db push to sync schema..."
  npx prisma@5.19.0 db push --accept-data-loss --skip-generate
fi

# Start the application
echo "Starting Next.js..."
exec node server.js

