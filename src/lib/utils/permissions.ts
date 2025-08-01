import type { Role } from "@/lib/auth"
import type { AuthUser } from "@/types/auth"

export function hasRole(user: AuthUser | null, role: Role): boolean {
  return user?.role === role
}

export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, "ADMIN")
}

export function isFaculty(user: AuthUser | null): boolean {
  return hasRole(user, "FACULTY")
}

export function isStudent(user: AuthUser | null): boolean {
  return hasRole(user, "STUDENT")
}

export function canManageSystem(user: AuthUser | null): boolean {
  return isAdmin(user)
}

export function canManageBatch(user: AuthUser | null): boolean {
  return isAdmin(user) || isFaculty(user)
}

export function canMarkAttendance(user: AuthUser | null): boolean {
  return isAdmin(user) || isFaculty(user)
}

export function canViewAttendance(user: AuthUser | null, studentId?: string): boolean {
  if (isAdmin(user) || isFaculty(user)) return true
  if (isStudent(user) && user && user.student && studentId) {
    return user.student.id === studentId
  }
  return false
}

export function canEditSubject(user: AuthUser | null, subjectFacultyId?: string): boolean {
  if (isAdmin(user)) return true
  if (isFaculty(user) && user && subjectFacultyId) {
    return user.id === subjectFacultyId
  }
  return false
}

// Granular create permissions
export function canCreateStudent(user: AuthUser | null): boolean {
  return isAdmin(user)
}

export function canCreateSubject(user: AuthUser | null): boolean {
  return isAdmin(user)
}

export function canCreateBatch(user: AuthUser | null): boolean {
  return isAdmin(user)
}

export function canCreateTimetableEntry(user: AuthUser | null): boolean {
  return isAdmin(user) || isFaculty(user)
}