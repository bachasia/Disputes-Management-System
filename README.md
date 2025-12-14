# PayPal Disputes Management System

A comprehensive Next.js 14 application for managing PayPal disputes across multiple PayPal accounts.

## Features

- 🔐 **Authentication & Authorization**: NextAuth.js with role-based access control (Admin, User, Viewer)
- 💳 **Multi-Account Management**: Manage multiple PayPal accounts with encrypted credentials
- ⚡ **Dispute Synchronization**: Automatic and manual sync of disputes from PayPal API
- 📊 **Analytics Dashboard**: Real-time statistics and charts for dispute analysis
- 🔄 **Auto Sync**: Configurable automatic synchronization with cron jobs
- 👥 **User Management**: Admin panel for managing users and permissions
- ⚙️ **Settings**: Configurable application settings and user preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Notifications**: Sonner

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- PayPal API credentials (Client ID & Secret)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dispute
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/dispute_db"

   # NextAuth
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"

   # Encryption (for PayPal credentials)
   ENCRYPTION_KEY="your-32-character-encryption-key"

   # Optional: Cron Secret (for auto sync)
   CRON_SECRET="your-cron-secret"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed initial data (admin user, etc.)
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

After seeding the database:
- **Email**: `admin@example.com`
- **Password**: `password123`

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
dispute/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── disputes/          # Dispute-related components
│   │   ├── accounts/          # PayPal account components
│   │   └── ...
│   ├── lib/                   # Utility libraries
│   │   ├── db/                # Database client
│   │   ├── paypal/            # PayPal API client
│   │   └── services/          # Business logic services
│   └── types/                 # TypeScript type definitions
├── .env.local                 # Environment variables (not in git)
└── vercel.json                # Vercel configuration (cron jobs)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with initial data

## Features Overview

### Dispute Management
- View all disputes in a filterable table
- Filter by status, account, date range, invoice number, customer name
- View detailed dispute information
- Manual and automatic synchronization

### PayPal Accounts
- Add multiple PayPal accounts
- Encrypted credential storage
- Test account connectivity
- Per-account sync options

### Analytics
- KPI cards (Total Disputes, Total Amount, Win Rate, etc.)
- Disputes over time chart
- Disputes by status chart
- Date range filtering

### Auto Sync
- Configurable sync frequency (15 min, 30 min, 1 hour, 6 hours, daily)
- Incremental, 90-day, or full sync options
- Sync on startup option
- Test sync functionality

### User Management (Admin Only)
- Create, edit, and delete users
- Role-based permissions (Admin, User, Viewer)
- Account activation/deactivation

### Settings
- General application settings
- Sync configuration
- User preferences (timezone, date format, etc.)

## Role Permissions

- **Admin**: Full access to all features, can manage users and PayPal accounts
- **User**: Can view and sync disputes, cannot manage accounts or users
- **Viewer**: Read-only access, cannot modify or sync data

## Auto Sync Setup

Auto sync can be configured in Settings → Sync Settings. For production:

1. **Vercel**: Cron jobs are automatically configured via `vercel.json`
2. **Other platforms**: Set up external cron service to call `POST /api/cron/sync` every 15 minutes

See `AUTO_SYNC_SETUP.md` for detailed instructions.

## Environment Variables

Required environment variables are documented in `.env.example` (if available) or in the Installation section above.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - All rights reserved

## Support

For issues or questions, please contact the development team.
