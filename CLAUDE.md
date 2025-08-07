# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive college management system built for Jagran Lakecity University (JLU) Design Department, featuring advanced timetable management, attendance tracking, and student/faculty management. The system supports module-based teaching where subjects run for flexible durations with sophisticated conflict detection and auto-saving capabilities.

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

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (production ready)
- **Authentication**: NextAuth.js v4 with JWT strategy
- **State Management**: React Query (@tanstack/react-query)
- **Form Handling**: React Hook Form with Zod validation

### Authentication System (NextAuth v4)
- Uses NextAuth v4 with credentials provider and JWT strategy
- Server-side session retrieval: `getServerSession(authOptions)`
- Client-side auth: `useSession()` from `next-auth/react`
- Role-based permissions: Admin, Faculty, Student with granular access controls
- Development credentials: 
  - Admin: admin@jlu.edu.in/admin123
  - Faculty: ankish.khatri@jlu.edu.in/password123
  - Student: virat@student.jlu.edu.in/password123

### Database Architecture (Prisma + SQLite)
**Core Hierarchy**: `University → Department → Program → Specialization → Batch → Student`

**Key Models**:
- **User**: Base user with role (Admin/Faculty/Student), department assignment, status tracking
- **Student**: Extends User with studentId, rollNumber, batch assignment, guardian info
- **Batch**: Semester-based groups with capacity management and specialization linking
- **Subject**: Credit-based courses with primary/co-faculty assignment and configurable types
- **TimeSlot**: Admin-configurable time periods with duration and sort order
- **TimetableEntry**: Subject scheduling with conflict detection and entry types
- **AttendanceSession/AttendanceRecord**: Comprehensive attendance tracking with dispute resolution
- **AcademicCalendar/Holiday/ExamPeriod**: Academic year management with holidays
- **FacultyPreferences**: Faculty availability, blackout periods, workload limits
- **DepartmentSettings**: Configurable credit ratios, exam types, scheduling modes
- **BulkOperation**: Async operation tracking with progress and logging

**Advanced Features**:
- **Bulk Operations**: Async operations with progress tracking and detailed logging
- **Timetable Templates**: Reusable timetable patterns with Puck.js integration
- **Faculty Workload**: Automatic calculation with configurable limits
- **User Preferences**: View mode persistence and UI customization
- **Conflict Detection**: Real-time scheduling conflict prevention

### UI Framework & Components
- **Shadcn/UI**: Complete component library with dark mode support
- **Component Organization**: 
  - `src/components/ui/` - Base UI components (generated)
  - `src/components/[module]/` - Feature-specific components
  - `src/components/providers/` - Context providers
- **Layout System**: Server-side dashboard with responsive sidebar navigation
- **Form Patterns**: Consistent React Hook Form + Zod validation across all forms
- **Table System**: Advanced sortable tables with filtering, pagination, and export
- **Search System**: Universal search with intelligent query parsing

### Permission & Role System
**Role-based Access Control** via `src/lib/utils/permissions.ts`:
- **Role Checks**: `isAdmin()`, `isFaculty()`, `isStudent()`
- **Action Permissions**: `canManageSystem()`, `canMarkAttendance()`, `canViewAttendance()`
- **Navigation Control**: Conditional rendering based on user role and permissions
- **API Protection**: Middleware-based route protection with role validation

## Key Features Implemented

### 1. Advanced Timetable Management
**Excel-like Interface** (`src/components/timetable/`):
- **QuickCreatePopup**: Contextual popup for rapid class creation
- **Conflict Detection**: Real-time faculty/room conflict checking
- **Auto-save System**: Recent subjects and preferences persistence
- **Drag Extensions**: Visual drag handles for extending time slots
- **Calendar Views**: Multiple view modes (traditional, calendar, workload)
- **Attendance Status Indicators**: Visual feedback on timetable cards showing attendance status
  - **Color-coded badges** showing attendance counts (e.g., "23/35 students")
  - **"Not Marked" status** for classes without attendance data
  - **Heat map bars** indicating attendance percentage with color coding
  - **Direct navigation** to attendance marking from timetable cards

