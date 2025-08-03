import type {
  University,
  Department,
  Program,
  Batch,
  Student,
  TimeSlot,
  Subject,
  TimetableEntry,
  AttendanceSession,
  AttendanceRecord,
  AttendanceDispute,
  User,
} from "@prisma/client"

import type { Role, UserStatus } from "@/lib/auth"

// Define missing enum types that should exist in Prisma but don't
export type ProgramType = 'UNDERGRADUATE' | 'POSTGRADUATE' | 'DIPLOMA' | 'CERTIFICATE'
export type SemType = 'ODD' | 'EVEN'
export type ExamType = 'THEORY' | 'PRACTICAL' | 'JURY' | 'PROJECT' | 'VIVA'
export type SubjectType = 'CORE' | 'ELECTIVE' | 'OPEN_ELECTIVE' | 'SKILL_ENHANCEMENT'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
export type EntryType = 'REGULAR' | 'MAKEUP' | 'EXTRA' | 'EXAM'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
export type DisputeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW'

// Extended types with relations
export interface BatchWithRelations extends Batch {
  program: Program
  students: StudentWithUser[]
  subjects: SubjectWithFaculty[]
  _count: {
    students: number
    subjects: number
  }
}

export interface StudentWithUser extends Student {
  user: User
  batch: Batch
}

export interface SubjectWithFaculty extends Subject {
  batch: Batch
  primaryFaculty?: User
  coFaculty?: User
}

export interface FacultyWithSubjects extends User {
  primarySubjects: Subject[]
  coFacultySubjects: Subject[]
}

export interface TimetableEntryWithRelations extends TimetableEntry {
  batch: Batch
  subject: Subject
  faculty: User
  timeSlot: TimeSlot
}

export interface AttendanceSessionWithRelations extends AttendanceSession {
  batch: Batch
  subject: Subject
  attendanceRecords: AttendanceRecordWithStudent[]
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student: StudentWithUser
}

// Form types
export interface CreateBatchForm {
  name: string
  programId: string
  semester: number
  startYear: number
  endYear: number
  semType: SemType
}

export interface CreateSubjectForm {
  name: string
  code: string
  credits: number
  batchId: string
  primaryFacultyId?: string
  coFacultyId?: string
  examType: ExamType
  subjectType: SubjectType
  description?: string
}

export interface CreateStudentForm {
  email: string
  name: string
  phone?: string
  studentId: string
  rollNumber: string
  batchId: string
  guardianName?: string
  guardianPhone?: string
  address?: string
  dateOfBirth?: Date
}

export interface CreateFacultyForm {
  name: string
  email: string
  employeeId: string
  phone?: string
  status: UserStatus
}

export interface CreateTimeSlotForm {
  name: string
  startTime: string
  endTime: string
  duration: number
  sortOrder: number
}

export interface CreateTimetableEntryForm {
  batchId: string
  subjectId: string
  facultyId: string
  timeSlotId: string
  dayOfWeek: DayOfWeek
  date?: Date
  entryType: EntryType
  notes?: string
}

// Dashboard types
export interface DashboardStats {
  totalStudents: number
  totalBatches: number
  totalSubjects: number
  todayAttendancePercentage: number
  totalFaculty: number
}

export interface TodaySchedule {
  timeSlot: TimeSlot
  timetableEntry?: TimetableEntryWithRelations
}

export interface AttendanceStats {
  present: number
  absent: number
  late: number
  excused: number
  total: number
  percentage: number
}

// All types are exported via their individual declarations above