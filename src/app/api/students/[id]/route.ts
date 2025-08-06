import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty, canCreateStudent } from "@/lib/utils/permissions"
import { z } from "zod"

const updateStudentSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  studentId: z.string().min(1).optional(),
  rollNumber: z.string().min(1).optional(),
  batchId: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await db.student.findUnique({
      where: { id: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        batch: {
          include: {
            program: {
              select: {
                id: true,
                name: true,
                shortName: true,
                duration: true,
                department: {
                  select: {
                    name: true,
                    shortName: true,
                  }
                }
              }
            },
            specialization: {
              select: {
                id: true,
                name: true,
                shortName: true,
              }
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Try to get attendance data if tables exist, otherwise use defaults
    let attendanceRecords: any[] = [];
    let attendanceDisputes: any[] = [];
    
    try {
      attendanceRecords = await db.attendanceRecord.findMany({
        where: { studentId: id },
        include: {
          session: {
            include: {
              subject: {
                select: {
                  name: true,
                  code: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('attendance_records table does not exist, using empty array');
      } else {
        throw error;
      }
    }

    try {
      attendanceDisputes = await db.attendanceDispute.findMany({
        where: { studentId: id },
        include: {
          record: {
            include: {
              session: {
                include: {
                  subject: {
                    select: {
                      name: true,
                      code: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('attendance_disputes table does not exist, using empty array');
      } else {
        throw error;
      }
    }

    // Calculate attendance statistics from fetched records
    const totalRecords = attendanceRecords.length
    const presentRecords = attendanceRecords.filter(
      record => record.status === "PRESENT" || record.status === "LATE"
    ).length
    const absentRecords = attendanceRecords.filter(
      record => record.status === "ABSENT"
    ).length
    const excusedRecords = attendanceRecords.filter(
      record => record.status === "EXCUSED"
    ).length

    const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0

    return NextResponse.json({
      ...student,
      attendanceRecords,
      attendanceDisputes,
      attendanceStats: {
        total: totalRecords,
        present: presentRecords,
        absent: absentRecords,
        excused: excusedRecords,
        percentage: attendancePercentage,
      },
      // Add basic attendance info for compatibility
      attendancePercentage,
      totalAttendanceRecords: totalRecords
    })
  } catch (error) {
    console.error("Error fetching student:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateStudentSchema.parse(body)

    const student = await db.student.findUnique({
      where: { id: id },
      include: {
        user: true,
        batch: true,
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check for duplicate email if email is being updated
    if (validatedData.email && validatedData.email !== student.user.email) {
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        )
      }
    }

    // Check for duplicate student IDs if they're being updated
    if (validatedData.studentId && validatedData.studentId !== student.studentId) {
      const existingStudent = await db.student.findFirst({
        where: { 
          studentId: validatedData.studentId,
          id: { not: id }
        }
      })

      if (existingStudent) {
        return NextResponse.json(
          { error: "Student with this ID already exists" },
          { status: 400 }
        )
      }
    }

    if (validatedData.rollNumber && validatedData.rollNumber !== student.rollNumber) {
      const existingStudent = await db.student.findFirst({
        where: { 
          rollNumber: validatedData.rollNumber,
          id: { not: id }
        }
      })

      if (existingStudent) {
        return NextResponse.json(
          { error: "Student with this roll number already exists" },
          { status: 400 }
        )
      }
    }

    // Handle batch change
    let batchChanged = false
    if (validatedData.batchId && validatedData.batchId !== student.batchId) {
      const newBatch = await db.batch.findUnique({
        where: { id: validatedData.batchId }
      })

      if (!newBatch) {
        return NextResponse.json({ error: "New batch not found" }, { status: 404 })
      }
      batchChanged = true
    }

    // Prepare user update data
    const userUpdateData: Record<string, unknown> = {}
    if (validatedData.email) userUpdateData.email = validatedData.email
    if (validatedData.name) userUpdateData.name = validatedData.name
    if (validatedData.phone !== undefined) userUpdateData.phone = validatedData.phone
    if (validatedData.status) userUpdateData.status = validatedData.status

    // Prepare student update data
    const studentUpdateData: Record<string, unknown> = {}
    if (validatedData.studentId) studentUpdateData.studentId = validatedData.studentId
    if (validatedData.rollNumber) studentUpdateData.rollNumber = validatedData.rollNumber
    if (validatedData.batchId) studentUpdateData.batchId = validatedData.batchId
    if (validatedData.guardianName !== undefined) studentUpdateData.guardianName = validatedData.guardianName
    if (validatedData.guardianPhone !== undefined) studentUpdateData.guardianPhone = validatedData.guardianPhone
    if (validatedData.address !== undefined) studentUpdateData.address = validatedData.address
    if (validatedData.dateOfBirth !== undefined) studentUpdateData.dateOfBirth = validatedData.dateOfBirth

    // Use transaction to update both user and student
    const updatedStudent = await db.$transaction(async (tx) => {
      // Update user record if there are user fields to update
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userUpdateData,
        })
      }

      // Update student record if there are student fields to update
      if (Object.keys(studentUpdateData).length > 0) {
        await tx.student.update({
          where: { id: id },
          data: studentUpdateData,
        })
      }

      // Handle batch count updates if batch changed
      if (batchChanged) {
        // Decrease count in old batch
        await tx.batch.update({
          where: { id: student.batchId },
          data: {
            currentStrength: {
              decrement: 1
            }
          }
        })

        // Increase count in new batch
        await tx.batch.update({
          where: { id: validatedData.batchId },
          data: {
            currentStrength: {
              increment: 1
            }
          }
        })
      }

      // Return updated student with relations
      return await tx.student.findUnique({
        where: { id: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
              updatedAt: true,
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
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating student:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await db.student.findUnique({
      where: { id: id },
      include: {
        user: true,
        batch: true,
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // For hard delete, we'll remove all related records
    // This is what the user requested - hard delete with no preservation
    await db.$transaction(async (tx) => {
      let deletedAttendanceRecords = 0;
      let deletedAttendanceDisputes = 0;

      // Try to delete attendance disputes first (they reference attendance records)
      try {
        const deletedDisputes = await tx.attendanceDispute.deleteMany({
          where: { studentId: id }
        });
        deletedAttendanceDisputes = deletedDisputes.count;
      } catch (error: any) {
        if (error.code !== 'P2021') throw error;
        console.log('attendance_disputes table does not exist, skipping');
      }

      // Try to delete attendance records
      try {
        const deletedRecords = await tx.attendanceRecord.deleteMany({
          where: { studentId: id }
        });
        deletedAttendanceRecords = deletedRecords.count;
      } catch (error: any) {
        if (error.code !== 'P2021') throw error;
        console.log('attendance_records table does not exist, skipping');
      }

      // Delete student record
      await tx.student.delete({
        where: { id: id }
      })

      // Delete user account
      await tx.user.delete({
        where: { id: student.userId }
      })

      // Update batch student count
      await tx.batch.update({
        where: { id: student.batchId },
        data: {
          currentStrength: {
            decrement: 1
          }
        }
      })

      return { deletedAttendanceRecords, deletedAttendanceDisputes };
    })

    return NextResponse.json({ 
      message: "Student deleted successfully",
      deletedRecords: {
        attendanceRecords: 0, // Will be updated by transaction result
        attendanceDisputes: 0, // Will be updated by transaction result
      }
    })
  } catch (error) {
    console.error("Error deleting student:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}