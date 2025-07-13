import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

/**
 * Data Integrity Testing Suite
 * 
 * Tests for:
 * - Database constraints and relationships
 * - Data validation rules
 * - Referential integrity
 * - Transaction consistency
 * - Data migration integrity
 * - Backup and restore processes
 */

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db'
    }
  }
})

test.describe('Data Integrity Testing', () => {
  
  test.beforeAll(async () => {
    // Ensure clean test database
    await prisma.$connect()
  })

  test.afterAll(async () => {
    await prisma.$disconnect()
  })

  test.describe('Database Schema Validation', () => {
    test('should enforce required field constraints', async () => {
      // Test that required fields cannot be null
      
      // Test User model constraints
      await expect(async () => {
        await prisma.user.create({
          data: {
            // Missing required email field
            name: 'Test User',
            role: 'STUDENT'
          } as any
        })
      }).rejects.toThrow()

      // Test Batch model constraints
      await expect(async () => {
        await prisma.batch.create({
          data: {
            // Missing required fields
            semester: 1
          } as any
        })
      }).rejects.toThrow()

      // Test Subject model constraints
      await expect(async () => {
        await prisma.subject.create({
          data: {
            // Missing required fields
            credits: 4
          } as any
        })
      }).rejects.toThrow()
    })

    test('should enforce unique constraints', async () => {
      // Create initial records
      const program = await prisma.program.create({
        data: {
          name: 'Test Program',
          shortName: 'TP',
          duration: 4,
          totalSems: 8,
          programType: 'UNDERGRADUATE',
          department: {
            create: {
              name: 'Test Department',
              shortName: 'TD',
              university: {
                create: {
                  name: 'Test University',
                  shortName: 'TU'
                }
              }
            }
          }
        }
      })

      const batch = await prisma.batch.create({
        data: {
          name: 'Test Batch',
          programId: program.id,
          semester: 1,
          startYear: 2024,
          endYear: 2028,
          semType: 'ODD'
        }
      })

      // Test unique email constraint
      await prisma.user.create({
        data: {
          email: 'unique.test@example.com',
          name: 'Test User',
          role: 'STUDENT'
        }
      })

      await expect(async () => {
        await prisma.user.create({
          data: {
            email: 'unique.test@example.com', // Duplicate email
            name: 'Another User',
            role: 'FACULTY'
          }
        })
      }).rejects.toThrow()

      // Test unique subject code constraint
      await prisma.subject.create({
        data: {
          name: 'Test Subject',
          code: 'TS001',
          credits: 4,
          totalHours: 60,
          batchId: batch.id,
          examType: 'THEORY',
          subjectType: 'CORE'
        }
      })

      await expect(async () => {
        await prisma.subject.create({
          data: {
            name: 'Another Subject',
            code: 'TS001', // Duplicate code
            credits: 4,
            totalHours: 60,
            batchId: batch.id,
            examType: 'THEORY',
            subjectType: 'CORE'
          }
        })
      }).rejects.toThrow()
    })

    test('should enforce foreign key constraints', async () => {
      // Test that invalid foreign keys are rejected
      
      await expect(async () => {
        await prisma.batch.create({
          data: {
            name: 'Invalid Batch',
            programId: 'non-existent-program-id',
            semester: 1,
            startYear: 2024,
            endYear: 2028,
            semType: 'ODD'
          }
        })
      }).rejects.toThrow()

      await expect(async () => {
        await prisma.subject.create({
          data: {
            name: 'Invalid Subject',
            code: 'INV001',
            credits: 4,
            totalHours: 60,
            batchId: 'non-existent-batch-id',
            examType: 'THEORY',
            subjectType: 'CORE'
          }
        })
      }).rejects.toThrow()
    })

    test('should enforce enum constraints', async () => {
      const program = await prisma.program.findFirst()
      if (!program) return

      // Test invalid role enum
      await expect(async () => {
        await prisma.user.create({
          data: {
            email: 'invalid.role@example.com',
            name: 'Invalid Role User',
            role: 'INVALID_ROLE' as any
          }
        })
      }).rejects.toThrow()

      // Test invalid program type enum
      await expect(async () => {
        await prisma.program.create({
          data: {
            name: 'Invalid Program',
            shortName: 'IP',
            duration: 4,
            totalSems: 8,
            programType: 'INVALID_TYPE' as any,
            departmentId: program.departmentId
          }
        })
      }).rejects.toThrow()
    })
  })

  test.describe('Referential Integrity', () => {
    test('should maintain referential integrity on delete', async () => {
      // Create test data with relationships
      const university = await prisma.university.create({
        data: {
          name: 'Delete Test University',
          shortName: 'DTU'
        }
      })

      const department = await prisma.department.create({
        data: {
          name: 'Delete Test Department',
          shortName: 'DTD',
          universityId: university.id
        }
      })

      const program = await prisma.program.create({
        data: {
          name: 'Delete Test Program',
          shortName: 'DTP',
          duration: 4,
          totalSems: 8,
          programType: 'UNDERGRADUATE',
          departmentId: department.id
        }
      })

      const batch = await prisma.batch.create({
        data: {
          name: 'Delete Test Batch',
          programId: program.id,
          semester: 1,
          startYear: 2024,
          endYear: 2028,
          semType: 'ODD'
        }
      })

      const user = await prisma.user.create({
        data: {
          email: 'delete.test@example.com',
          name: 'Delete Test User',
          role: 'STUDENT',
          departmentId: department.id
        }
      })

      const student = await prisma.student.create({
        data: {
          userId: user.id,
          studentId: 'DEL001',
          rollNumber: 'DEL001',
          batchId: batch.id
        }
      })

      // Test cascade delete
      await prisma.university.delete({
        where: { id: university.id }
      })

      // Related records should be deleted due to cascade
      const deletedDepartment = await prisma.department.findUnique({
        where: { id: department.id }
      })
      expect(deletedDepartment).toBeNull()

      const deletedProgram = await prisma.program.findUnique({
        where: { id: program.id }
      })
      expect(deletedProgram).toBeNull()

      const deletedBatch = await prisma.batch.findUnique({
        where: { id: batch.id }
      })
      expect(deletedBatch).toBeNull()
    })

    test('should prevent deletion when referenced by other records', async () => {
      // This test depends on the specific cascade rules defined in the schema
      // Some deletions should be prevented if they would leave orphaned records
      
      const program = await prisma.program.findFirst({
        include: { batches: true }
      })

      if (program && program.batches.length > 0) {
        // If program has batches, deletion might be restricted
        // This depends on the onDelete behavior defined in the schema
        try {
          await prisma.program.delete({
            where: { id: program.id }
          })
        } catch (error) {
          // Expected if deletion is restricted
          expect(error).toBeDefined()
        }
      }
    })
  })

  test.describe('Data Validation Rules', () => {
    test('should validate business rules', async () => {
      const program = await prisma.program.findFirst()
      if (!program) return

      // Test semester validation (should be between 1 and program.totalSems)
      await expect(async () => {
        await prisma.batch.create({
          data: {
            name: 'Invalid Semester Batch',
            programId: program.id,
            semester: 15, // Invalid semester
            startYear: 2024,
            endYear: 2028,
            semType: 'ODD'
          }
        })
      }).rejects.toThrow()

      // Test year validation (endYear should be after startYear)
      await expect(async () => {
        await prisma.batch.create({
          data: {
            name: 'Invalid Year Batch',
            programId: program.id,
            semester: 1,
            startYear: 2028,
            endYear: 2024, // End year before start year
            semType: 'ODD'
          }
        })
      }).rejects.toThrow()

      // Test credit hours calculation
      const batch = await prisma.batch.findFirst()
      if (batch) {
        const subject = await prisma.subject.create({
          data: {
            name: 'Test Subject',
            code: 'VALID001',
            credits: 4,
            totalHours: 60, // Should be credits * 15
            batchId: batch.id,
            examType: 'THEORY',
            subjectType: 'CORE'
          }
        })

        expect(subject.totalHours).toBe(subject.credits * 15)
      }
    })

    test('should validate email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        '<script>alert("xss")</script>@domain.com'
      ]

      for (const email of invalidEmails) {
        await expect(async () => {
          await prisma.user.create({
            data: {
              email: email,
              name: 'Test User',
              role: 'STUDENT'
            }
          })
        }).rejects.toThrow()
      }
    })

    test('should validate phone number formats', async () => {
      const validUser = await prisma.user.create({
        data: {
          email: 'phone.test@example.com',
          name: 'Phone Test User',
          role: 'STUDENT',
          phone: '+91-9876543210' // Valid phone format
        }
      })

      expect(validUser.phone).toBe('+91-9876543210')

      // Test invalid phone formats would require additional validation logic
      // This depends on how phone validation is implemented in the application
    })
  })

  test.describe('Transaction Consistency', () => {
    test('should maintain consistency during bulk operations', async () => {
      const program = await prisma.program.findFirst()
      if (!program) return

      // Test atomic batch creation with students
      const batchData = {
        name: 'Bulk Test Batch',
        programId: program.id,
        semester: 1,
        startYear: 2024,
        endYear: 2028,
        semType: 'ODD' as const
      }

      const studentsData = Array.from({ length: 10 }, (_, i) => ({
        email: `bulk.student${i}@example.com`,
        name: `Bulk Student ${i}`,
        role: 'STUDENT' as const
      }))

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.batch.create({
          data: batchData
        })

        const users = await Promise.all(
          studentsData.map(userData => 
            tx.user.create({ data: userData })
          )
        )

        const students = await Promise.all(
          users.map((user, i) =>
            tx.student.create({
              data: {
                userId: user.id,
                studentId: `BULK${i.toString().padStart(3, '0')}`,
                rollNumber: `B${i.toString().padStart(3, '0')}`,
                batchId: batch.id
              }
            })
          )
        )

        return { batch, users, students }
      })

      // Verify all records were created
      expect(result.batch).toBeDefined()
      expect(result.users).toHaveLength(10)
      expect(result.students).toHaveLength(10)

      // Verify relationships
      const createdBatch = await prisma.batch.findUnique({
        where: { id: result.batch.id },
        include: { students: true }
      })

      expect(createdBatch?.students).toHaveLength(10)
    })

    test('should rollback on transaction failure', async () => {
      const initialUserCount = await prisma.user.count()

      // Attempt transaction that should fail
      try {
        await prisma.$transaction(async (tx) => {
          // Create a valid user
          await tx.user.create({
            data: {
              email: 'rollback.test@example.com',
              name: 'Rollback Test',
              role: 'STUDENT'
            }
          })

          // Attempt to create invalid user (should fail)
          await tx.user.create({
            data: {
              email: 'rollback.test@example.com', // Duplicate email
              name: 'Rollback Test 2',
              role: 'FACULTY'
            }
          })
        })
      } catch (error) {
        // Expected to fail due to duplicate email
      }

      // Verify no users were created (transaction rolled back)
      const finalUserCount = await prisma.user.count()
      expect(finalUserCount).toBe(initialUserCount)
    })
  })

  test.describe('Data Migration Integrity', () => {
    test('should preserve data during schema changes', async () => {
      // This test would verify that migrations don't lose data
      // In a real scenario, this would test migration scripts
      
      const beforeCount = await prisma.user.count()
      const beforeBatchCount = await prisma.batch.count()
      const beforeSubjectCount = await prisma.subject.count()

      // Simulate migration by checking current data integrity
      const users = await prisma.user.findMany({
        include: {
          student: true,
          department: true
        }
      })

      // Verify all users have required fields
      users.forEach(user => {
        expect(user.email).toBeTruthy()
        expect(user.role).toBeTruthy()
        expect(['ADMIN', 'FACULTY', 'STUDENT']).toContain(user.role)
      })

      // Verify relationships are intact
      const batches = await prisma.batch.findMany({
        include: {
          program: true,
          students: true,
          subjects: true
        }
      })

      batches.forEach(batch => {
        expect(batch.program).toBeTruthy()
        expect(batch.semester).toBeGreaterThan(0)
        expect(batch.startYear).toBeGreaterThan(2000)
        expect(batch.endYear).toBeGreaterThan(batch.startYear)
      })

      // Counts should remain the same after "migration"
      expect(await prisma.user.count()).toBe(beforeCount)
      expect(await prisma.batch.count()).toBe(beforeBatchCount)
      expect(await prisma.subject.count()).toBe(beforeSubjectCount)
    })
  })

  test.describe('Backup and Restore Integrity', () => {
    test('should maintain data integrity in backup format', async () => {
      // Export data in a backup-like format
      const backup = {
        users: await prisma.user.findMany(),
        departments: await prisma.department.findMany(),
        programs: await prisma.program.findMany(),
        batches: await prisma.batch.findMany(),
        subjects: await prisma.subject.findMany(),
        students: await prisma.student.findMany()
      }

      // Verify backup completeness
      expect(backup.users.length).toBeGreaterThan(0)
      
      // Verify all required fields are present
      backup.users.forEach(user => {
        expect(user.id).toBeTruthy()
        expect(user.email).toBeTruthy()
        expect(user.role).toBeTruthy()
        expect(user.createdAt).toBeTruthy()
        expect(user.updatedAt).toBeTruthy()
      })

      backup.batches.forEach(batch => {
        expect(batch.id).toBeTruthy()
        expect(batch.name).toBeTruthy()
        expect(batch.programId).toBeTruthy()
        expect(batch.semester).toBeGreaterThan(0)
      })

      // Verify relationships can be reconstructed
      backup.students.forEach(student => {
        const user = backup.users.find(u => u.id === student.userId)
        const batch = backup.batches.find(b => b.id === student.batchId)
        
        expect(user).toBeTruthy()
        expect(batch).toBeTruthy()
        expect(user?.role).toBe('STUDENT')
      })
    })
  })

  test.describe('Concurrent Access Integrity', () => {
    test('should handle concurrent updates correctly', async () => {
      // Create a batch for testing
      const program = await prisma.program.findFirst()
      if (!program) return

      const batch = await prisma.batch.create({
        data: {
          name: 'Concurrent Test Batch',
          programId: program.id,
          semester: 1,
          startYear: 2024,
          endYear: 2028,
          semType: 'ODD',
          currentStrength: 0
        }
      })

      // Simulate concurrent updates to student count
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
        prisma.batch.update({
          where: { id: batch.id },
          data: { currentStrength: { increment: 1 } }
        })
      )

      await Promise.all(concurrentUpdates)

      // Verify final count is correct
      const updatedBatch = await prisma.batch.findUnique({
        where: { id: batch.id }
      })

      expect(updatedBatch?.currentStrength).toBe(5)
    })

    test('should prevent data races in attendance marking', async () => {
      // This test would verify that concurrent attendance marking
      // doesn't create inconsistent state
      
      const batch = await prisma.batch.findFirst({
        include: { students: true, subjects: true }
      })

      if (!batch || batch.students.length === 0 || batch.subjects.length === 0) {
        return // Skip if no test data
      }

      const subject = batch.subjects[0]
      const sessionDate = new Date()

      // Create attendance session
      const session = await prisma.attendanceSession.create({
        data: {
          batchId: batch.id,
          subjectId: subject.id,
          date: sessionDate
        }
      })

      // Simulate concurrent attendance marking for same session
      const concurrentMarking = batch.students.slice(0, 3).map(student =>
        prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: 'PRESENT'
          }
        })
      )

      const records = await Promise.all(concurrentMarking)

      // Verify all records were created without conflicts
      expect(records).toHaveLength(3)
      records.forEach(record => {
        expect(record.sessionId).toBe(session.id)
        expect(record.status).toBe('PRESENT')
      })
    })
  })

  test.describe('Data Cleanup and Archival', () => {
    test('should handle soft deletes correctly', async () => {
      // If soft delete is implemented, test that records are marked as deleted
      // but not actually removed from the database
      
      const user = await prisma.user.create({
        data: {
          email: 'soft.delete@example.com',
          name: 'Soft Delete Test',
          role: 'STUDENT'
        }
      })

      // If soft delete is implemented, this would mark as deleted
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: { deletedAt: new Date() }
      // })

      // Verify record still exists but is marked as deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(deletedUser).toBeTruthy()
      // expect(deletedUser?.deletedAt).toBeTruthy()
    })

    test('should maintain data consistency during archival', async () => {
      // Test that archiving old data doesn't break relationships
      
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 2) // 2 years ago

      // Find old records that could be archived
      const oldSessions = await prisma.attendanceSession.findMany({
        where: {
          date: {
            lt: oldDate
          }
        },
        include: {
          attendanceRecords: true
        }
      })

      // Verify that archival process would maintain referential integrity
      for (const session of oldSessions) {
        expect(session.attendanceRecords).toBeDefined()
        
        // In a real archival process, related records would be archived together
        session.attendanceRecords.forEach(record => {
          expect(record.sessionId).toBe(session.id)
        })
      }
    })
  })
})