### 2. Student Management System
**Comprehensive Student Portal** (`src/components/students/`):
- **Advanced Filtering**: AND/OR logic with compact filter chips
- **Bulk Operations**: CSV import/export with validation
- **Student Details**: Complete profile with guardian information
- **Table Features**: Sortable columns, copy functionality, responsive design

### 3. Faculty Management
**Faculty Workload & Preferences** (`src/components/faculty/`):
- **Subject Allotment**: Drag-and-drop subject assignment
- **Workload Calculation**: Automatic credit hour tracking
- **Preferences Management**: Time slot preferences and blackout periods
- **Conflict Resolution**: Smart scheduling with alternative suggestions

### 4. Batch & Program Management
**Academic Structure** (`src/components/batches/`, `src/components/settings/`):
- **Hierarchical Organization**: University → Department → Program → Specialization → Batch
- **Capacity Management**: Student enrollment limits and tracking
- **Semester Management**: Odd/even semester support with year tracking
- **Configuration**: Admin-configurable academic calendar and settings

### 5. Universal Search System
**Intelligent Search** (`src/components/universal-search.tsx`):
- **Natural Language**: AI-powered query parsing
- **Multi-entity Search**: Students, faculty, subjects, batches
- **Quick Actions**: Direct navigation and actions from search results
- **Command Palette**: Keyboard shortcuts and rapid navigation

## File Structure & Patterns

### API Architecture
```
src/app/api/
├── auth/[...nextauth]/         # NextAuth endpoints
├── batches/                    # Batch CRUD operations
├── faculty/                    # Faculty management
├── students/                   # Student operations
├── subjects/                   # Subject management
├── timetable/                  # Timetable operations
│   ├── bulk-operations/        # Async bulk operations
│   ├── conflicts/              # Conflict detection
│   └── analytics/              # Timetable analytics
├── settings/                   # Configuration APIs
└── user/preferences/           # User preference storage
```

### Component Organization
```
src/components/
├── ui/                         # Base Shadcn components
├── auth/                       # Authentication components
├── batches/                    # Batch management
├── faculty/                    # Faculty interface
├── students/                   # Student management
├── subjects/                   # Subject operations
├── timetable/                  # Timetable interface
├── settings/                   # Configuration forms
└── providers/                  # React context providers
```

### Type Safety
- `src/types/index.ts` - Extended Prisma types with relations
- `src/types/auth.ts` - Authentication-specific types
- `src/types/timetable.ts` - Timetable and scheduling types
- `src/types/preferences.ts` - User preference types
- All API operations use properly typed Prisma client with full relation support

## Environment Configuration

**Required Environment Variables**:
```env
DATABASE_URL="file:./dev.db"                    # SQLite for dev, PostgreSQL for prod
NEXTAUTH_SECRET="your-secure-random-string"     # JWT signing secret
NEXTAUTH_URL="http://localhost:3000"            # Application URL
```

## Current Implementation Status

### ✅ Completed Features
1. **Core Infrastructure**: Authentication, database schema, dashboard
2. **Role-based Navigation**: Admin/Faculty/Student access controls  
3. **Student Management**: Advanced filtering, bulk operations, table management
4. **Faculty Management**: Workload tracking, subject allotment, preferences
5. **Batch Management**: Hierarchical organization, capacity tracking
6. **Timetable System**: Quick creation, conflict detection, multiple views, attendance indicators
7. **Attendance System**: Complete attendance tracking with status indicators and bulk operations
8. **Universal Search**: Natural language search across all entities
9. **Settings Management**: Configurable academic calendar, time slots, types
10. **User Preferences**: View mode persistence, customizable interfaces

### 🚧 In Progress / Next Steps
1. **Advanced Reporting**: Faculty workload reports, student analytics
2. **Bulk Operations**: Enhanced async operations with better progress tracking
3. **Mobile Optimization**: Enhanced responsive design for tablet/mobile usage
4. **Performance Optimization**: Database query optimization, caching strategies
5. **Attendance Analytics**: Comprehensive attendance reporting and insights

