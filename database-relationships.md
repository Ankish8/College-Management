# JLU College Management System - Database Relationships Diagram

## Core Entity Relationships

```
University (JLU)
    │
    └── Department (Design)
            │
            ├── Users (Faculty/Admin)
            │   │
            │   ├── Student (extends User)
            │   │   │
            │   │   └── AttendanceRecord
            │   │       │
            │   │       └── AttendanceDispute
            │   │
            │   └── Faculty → Subject (Primary/Co-Faculty)
            │
            ├── Programs (B.Des, M.Des)
            │   │
            │   ├── Specializations (UX, GD)
            │   │   │
            │   │   └── Batch
            │   │       │
            │   │       ├── Students (Many)
            │   │       ├── Subjects (Many)
            │   │       ├── TimetableEntry
            │   │       └── AttendanceSession
            │   │
            │   └── Batch
            │       │
            │       └── Subject
            │           │
            │           ├── AttendanceSession
            │           └── TimetableEntry
            │
            └── DepartmentSettings
```

## Detailed Relationship Mapping

### 1. **University → Department → Programs**
```
University (1)
    ├── Department (Many)
        ├── Programs (Many)
        │   ├── Specializations (Many) [Optional]
        │   └── Batches (Many)
        │       ├── Students (Many)
        │       └── Subjects (Many)
        │
        ├── Users (Many)
        │   ├── Faculty → Subjects (Primary/Co)
        │   └── Students → Batches
        │
        └── DepartmentSettings (1)
```

### 2. **Academic Hierarchy**
```
Program (B.Des/M.Des)
    │
    ├── Specialization (UX/GD) [Optional]
    │
    └── Batch (Semester + Year)
        │
        ├── Students (Many-to-One)
        │   └── User (One-to-One)
        │
        └── Subjects (One-to-Many)
            │
            ├── Primary Faculty (Many-to-One)
            ├── Co-Faculty (Many-to-One) [Optional]
            │
            └── Attendance Sessions
                └── Attendance Records → Students
```

### 3. **Timetable Relationships**
```
TimetableEntry
    ├── Batch (Many-to-One)
    ├── Subject (Many-to-One)
    ├── Faculty (Many-to-One)
    ├── TimeSlot (Many-to-One)
    ├── Day of Week
    └── Date [Optional]
```

### 4. **Attendance System**
```
AttendanceSession
    ├── Batch (Many-to-One)
    ├── Subject (Many-to-One)
    └── Date
        │
        └── AttendanceRecord
            ├── Student (Many-to-One)
            ├── Status (Present/Absent/Late/Excused)
            └── AttendanceDispute [Optional]
                ├── Requested Status
                ├── Dispute Status
                └── Resolution
```

## Foreign Key Relationships

| Child Table | Parent Table | Relationship Type | Cascade |
|-------------|--------------|-------------------|---------|
| Department | University | Many-to-One | CASCADE |
| Program | Department | Many-to-One | CASCADE |
| Specialization | Program | Many-to-One | CASCADE |
| Batch | Program | Many-to-One | CASCADE |
| Batch | Specialization | Many-to-One | SET NULL |
| User | Department | Many-to-One | SET NULL |
| Student | User | One-to-One | CASCADE |
| Student | Batch | Many-to-One | CASCADE |
| Subject | Batch | Many-to-One | CASCADE |
| Subject | User (Primary) | Many-to-One | SET NULL |
| Subject | User (Co) | Many-to-One | SET NULL |
| TimetableEntry | Batch | Many-to-One | CASCADE |
| TimetableEntry | Subject | Many-to-One | CASCADE |
| TimetableEntry | User (Faculty) | Many-to-One | CASCADE |
| TimetableEntry | TimeSlot | Many-to-One | CASCADE |
| AttendanceSession | Batch | Many-to-One | CASCADE |
| AttendanceSession | Subject | Many-to-One | CASCADE |
| AttendanceRecord | AttendanceSession | Many-to-One | CASCADE |
| AttendanceRecord | Student | Many-to-One | CASCADE |
| AttendanceDispute | AttendanceRecord | Many-to-One | CASCADE |
| AttendanceDispute | Student | Many-to-One | CASCADE |

## Business Rules and Constraints

### 1. **Unique Constraints**
- `User.email` - Unique across system
- `User.employeeId` - Unique for faculty
- `Student.studentId` - Unique university ID
- `Student.rollNumber` - Unique roll number
- `Subject.code` - Unique subject code
- `Batch` - Unique combination of (programId, specializationId, semester, startYear)
- `TimetableEntry` - Unique combination of (batchId, timeSlotId, dayOfWeek, date)
- `AttendanceSession` - Unique combination of (batchId, subjectId, date)
- `AttendanceRecord` - Unique combination of (sessionId, studentId)

### 2. **Validation Rules**
- Faculty cannot be assigned as both primary and co-faculty for same subject
- Faculty workload cannot exceed 30 credits
- Specialization must belong to the same program as batch
- Students inherit department from their batch's program
- Attendance records can only be created for students in the subject's batch

### 3. **Calculated Fields**
- `Batch.currentStrength` - Count of active students
- Faculty total credits - Sum of primary + co-faculty subjects
- Student attendance percentage - Present records / Total records
- Subject hours - Credits × Department credit ratio (default 15)

## Indexes for Performance

### Recommended Indexes
```sql
-- For frequent queries
CREATE INDEX idx_batch_program_semester ON batches(programId, semester);
CREATE INDEX idx_student_batch ON students(batchId);
CREATE INDEX idx_subject_batch_faculty ON subjects(batchId, primaryFacultyId);
CREATE INDEX idx_attendance_session_batch_date ON attendance_sessions(batchId, date);
CREATE INDEX idx_attendance_record_student ON attendance_records(studentId);
CREATE INDEX idx_timetable_batch_day ON timetable_entries(batchId, dayOfWeek);
```

## Data Flow Examples

### 1. **Student Enrollment Flow**
```
1. Create User (role: STUDENT) → User table
2. Create Student record → Student table
3. Assign to Batch → Student.batchId
4. Auto-inherit Department from Batch.Program.Department
5. Update Batch.currentStrength (+1)
```

### 2. **Subject Assignment Flow**
```
1. Create Subject → Subject table
2. Assign to Batch → Subject.batchId
3. Assign Primary Faculty → Subject.primaryFacultyId
4. Validate Faculty workload < 30 credits
5. Optional: Assign Co-Faculty → Subject.coFacultyId
```

### 3. **Attendance Marking Flow**
```
1. Create AttendanceSession → For specific Batch + Subject + Date
2. Create AttendanceRecord for each Student in Batch
3. Faculty marks attendance → Update AttendanceRecord.status
4. Students can dispute → Create AttendanceDispute
```

This relationship structure ensures data integrity while maintaining flexibility for the college management system's complex academic requirements.