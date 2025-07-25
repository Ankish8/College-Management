# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a college management system built for Jagran Lakecity University (JLU) Design Department, featuring timetable and attendance management. The system supports module-based teaching where subjects run for full days or half days over multiple continuous days.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Management
- `npm run db:migrate` - Run Prisma migrations in development
- `npm run db:seed` - Seed database with sample JLU data
- `npm run db:reset` - Reset database and re-seed with sample data
- `npx prisma generate` - Generate Prisma client after schema changes
- `npx prisma studio` - Open Prisma Studio for database inspection

## Architecture

### Authentication System (NextAuth v4)
- Uses NextAuth v4 with credentials provider and JWT strategy
- Server-side session retrieval: `getServerSession(authOptions)`
- Client-side auth: `useSession()` from `next-auth/react`
- Role-based permissions: Admin, Faculty, Student with specific access controls
- Development credentials: admin@jlu.edu.in/admin123, ankish.khatri@jlu.edu.in/password123

### Database Schema (Prisma + SQLite)
Core hierarchy: `University → Department → Program → Batch → Student`

Key models:
- **User**: Base user with role (Admin/Faculty/Student) and department assignment
- **Student**: Extends User with studentId, rollNumber, batch assignment
- **Batch**: Semester-based groups (e.g., "B.Des Semester 5") with program linkage
- **Subject**: Credit-based courses (2/4/6 credits = 30/60/90 hours) with faculty assignment
- **TimeSlot**: Configurable time periods (9:15-10:05, etc.) for timetable scheduling
- **TimetableEntry**: Scheduling subjects to specific time slots and days
- **AttendanceSession**: Daily attendance tracking per subject/batch
- **AttendanceRecord**: Individual student attendance with dispute support

### UI Framework
- **Shadcn/UI**: Component library with Tailwind CSS
- **Components**: Located in `src/components/ui/` (generated), custom components in organized folders
- **Layout**: Server-side dashboard layout with client-side session provider
- **Forms**: React Hook Form + Zod validation pattern

### Permission System
Role-based access control via `src/lib/utils/permissions.ts`:
- `isAdmin()`, `isFaculty()`, `isStudent()` - Role checks
- `canManageSystem()`, `canMarkAttendance()`, `canViewAttendance()` - Action permissions
- Navigation and features are conditionally rendered based on user role

### Module-Based Teaching Model
- Subjects run in flexible durations (full day, half day, multi-day continuous)
- Credit hours: Each credit = 15 hours of instruction
- Attendance is marked daily but calculated based on total credit hours completed
- Time slots are admin-configurable to accommodate different institutional schedules

## File Structure Patterns

### Authentication Flow
- `src/lib/auth.ts` - NextAuth configuration and options
- `src/app/api/auth/[...nextauth]/route.ts` - API routes
- `src/components/auth/` - Auth-related client components
- `src/components/providers/session-provider.tsx` - Client-side session provider

### Type Safety
- `src/types/index.ts` - Extended Prisma types with relations
- `src/types/auth.ts` - Authentication-specific types
- All database operations use properly typed Prisma client

### Database Operations
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/seed.ts` - Sample data seeding for JLU Design Department
- Database uses SQLite for development, easily changeable to PostgreSQL for production

## Environment Setup

Required environment variables:
- `DATABASE_URL` - Database connection (SQLite file path for dev)
- `NEXTAUTH_SECRET` - Secure random string for JWT signing
- `NEXTAUTH_URL` - Application URL for NextAuth callbacks

## Development Notes

### Current Implementation Status
- Core infrastructure: Authentication, database schema, dashboard ✅
- Role-based navigation and permissions ✅
- Sample data with JLU Design Department structure ✅
- **Excel-like Drag Extension System: IMPLEMENTED** ✅
- Next phases: Testing drag functionality, batch management CRUD, attendance marking

### Excel-like Timetable System (COMPLETED)
#### Implemented Components:
- `QuickCreatePopup` - Contextual popup that appears near cursor click
- `DragExtendHandle` - Resize handles for vertical/horizontal event extension
- `DragPreview` - Real-time visual feedback during drag operations
- `AutoSaveManager` - User preferences and recent subjects persistence
- `TimetableWithDragExtension` - Main calendar with integrated drag system

#### Key Features Delivered:
- **Contextual Creation**: Click any time slot → popup appears near cursor (not center screen)
- **One-click Subject Selection**: Ultra-compact interface showing subject names + faculty
- **Excel-like Drag Extension**: 
  - Vertical: Extend across adjacent time slots (same day)
  - Horizontal: Extend across days (same time slot)
- **Real-time Conflict Detection**: Red indicators during drag operations
- **Auto-save**: Recent subjects appear at top, user preferences saved
- **Keyboard Navigation**: ESC to cancel, Enter to confirm, arrow keys
- **Smooth Animations**: Fade-in/out transitions, hover effects

#### Recent Bug Fixes:
- **Authentication Middleware**: Fixed Next.js build corruption by implementing proper redirect handling
- **TypeScript Issues**: Resolved API route parameter typing for Next.js 15
- **Build Configuration**: Simplified next.config.ts to prevent webpack cache corruption
- **Production Build**: Successfully compiled with all drag functionality

### Current Status (Session End)
- **Authentication**: Working correctly - redirects to signin instead of throwing errors ✅
- **Production Build**: Completed successfully, server running on localhost:3000 ✅
- **Next Step**: Test Excel-like drag functionality in live application

### Testing Checklist (NEXT SESSION):
1. Login with admin credentials (admin@jlu.edu.in / admin123)
2. Navigate to timetable page (/admin/timetable)
3. Verify quick create popup appears on time slot clicks
4. Test drag handles appear on hover over timetable events
5. Test vertical drag extension (adjacent time slots)
6. Test horizontal drag extension (same time, different days)
7. Verify conflict detection shows red indicators
8. Test auto-save functionality for recent subjects

### Authentication Debugging
- Uses NextAuth v4 syntax (`getServerSession`, `NextAuthOptions`)
- Client components required for auth state (`"use client"`)
- Sign out must use client-side `signOut()` from `next-auth/react`
- **Fixed**: Middleware now properly redirects unauthenticated users before webpack loading

### Database Schema Evolution
- Schema supports complex academic structures but starts with JLU Design Department
- Designed for future white-label customization for other departments/institutions
- Time slots and credit systems are configurable by admin users

## Git Workflow Guidance
- Do not get pushed unless I ask you to. You can keep on committing but do not push. Only commit when I ask you to, you know, implement a new feature; then you can commit and start implementing.