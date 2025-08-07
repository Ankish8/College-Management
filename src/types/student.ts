export interface Student {
  id: string
  studentId: string
  rollNumber: string
  guardianName?: string | null
  guardianPhone?: string | null
  address?: string | null
  dateOfBirth?: Date | string | null
  attendancePercentage: number
  totalAttendanceRecords: number
  user: {
    id: string
    name: string
    email: string
    phone?: string | null
    status: string
    createdAt: string
  }
  batch: {
    id: string
    name: string
    semester: number
    startYear: number
    endYear: number
    isActive: boolean
    program: {
      name: string
      shortName: string
    }
    specialization?: {
      name: string
      shortName: string
    } | null
  }
}