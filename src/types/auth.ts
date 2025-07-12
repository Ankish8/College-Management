import type { Role, UserStatus } from "@prisma/client"

export interface User {
  id: string
  email: string
  name?: string | null
  phone?: string | null
  employeeId?: string | null
  role: Role
  departmentId?: string | null
  status: UserStatus
}

export interface Session {
  user: User
  expires: string
}

export interface AuthUser extends User {
  department?: {
    id: string
    name: string
    shortName: string
  }
  student?: {
    id: string
    studentId: string
    rollNumber: string
    batchId: string
  }
}