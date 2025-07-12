# JLU College Management System

A comprehensive college management system built for Jagran Lakecity University (JLU) Design Department, featuring modern timetable and attendance management with support for module-based teaching.

## 🎯 Features

### Core Functionality
- **Role-based Authentication** - Admin, Faculty, and Student access levels
- **Academic Management** - Universities, Departments, Programs, and Specializations
- **Batch Management** - Semester-based student groups with capacity tracking
- **Subject Management** - Credit-based courses with customizable exam and subject types
- **Faculty Management** - Primary and co-faculty assignment system
- **Student Management** - Complete student profiles with guardian information
- **Timetable Management** - Configurable time slots and scheduling
- **Attendance System** - Daily attendance tracking with dispute management

### Advanced Features
- **Module-based Teaching** - Support for full-day, half-day, and multi-day continuous subjects
- **Flexible Credit System** - Configurable credit-to-hour ratios (default: 15 hours per credit)
- **Customizable Types** - Admin-configurable exam types and subject categories
- **Real-time Updates** - Live data synchronization across the platform
- **Responsive Design** - Mobile-first design with dark mode support
- **Data Export** - Export capabilities for reports and analytics

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - Modern component library
- **Lucide React** - Beautiful icons
- **React Hook Form** - Form management with Zod validation

### Backend
- **Next.js API Routes** - Serverless backend
- **Prisma ORM** - Database management and migrations
- **SQLite** - Development database (easily changeable to PostgreSQL)
- **NextAuth.js v4** - Authentication with JWT strategy

### Development Tools
- **Turbopack** - Fast development builds
- **ESLint** - Code linting
- **TypeScript** - Static type checking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ankish8/College-Management.git
   cd College-Management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Use the seeded credentials below to sign in

## 👥 Default Credentials

The system comes with pre-seeded accounts for testing:

| Role | Email | Password | Description |
|------|--------|----------|-------------|
| **Admin** | admin@jlu.edu.in | admin123 | Full system access |
| **Faculty** | ankish.khatri@jlu.edu.in | password123 | Faculty permissions |
| **Student** | virat@student.jlu.edu.in | password123 | Student access |

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── settings/          # Configuration pages
│   └── subjects/          # Subject management
├── components/            # React components
│   ├── ui/               # Shadcn/UI components
│   ├── auth/             # Authentication components
│   ├── batches/          # Batch management
│   ├── subjects/         # Subject components
│   └── settings/         # Settings components
├── lib/                  # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── seed.ts           # Database seeding
│   └── utils/            # Helper functions
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks

prisma/
├── schema.prisma         # Database schema
├── migrations/           # Database migrations
└── dev.db               # SQLite database file
```

## 🎓 Academic Structure

The system supports a hierarchical academic structure:

```
University (JLU)
└── Department (Design Department)
    └── Programs (B.Des, M.Des)
        └── Specializations (UX Design, Graphic Design, etc.)
            └── Batches (Semester-based groups)
                └── Students
```

### Key Concepts

- **Credits & Hours**: Configurable ratio (default: 1 credit = 15 hours)
- **Module-based Teaching**: Subjects can run for flexible durations
- **Semester System**: Both odd and even semesters supported
- **Attendance Tracking**: Daily attendance with dispute resolution
- **Role-based Access**: Different permissions for Admin, Faculty, and Students

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset and re-seed database |

## 🎨 UI Components

The application uses a modern design system built on:

- **Shadcn/UI** - Pre-built accessible components
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Consistent iconography
- **Dark Mode** - System-based theme switching
- **Responsive Design** - Mobile-first approach

## 🔐 Authentication & Security

- **NextAuth.js v4** with JWT strategy
- **Role-based permissions** (Admin, Faculty, Student)
- **Secure password hashing** with bcryptjs
- **Session management** with automatic renewal
- **Protected API routes** with middleware validation

## 📊 Database Schema

Built with Prisma ORM featuring:

- **Universities & Departments** - Multi-tenant support
- **Programs & Specializations** - Flexible academic structure
- **Users & Students** - Comprehensive user management
- **Subjects & Batches** - Course and class management
- **Timetables & Time Slots** - Scheduling system
- **Attendance & Disputes** - Tracking and resolution

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Database Migration
For production, update `DATABASE_URL` to PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/college_db"
```

Then run migrations:
```bash
npx prisma migrate deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ankish Khatri**
- GitHub: [@Ankish8](https://github.com/Ankish8)
- Project: [College Management System](https://github.com/Ankish8/College-Management)

## 🙏 Acknowledgments

- Built for Jagran Lakecity University Design Department
- Powered by Next.js, Prisma, and modern web technologies
- UI components from Shadcn/UI library

---

**Made with ❤️ for educational institutions seeking modern management solutions.**