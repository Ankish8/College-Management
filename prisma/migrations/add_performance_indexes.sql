-- Performance optimization indexes for College Management System
-- These indexes will dramatically improve query performance

-- Attendance-related indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_attendance_record_student_status ON attendance_records(studentId, status);
CREATE INDEX IF NOT EXISTS idx_attendance_record_session ON attendance_records(sessionId);
CREATE INDEX IF NOT EXISTS idx_attendance_session_batch_subject ON attendance_sessions(batchId, subjectId);
CREATE INDEX IF NOT EXISTS idx_attendance_session_date ON attendance_sessions(date);

-- Timetable-related indexes (heavily used for conflict detection)
CREATE INDEX IF NOT EXISTS idx_timetable_entry_batch_timeslot ON timetable_entries(batchId, timeSlotId, dayOfWeek);
CREATE INDEX IF NOT EXISTS idx_timetable_entry_faculty_time ON timetable_entries(facultyId, timeSlotId, dayOfWeek);
CREATE INDEX IF NOT EXISTS idx_timetable_entry_subject ON timetable_entries(subjectId);
CREATE INDEX IF NOT EXISTS idx_timetable_entry_date ON timetable_entries(date);
CREATE INDEX IF NOT EXISTS idx_timetable_entry_active ON timetable_entries(isActive);

-- Student-related indexes
CREATE INDEX IF NOT EXISTS idx_student_batch ON students(batchId);
CREATE INDEX IF NOT EXISTS idx_student_user ON students(userId);

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_user_department ON users(departmentId);
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_status ON users(status);

-- Subject-related indexes
CREATE INDEX IF NOT EXISTS idx_subject_batch ON subjects(batchId);
CREATE INDEX IF NOT EXISTS idx_subject_faculty ON subjects(primaryFacultyId);
CREATE INDEX IF NOT EXISTS idx_subject_co_faculty ON subjects(coFacultyId);
CREATE INDEX IF NOT EXISTS idx_subject_active ON subjects(isActive);

-- Batch-related indexes
CREATE INDEX IF NOT EXISTS idx_batch_program ON batches(programId);
CREATE INDEX IF NOT EXISTS idx_batch_specialization ON batches(specializationId);
CREATE INDEX IF NOT EXISTS idx_batch_active ON batches(isActive);

-- Program-related indexes  
CREATE INDEX IF NOT EXISTS idx_program_department ON programs(departmentId);
CREATE INDEX IF NOT EXISTS idx_program_active ON programs(isActive);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_timetable_batch_date_active ON timetable_entries(batchId, date, isActive);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(studentId, createdAt);
CREATE INDEX IF NOT EXISTS idx_user_dept_role ON users(departmentId, role);

-- Full-text search indexes for names
CREATE INDEX IF NOT EXISTS idx_user_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_subject_name ON subjects(name);
CREATE INDEX IF NOT EXISTS idx_subject_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_batch_name ON batches(name);