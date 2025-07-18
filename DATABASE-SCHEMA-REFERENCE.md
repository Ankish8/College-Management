# Database Schema Reference - JLU Attendance System

This document provides a complete reference for the database schema and data seeding requirements for the JLU Attendance Management System.

## Table of Contents
1. [Database Schema Overview](#database-schema-overview)
2. [Core Tables](#core-tables)
3. [Complete Table Schemas](#complete-table-schemas)
4. [Data Seeding Requirements](#data-seeding-requirements)
5. [Authentication System](#authentication-system)
6. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

## Database Schema Overview

The system uses SQLite for development with Prisma ORM. The schema follows a hierarchical structure:

```
University → Department → Program → Batch → Students/Subjects
                      ↓
                    Users (Admin/Faculty/Student)
                      ↓
                TimeSlots → TimetableEntries
```

## Core Tables

### Essential Tables (Must Create First)
1. **universities** - Root level
2. **departments** - Links to university
3. **programs** - Links to department
4. **batches** - Links to program
5. **users** - Links to department
6. **students** - Links to user and batch
7. **subjects** - Links to batch and faculty
8. **time_slots** - Independent
9. **timetable_entries** - Links everything together

### Supporting Tables (Create After Core)
1. **department_settings** - Links to department
2. **subject_allotment_drafts** - Links to department and user
3. **timetable_templates** - Links to batch, subject, faculty, timeslot
4. **academic_calendars** - Links to department
5. **holidays** - Links to department and calendar
6. **exam_periods** - Links to academic calendar

## Complete Table Schemas

### 1. Universities Table
```sql
CREATE TABLE "universities" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Departments Table
```sql
CREATE TABLE "departments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "universityId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "departments_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 3. Programs Table
```sql
CREATE TABLE "programs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "totalSems" INTEGER NOT NULL,
  "programType" TEXT NOT NULL DEFAULT 'UNDERGRADUATE',
  "departmentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 4. Batches Table
```sql
CREATE TABLE "batches" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "specializationId" TEXT,
  "semester" INTEGER NOT NULL,
  "startYear" INTEGER NOT NULL,
  "endYear" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "semType" TEXT NOT NULL DEFAULT 'ODD',
  "maxCapacity" INTEGER,
  "currentStrength" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batches_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 5. Users Table
```sql
CREATE TABLE "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "phone" TEXT,
  "employeeId" TEXT UNIQUE,
  "role" TEXT NOT NULL DEFAULT 'STUDENT',
  "departmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
```

### 6. Students Table
```sql
CREATE TABLE "students" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "studentId" TEXT NOT NULL UNIQUE,
  "rollNumber" TEXT NOT NULL UNIQUE,
  "batchId" TEXT NOT NULL,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "address" TEXT,
  "dateOfBirth" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "students_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 7. Subjects Table
```sql
CREATE TABLE "subjects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "totalHours" INTEGER NOT NULL,
  "batchId" TEXT NOT NULL,
  "primaryFacultyId" TEXT,
  "coFacultyId" TEXT,
  "examType" TEXT NOT NULL DEFAULT 'THEORY',
  "subjectType" TEXT NOT NULL DEFAULT 'CORE',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subjects_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subjects_primaryFacultyId_fkey" FOREIGN KEY ("primaryFacultyId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "subjects_coFacultyId_fkey" FOREIGN KEY ("coFacultyId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
```

### 8. Time Slots Table
```sql
CREATE TABLE "time_slots" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 9. Timetable Entries Table
```sql
CREATE TABLE "timetable_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "batchId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "facultyId" TEXT NOT NULL,
  "timeSlotId" TEXT NOT NULL,
  "dayOfWeek" TEXT NOT NULL,
  "date" DATETIME,
  "entryType" TEXT NOT NULL DEFAULT 'REGULAR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timetable_entries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "timetable_entries_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "timetable_entries_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "time_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 10. Department Settings Table
```sql
CREATE TABLE "department_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "departmentId" TEXT NOT NULL UNIQUE,
  "creditHoursRatio" INTEGER NOT NULL DEFAULT 15,
  "maxFacultyCredits" INTEGER NOT NULL DEFAULT 20,
  "coFacultyWeight" REAL NOT NULL DEFAULT 0.5,
  "defaultExamTypes" TEXT,
  "defaultSubjectTypes" TEXT,
  "customExamTypes" TEXT,
  "customSubjectTypes" TEXT,
  "schedulingMode" TEXT NOT NULL DEFAULT 'MODULE_BASED',
  "displaySettings" TEXT,
  "defaultTimeSlots" TEXT,
  "breakConfiguration" TEXT,
  "moduledurations" TEXT,
  "classTypes" TEXT,
  "conflictRules" TEXT,
  "autoCreateAttendance" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "department_settings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 11. Academic Calendars Table
```sql
CREATE TABLE "academic_calendars" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "departmentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academic_calendars_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 12. Holidays Table
```sql
CREATE TABLE "holidays" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'UNIVERSITY',
  "departmentId" TEXT,
  "academicCalendarId" TEXT,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "holidays_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "holidays_academicCalendarId_fkey" FOREIGN KEY ("academicCalendarId") REFERENCES "academic_calendars" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 13. Exam Periods Table
```sql
CREATE TABLE "exam_periods" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "academicCalendarId" TEXT NOT NULL,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "examType" TEXT NOT NULL DEFAULT 'INTERNAL',
  "blockRegularClasses" BOOLEAN NOT NULL DEFAULT true,
  "allowReviewClasses" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_periods_academicCalendarId_fkey" FOREIGN KEY ("academicCalendarId") REFERENCES "academic_calendars" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

## Data Seeding Requirements

### 1. Basic Structure
```javascript
// University
const university = {
  name: 'Jagran Lakecity University',
  shortName: 'JLU'
};

// Department
const department = {
  name: 'School of Design',
  shortName: 'DESIGN',
  universityId: university.id
};

// Program
const program = {
  name: 'Bachelor of Design',
  shortName: 'B.Des',
  duration: 4,
  totalSems: 8,
  departmentId: department.id,
  isActive: true
};
```

### 2. Batches Configuration
```javascript
const batches = [
  {
    name: 'B.Des Semester 3',
    semester: 3,
    startYear: 2024,
    endYear: 2025,
    programId: program.id,
    isActive: true
  },
  {
    name: 'B.Des Semester 5',
    semester: 5,
    startYear: 2024,
    endYear: 2025,
    programId: program.id,
    isActive: true
  },
  {
    name: 'B.Des Semester 7',
    semester: 7,
    startYear: 2024,
    endYear: 2025,
    programId: program.id,
    isActive: true
  }
];
```

### 3. Faculty Data
```javascript
const facultyData = [
  { name: 'Dr. Priya Sharma', email: 'priya.sharma@jlu.edu.in', empId: 'FAC001' },
  { name: 'Prof. Rajesh Kumar', email: 'rajesh.kumar@jlu.edu.in', empId: 'FAC002' },
  { name: 'Dr. Neha Gupta', email: 'neha.gupta@jlu.edu.in', empId: 'FAC003' },
  { name: 'Prof. Amit Verma', email: 'amit.verma@jlu.edu.in', empId: 'FAC004' },
  { name: 'Dr. Kavita Jain', email: 'kavita.jain@jlu.edu.in', empId: 'FAC005' }
];

// Faculty User Creation
const faculty = {
  name: facultyInfo.name,
  email: facultyInfo.email,
  role: 'FACULTY',
  employeeId: facultyInfo.empId,
  departmentId: department.id,
  status: 'ACTIVE'
};
```

### 4. Student Data Pattern
```javascript
// Student User Creation
const studentUser = {
  name: studentName,
  email: `${studentName.toLowerCase().replace(/\s+/g, '.')}.${counter}@jlu.edu.in`,
  role: 'STUDENT',
  departmentId: department.id,
  status: 'ACTIVE'
};

// Student Record Creation
const student = {
  userId: studentUser.id,
  studentId: generateStudentId(batch.semester, index),
  rollNumber: generateRollNumber(batch.semester, index),
  batchId: batch.id
};
```

### 5. Subject Data by Semester
```javascript
const subjectsBySemester = {
  3: [
    { name: 'Design Thinking', code: 'DT301', credits: 4, hours: 60, type: 'CORE', exam: 'THEORY' },
    { name: 'Typography', code: 'TY302', credits: 4, hours: 60, type: 'CORE', exam: 'PRACTICAL' },
    { name: 'Digital Design', code: 'DD303', credits: 4, hours: 60, type: 'CORE', exam: 'PRACTICAL' },
    { name: 'Brand Identity', code: 'BI304', credits: 4, hours: 60, type: 'CORE', exam: 'PROJECT' },
    { name: 'User Experience', code: 'UX305', credits: 4, hours: 60, type: 'CORE', exam: 'PRACTICAL' },
    { name: 'Design History', code: 'DH306', credits: 2, hours: 30, type: 'ELECTIVE', exam: 'THEORY' }
  ],
  5: [
    { name: 'Advanced Typography', code: 'AT501', credits: 4, hours: 60, type: 'CORE', exam: 'PRACTICAL' },
    { name: 'Packaging Design', code: 'PD502', credits: 4, hours: 60, type: 'CORE', exam: 'PROJECT' },
    { name: 'Motion Graphics', code: 'MG503', credits: 4, hours: 60, type: 'CORE', exam: 'PRACTICAL' },
    { name: 'Portfolio Development', code: 'PF504', credits: 4, hours: 60, type: 'CORE', exam: 'PROJECT' },
    { name: 'Design Research', code: 'DR505', credits: 2, hours: 30, type: 'ELECTIVE', exam: 'THEORY' },
    { name: 'Professional Practice', code: 'PP506', credits: 2, hours: 30, type: 'ELECTIVE', exam: 'VIVA' },
    { name: 'Internship', code: 'IN507', credits: 6, hours: 90, type: 'CORE', exam: 'VIVA' }
  ],
  7: [
    { name: 'Thesis Project', code: 'TP701', credits: 8, hours: 120, type: 'CORE', exam: 'PROJECT' },
    { name: 'Design Management', code: 'DM702', credits: 4, hours: 60, type: 'CORE', exam: 'THEORY' },
    { name: 'Entrepreneurship', code: 'EN703', credits: 4, hours: 60, type: 'CORE', exam: 'THEORY' },
    { name: 'Advanced Portfolio', code: 'AP704', credits: 4, hours: 60, type: 'CORE', exam: 'PROJECT' },
    { name: 'Industry Collaboration', code: 'IC705', credits: 4, hours: 60, type: 'ELECTIVE', exam: 'PROJECT' },
    { name: 'Design Ethics', code: 'DE706', credits: 2, hours: 30, type: 'ELECTIVE', exam: 'THEORY' }
  ]
};
```

### 6. Time Slots Configuration
```javascript
const timeSlots = [
  { name: '09:15-10:05', startTime: '09:15', endTime: '10:05', duration: 50 },
  { name: '10:05-10:55', startTime: '10:05', endTime: '10:55', duration: 50 },
  { name: '11:15-12:05', startTime: '11:15', endTime: '12:05', duration: 50 },
  { name: '12:05-12:55', startTime: '12:05', endTime: '12:55', duration: 50 },
  { name: '13:45-14:35', startTime: '13:45', endTime: '14:35', duration: 50 },
  { name: '14:35-15:25', startTime: '14:35', endTime: '15:25', duration: 50 },
  { name: '15:25-16:15', startTime: '15:25', endTime: '16:15', duration: 50 },
  { name: '16:15-17:05', startTime: '16:15', endTime: '17:05', duration: 50 }
];
```

### 7. Timetable Entry Structure
```javascript
const timetableEntry = {
  batchId: batch.id,
  subjectId: subject.id,
  facultyId: subject.primaryFacultyId,
  timeSlotId: timeSlot.id,
  dayOfWeek: 'MONDAY', // 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'
  entryType: 'REGULAR',
  isActive: true
};
```

## Authentication System

### No Password Storage
- **Important**: The User model does NOT have a password field
- Authentication uses hardcoded passwords in `/src/lib/auth.ts`
- Admin login: `admin@jlu.edu.in` / `admin123`
- Faculty login: `[any faculty email]` / `password123`

### User Roles
- `ADMIN`: Full system access
- `FACULTY`: Teaching and attendance management
- `STUDENT`: View-only access to their data

## Common Pitfalls & Solutions

### 1. Time Slot Names
❌ **Wrong**: `name: 'Period 1'`
✅ **Correct**: `name: '09:15-10:05'`

*The timetable client expects time slot names in "HH:MM-HH:MM" format for parsing*

### 2. User-Student Relationship
❌ **Wrong**: Creating student directly with personal info
✅ **Correct**: Create user first, then student with userId reference

### 3. Foreign Key Dependencies
❌ **Wrong**: Creating child records before parent records
✅ **Correct**: Always create in order: University → Department → Program → Batch → Users → Students/Subjects

### 4. Email Uniqueness
❌ **Wrong**: Using just generateEmail(name) - causes duplicates
✅ **Correct**: Add counter to ensure uniqueness: `name.${counter}@jlu.edu.in`

### 5. Required Fields
Always include these fields when creating records:
- `isActive: true` for most entities
- `duration` field for time slots
- `sortOrder` for time slots
- `status: 'ACTIVE'` for users

### 6. Table Creation Order
Create tables in this exact order to avoid foreign key errors:
1. universities
2. departments
3. programs
4. batches
5. users
6. students
7. subjects
8. time_slots
9. timetable_entries
10. department_settings
11. academic_calendars
12. holidays
13. exam_periods

## Test Data Quantities
- **Batches**: 3 (Semester 3, 5, 7)
- **Students**: 20-30 per batch (total ~75)
- **Faculty**: 5 members
- **Subjects**: 6-7 per batch (total ~19)
- **Time Slots**: 8 periods
- **Admin**: 1 user

## Final Notes
- Always run `npx prisma generate` after schema changes
- Use `npm run db:seed:comprehensive` to run the complete seed script
- All tables use `cuid()` for primary keys
- Timestamps are automatically managed by Prisma
- SQLite is used for development, easily switchable to PostgreSQL for production

This reference should prevent all common mistakes and provide a solid foundation for database operations.