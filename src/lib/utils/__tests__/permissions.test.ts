import {
  hasRole,
  isAdmin,
  isFaculty,
  isStudent,
  canManageSystem,
  canManageBatch,
  canMarkAttendance,
  canViewAttendance,
  canEditSubject
} from '../permissions'
import type { AuthUser } from '@/types/auth'
import type { Role } from '@prisma/client'

describe('Permission System Tests', () => {
  // Test data
  const adminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@jlu.edu.in',
    name: 'Admin User',
    role: 'ADMIN' as Role,
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    }
  }

  const facultyUser: AuthUser = {
    id: 'faculty-1',
    email: 'faculty@jlu.edu.in',
    name: 'Faculty User',
    role: 'FACULTY' as Role,
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    }
  }

  const studentUser: AuthUser = {
    id: 'student-1',
    email: 'student@jlu.edu.in',
    name: 'Student User',
    role: 'STUDENT' as Role,
    department: {
      id: 'dept-1',
      name: 'Design Department',
      shortName: 'DESIGN'
    },
    student: {
      id: 'stud-1',
      studentId: 'JLU2024001',
      rollNumber: '24001',
      batchId: 'batch-1'
    }
  }

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      expect(hasRole(adminUser, 'ADMIN')).toBe(true)
      expect(hasRole(facultyUser, 'FACULTY')).toBe(true)
      expect(hasRole(studentUser, 'STUDENT')).toBe(true)
    })

    it('should return false when user does not have the specified role', () => {
      expect(hasRole(adminUser, 'STUDENT')).toBe(false)
      expect(hasRole(facultyUser, 'ADMIN')).toBe(false)
      expect(hasRole(studentUser, 'FACULTY')).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(hasRole(null, 'ADMIN')).toBe(false)
      expect(hasRole(null, 'FACULTY')).toBe(false)
      expect(hasRole(null, 'STUDENT')).toBe(false)
    })
  })

  describe('Role-specific functions', () => {
    describe('isAdmin', () => {
      it('should return true for admin users', () => {
        expect(isAdmin(adminUser)).toBe(true)
      })

      it('should return false for non-admin users', () => {
        expect(isAdmin(facultyUser)).toBe(false)
        expect(isAdmin(studentUser)).toBe(false)
        expect(isAdmin(null)).toBe(false)
      })
    })

    describe('isFaculty', () => {
      it('should return true for faculty users', () => {
        expect(isFaculty(facultyUser)).toBe(true)
      })

      it('should return false for non-faculty users', () => {
        expect(isFaculty(adminUser)).toBe(false)
        expect(isFaculty(studentUser)).toBe(false)
        expect(isFaculty(null)).toBe(false)
      })
    })

    describe('isStudent', () => {
      it('should return true for student users', () => {
        expect(isStudent(studentUser)).toBe(true)
      })

      it('should return false for non-student users', () => {
        expect(isStudent(adminUser)).toBe(false)
        expect(isStudent(facultyUser)).toBe(false)
        expect(isStudent(null)).toBe(false)
      })
    })
  })

  describe('Permission functions', () => {
    describe('canManageSystem', () => {
      it('should allow admin users to manage system', () => {
        expect(canManageSystem(adminUser)).toBe(true)
      })

      it('should not allow non-admin users to manage system', () => {
        expect(canManageSystem(facultyUser)).toBe(false)
        expect(canManageSystem(studentUser)).toBe(false)
        expect(canManageSystem(null)).toBe(false)
      })
    })

    describe('canManageBatch', () => {
      it('should allow admin and faculty to manage batches', () => {
        expect(canManageBatch(adminUser)).toBe(true)
        expect(canManageBatch(facultyUser)).toBe(true)
      })

      it('should not allow students to manage batches', () => {
        expect(canManageBatch(studentUser)).toBe(false)
        expect(canManageBatch(null)).toBe(false)
      })
    })

    describe('canMarkAttendance', () => {
      it('should allow admin and faculty to mark attendance', () => {
        expect(canMarkAttendance(adminUser)).toBe(true)
        expect(canMarkAttendance(facultyUser)).toBe(true)
      })

      it('should not allow students to mark attendance', () => {
        expect(canMarkAttendance(studentUser)).toBe(false)
        expect(canMarkAttendance(null)).toBe(false)
      })
    })

    describe('canViewAttendance', () => {
      it('should allow admin and faculty to view any attendance', () => {
        expect(canViewAttendance(adminUser)).toBe(true)
        expect(canViewAttendance(facultyUser)).toBe(true)
        expect(canViewAttendance(adminUser, 'any-student-id')).toBe(true)
        expect(canViewAttendance(facultyUser, 'any-student-id')).toBe(true)
      })

      it('should allow students to view their own attendance', () => {
        expect(canViewAttendance(studentUser, 'stud-1')).toBe(true)
      })

      it('should not allow students to view other students\' attendance', () => {
        expect(canViewAttendance(studentUser, 'other-student-id')).toBe(false)
      })

      it('should not allow access without user or invalid student ID', () => {
        expect(canViewAttendance(null)).toBe(false)
        expect(canViewAttendance(studentUser)).toBe(false)
        
        // Student without student data
        const incompleteStudent = { ...studentUser, student: undefined }
        expect(canViewAttendance(incompleteStudent, 'stud-1')).toBe(false)
      })
    })

    describe('canEditSubject', () => {
      it('should allow admin to edit any subject', () => {
        expect(canEditSubject(adminUser)).toBe(true)
        expect(canEditSubject(adminUser, 'any-faculty-id')).toBe(true)
      })

      it('should allow faculty to edit their own subjects', () => {
        expect(canEditSubject(facultyUser, 'faculty-1')).toBe(true)
      })

      it('should not allow faculty to edit other faculty subjects', () => {
        expect(canEditSubject(facultyUser, 'other-faculty-id')).toBe(false)
      })

      it('should not allow students to edit subjects', () => {
        expect(canEditSubject(studentUser)).toBe(false)
        expect(canEditSubject(studentUser, 'faculty-1')).toBe(false)
      })

      it('should not allow access without user', () => {
        expect(canEditSubject(null)).toBe(false)
        expect(canEditSubject(null, 'faculty-1')).toBe(false)
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle undefined user gracefully', () => {
      expect(hasRole(undefined as any, 'ADMIN')).toBe(false)
      expect(isAdmin(undefined as any)).toBe(false)
      expect(canManageSystem(undefined as any)).toBe(false)
    })

    it('should handle user without role', () => {
      const userWithoutRole = { ...adminUser, role: undefined as any }
      expect(hasRole(userWithoutRole, 'ADMIN')).toBe(false)
      expect(isAdmin(userWithoutRole)).toBe(false)
    })

    it('should handle empty strings and special values', () => {
      expect(canViewAttendance(studentUser, '')).toBe(false)
      expect(canEditSubject(facultyUser, '')).toBe(false)
    })
  })
})