import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, canCreateStudent } from "@/lib/utils/permissions"
import { z } from "zod"
import { hash } from "bcryptjs"

const createStudentSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  studentId: z.string().min(1),
  rollNumber: z.string().min(1),
  batchId: z.string(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional().transform((str) => str ? new Date(str) : undefined),
})

const bulkCreateStudentsSchema = z.object({
  students: z.array(createStudentSchema),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batchId")
    const search = searchParams.get("search")
    const isActive = searchParams.get("active")

    const whereClause: Record<string, unknown> = {}
    
    if (batchId) {
      whereClause.batchId = batchId
    }

    if (isActive !== null) {
      whereClause.user = {
        status: isActive === "true" ? "ACTIVE" : "INACTIVE"
      }
    }

    if (search) {
      whereClause.OR = [
        { studentId: { contains: search } },
        { rollNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { guardianName: { contains: search } },
      ]
    }

    const students = await db.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          }
        },
        batch: {
          include: {
            program: {
              select: {
                name: true,
                shortName: true,
              }
            },
            specialization: {
              select: {
                name: true,
                shortName: true,
              }
            }
          }
        },
        // Use aggregation for attendance statistics (much faster)
        _count: {
          select: {
            attendanceRecords: true
          }
        }
      },
      orderBy: [
        { user: { status: "desc" } }, // Active students first
        { user: { name: "asc" } },
      ]
    })

    // Get attendance statistics for all students in a single query
    const studentIds = students.map(s => s.id);
    const attendanceStats = await db.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds }
      },
      _count: {
        status: true
      }
    });

    // Get present/late counts separately for now (Prisma limitation)
    const presentStats = await db.attendanceRecord.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        status: { in: ["PRESENT", "LATE"] }
      },
      _count: {
        status: true
      }
    });

    // Create lookup maps for O(1) access
    const presentCountMap = new Map(presentStats.map(stat => [stat.studentId, stat._count.status]));
    const totalCountMap = new Map(attendanceStats.map(stat => [stat.studentId, stat._count.status]));

    // Calculate attendance percentage efficiently
    const studentsWithAttendance = students.map(student => {
      const totalRecords = totalCountMap.get(student.id) || 0;
      const presentRecords = presentCountMap.get(student.id) || 0;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

      return {
        ...student,
        attendancePercentage,
        totalAttendanceRecords: totalRecords,
      };
    });

    const response = NextResponse.json(studentsWithAttendance)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !canCreateStudent(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Check if this is a bulk create or single create
    const isBulk = body.students && Array.isArray(body.students)
    
    if (isBulk) {
      // Handle bulk creation
      const validatedData = bulkCreateStudentsSchema.parse(body)
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
      }

      for (const studentData of validatedData.students) {
        try {
          // Check for existing user or student
          const existingUser = await db.user.findUnique({
            where: { email: studentData.email }
          })

          const existingStudent = await db.student.findFirst({
            where: {
              OR: [
                { studentId: studentData.studentId },
                { rollNumber: studentData.rollNumber },
              ]
            }
          })

          if (existingUser || existingStudent) {
            results.skipped++
            results.errors.push(`Student ${studentData.name} (${studentData.email}) already exists`)
            continue
          }

          // Verify batch exists and get department info
          const batch = await db.batch.findUnique({
            where: { id: studentData.batchId },
            include: {
              program: {
                include: {
                  department: true
                }
              }
            }
          })

          if (!batch) {
            results.errors.push(`Batch not found for student ${studentData.name}`)
            continue
          }

          // Create user account first with inherited department
          const hashedPassword = await hash("password123", 12) // Default password
          
          const user = await db.user.create({
            data: {
              email: studentData.email,
              name: studentData.name,
              phone: studentData.phone,
              role: "STUDENT",
              departmentId: batch.program.departmentId, // Inherit department from batch→program
              status: "ACTIVE",
            }
          })

          // Create student record
          await db.student.create({
            data: {
              userId: user.id,
              studentId: studentData.studentId,
              rollNumber: studentData.rollNumber,
              batchId: studentData.batchId,
              guardianName: studentData.guardianName,
              guardianPhone: studentData.guardianPhone,
              address: studentData.address,
              dateOfBirth: studentData.dateOfBirth,
            }
          })

          // Update batch student count
          await db.batch.update({
            where: { id: studentData.batchId },
            data: {
              currentStrength: {
                increment: 1
              }
            }
          })

          results.created++
        } catch (error) {
          results.errors.push(`Error creating student ${studentData.name}: ${error}`)
        }
      }

      return NextResponse.json(results, { status: 201 })
    } else {
      // Handle single student creation
      const validatedData = createStudentSchema.parse(body)

      // Check for existing user
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        )
      }

      // Check for existing student IDs
      const existingStudent = await db.student.findFirst({
        where: {
          OR: [
            { studentId: validatedData.studentId },
            { rollNumber: validatedData.rollNumber },
          ]
        }
      })

      if (existingStudent) {
        return NextResponse.json(
          { error: "Student with this ID or roll number already exists" },
          { status: 400 }
        )
      }

      // Verify batch exists and get department info
      const batch = await db.batch.findUnique({
        where: { id: validatedData.batchId },
        include: {
          program: {
            include: {
              department: true
            }
          }
        }
      })

      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 })
      }

      // Create user account first with inherited department
      const hashedPassword = await hash("password123", 12) // Default password
      
      const user = await db.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          phone: validatedData.phone,
          role: "STUDENT",
          departmentId: batch.program.departmentId, // Inherit department from batch→program
          status: "ACTIVE",
        }
      })

      // Create student record
      const student = await db.student.create({
        data: {
          userId: user.id,
          studentId: validatedData.studentId,
          rollNumber: validatedData.rollNumber,
          batchId: validatedData.batchId,
          guardianName: validatedData.guardianName,
          guardianPhone: validatedData.guardianPhone,
          address: validatedData.address,
          dateOfBirth: validatedData.dateOfBirth,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            }
          },
          batch: {
            include: {
              program: {
                select: {
                  name: true,
                  shortName: true,
                }
              },
              specialization: {
                select: {
                  name: true,
                  shortName: true,
                }
              }
            }
          }
        }
      })

      // Update batch student count
      await db.batch.update({
        where: { id: validatedData.batchId },
        data: {
          currentStrength: {
            increment: 1
          }
        }
      })

      return NextResponse.json({
        ...student,
        attendancePercentage: 0,
        totalAttendanceRecords: 0,
      }, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating student:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}