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
  Role,
  UserStatus,
  ProgramType,
  SemType,
  ExamType,
  SubjectType,
  DayOfWeek,
  EntryType,
  AttendanceStatus,
  DisputeStatus,
} from "@prisma/client"

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

// Export all Prisma types
export type {
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
  Role,
  UserStatus,
  ProgramType,
  SemType,
  ExamType,
  SubjectType,
  DayOfWeek,
  EntryType,
  AttendanceStatus,
  DisputeStatus,
}