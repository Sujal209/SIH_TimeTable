# Academic Timetable Management System

A comprehensive web application for managing academic timetables with automatic generation, conflict resolution, and sharing capabilities.

## Features

### 🎯 Core Features
- **Automatic Timetable Generation** - AI-powered algorithm that generates conflict-free timetables
- **Constraint Management** - Respects teacher availability, classroom capacity, and institutional rules
- **Real-time Collaboration** - Multiple admins can work simultaneously
- **Export & Sharing** - PDF/PNG export with WhatsApp sharing integration

### 👥 User Roles
- **Admin**: Full system access, timetable generation, resource management
- **Teacher**: View personal timetable, set preferences, manage availability

### 🛠️ Technical Features
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark Mode** - Full dark mode support with system preference detection
- **Real-time Updates** - Live updates using Supabase real-time subscriptions

## Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Hook Form** - Form management with validation
- **Zod** - Schema validation

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Row Level Security (RLS)** - Database-level security

### Authentication
- **Firebase Auth** - Secure user authentication
- **Role-based access control** - Admin and teacher roles

### Integrations
- **WhatsApp Cloud API** - Direct timetable sharing
- **jsPDF + html2canvas** - PDF/PNG generation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Firebase account
- WhatsApp Business API account (optional)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables in `.env`

3. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `src/data/schema.sql` in the Supabase SQL Editor

4. **Set up Firebase Authentication**
   - Create a Firebase project
   - Enable Email/Password authentication

5. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # Lint code
```

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── admin/      # Admin-specific components
│   ├── auth/       # Authentication components
│   ├── teacher/    # Teacher-specific components
│   ├── timetable/  # Timetable-related components
│   └── ui/         # Generic UI components
├── contexts/       # React contexts
├── hooks/          # Custom hooks
├── lib/            # Third-party library configurations
├── pages/          # Page components
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── data/           # Static data and schemas
```

## License

This project is licensed under the MIT License.

---

Made with ❤️ for educational institutions worldwide.