### 🔄 Recent Improvements
- **User Preferences API**: Fixed 500 error with proper error handling
- **Student Filtering**: Enhanced AND/OR logic with improved UX
- **Table Interactions**: Copy functionality with hover-based icons
- **Subject Management**: Bug fixes and improved modal layout
- **Universal Search**: Feature-complete search system implementation
- **Attendance Status Indicators**: Complete implementation with visual feedback system
- **Bulk Attendance Marking**: Comprehensive bulk action system for efficient attendance management

## ⚠️ CRITICAL: DO NOT REPEAT PAST MISTAKES

### 🚨 TIMETABLE VIEW COMPONENT ROUTING - READ THIS FIRST!
**NEVER FORGET**: The main timetable Week view uses `TraditionalTimetableView`, NOT `CalendarWeekView`!

**Component Routing Logic** (src/components/ui/full-calendar.tsx):
```typescript
// Line 287-310: Week view routing
{viewState.view === 'week' && (
  <TraditionalTimetableView     // ← THIS IS THE WEEK VIEW COMPONENT!
    date={viewState.currentDate}
    events={processedEvents}
    // ... other props
  />
)}
```

**DO NOT IMPLEMENT TIMETABLE FEATURES IN THE WRONG COMPONENT:**
- ❌ **CalendarWeekView** - This is NOT used for the main week view
- ✅ **TraditionalTimetableView** - This IS the actual week view component

### Timetable View Architecture
**Component mapping based on selected view mode**:
- **Week View** → `TraditionalTimetableView` (src/components/timetable/traditional-timetable-view.tsx)
- **Day View** → `CalendarDayView` 
- **Month View** → `CalendarMonthView`
- **Year View** → `CalendarYearView`
- **CalendarWeekView** → Used for different calendar-style week display (NOT the main week view)

### Attendance Status Implementation
**Location**: `src/components/timetable/traditional-timetable-view.tsx`
- **Attendance Data Fetching**: Uses `fetchAttendanceStatus()` utility function
- **Data Merging**: Uses `mergeAttendanceWithEvents()` to combine attendance status with timetable events
- **Visual Indicators**: Color-coded badges and heat map bars based on attendance percentage
- **API Endpoint**: `/api/timetable/attendance-status` for bulk attendance status retrieval
- **Status Types**: `isMarked`, `attendancePercentage`, `totalStudents`, `presentStudents`

### Bulk Attendance Operations
**Location**: `src/components/attendance/session-attendance-table.tsx`
- **Mark All Actions**: `handleMarkAllStudents()` - marks all filtered students
- **Selective Bulk Actions**: `handleBulkMarkAttendance()` - marks only selected students
- **Selection Management**: Individual checkboxes with select all/none functionality
- **Loading States**: `isBulkMarking` state prevents concurrent operations

## Development Guidelines

### Code Patterns
- **Server Components**: Use for data fetching and initial page loads
- **Client Components**: Mark with "use client" for interactivity
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Loading States**: Skeleton components and loading indicators
- **Form Validation**: Zod schemas with React Hook Form integration

### Database Patterns
- **Transactions**: Use for multi-table operations
- **Soft Deletes**: Implement via status fields rather than hard deletes
- **Audit Trails**: Track created/updated timestamps and user actions
- **Optimistic Updates**: Client-side updates with server reconciliation

### Authentication Patterns
- **Session Management**: JWT tokens with 24-hour expiry
- **Role Checks**: Server-side validation on all protected routes
- **Middleware Protection**: Route-level authentication enforcement
- **Permission Granularity**: Feature-level access control

## Git Workflow
- **Commit Only**: Do not push unless explicitly requested
- **Feature Commits**: Commit completed features with descriptive messages
- **Bug Fix Commits**: Separate commits for bug fixes with clear descriptions
- **Testing**: Ensure all functionality works before committing