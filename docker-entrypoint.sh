#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready
echo "Waiting for database..."
until npx prisma db execute --command "SELECT 1" > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

# Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting Next.js..."
exec node server.js

