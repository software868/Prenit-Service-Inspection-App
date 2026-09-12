# Prenit Service Inspection App

Mobile-first hospital site service checklist web application for field engineers.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS 4** — mobile-first UI
- **MongoDB** + **Prisma ORM**
- **PWA** — offline-first with `next-pwa`

## Features

- Site hierarchy: Kanpur → CNDS/PMSSY → Sections → OT/Equipment
- Card-based selection with breadcrumb navigation
- Checklist with OK / Not OK / N.A. status per item
- Remarks with voice-to-text (Hindi, English, Hinglish) and text-to-speech
- Photo upload and audio note recording/upload per item
- Draft save (local + server)
- Submit report with PDF generation
- Admin dashboard — search, filter, export CSV, download PDF
- Offline-first PWA with cached hierarchy data

## Prerequisites

- Node.js 20+
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

```bash
# Install dependencies
npm install

# Copy environment file (already included as .env)
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push schema to MongoDB
npm run db:push

# Seed site hierarchy and checklist data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

- **Admin password:** `admin123` (set via `NEXT_PUBLIC_ADMIN_PASSWORD`)

## Site Hierarchy

```
Kanpur
├── CNDS
│   ├── Operation Theatres → OT-1 to OT-8 (18 equipment items each)
│   ├── Electrical Section → 7 equipment categories
│   └── HVAC → 5 equipment categories
└── PMSSY
    ├── OT → OT-1 to OT-8 (18 equipment items each)
    └── MGPS → 6 equipment categories
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to MongoDB |
| `npm run db:seed` | Seed hierarchy data |

## Project Structure

```
src/
├── app/              # Pages and API routes
├── components/       # UI and checklist components
├── hooks/            # React hooks
├── lib/              # Services, utils, offline support
└── store/            # Zustand state management
prisma/
├── schema.prisma     # Database models
└── seed.ts           # Seed data
```
