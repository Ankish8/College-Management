import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const updateSubjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").optional(),
  code: z.string().min(1, "Subject code is required").optional(),
  credits: z.number().min(1, "Credits must be at least 1").max(6, "Credits cannot exceed 6").optional(),
  batchId: z.string().min(1, "Batch is required").optional(),
  primaryFacultyId: z.string().min(1, "Primary faculty is required").optional(),
  coFacultyId: z.string().nullable().optional(),
  examType: z.string().optional(),
  subjectType: z.string().optional(),
  description: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            program: {
              include: {
                department: true
              }
            },
            specialization: true
          }
        },
        primaryFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        coFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            attendanceSessions: true,
            timetableEntries: true,
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error fetching subject:", error)
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
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSubjectSchema.parse(body)

    // Check if subject exists
    const existingSubject = await db.subject.findUnique({
      where: { id },
      include: {
        batch: true,
        primaryFaculty: true,
        coFaculty: true,
      }
    })

    if (!existingSubject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      )
    }

    // Check for duplicate subject code if being updated
    if (validatedData.code && validatedData.code !== existingSubject.code) {
      const duplicateCode = await db.subject.findFirst({
        where: {
          code: validatedData.code,
          id: { not: id }
        }
      })

      if (duplicateCode) {
        return NextResponse.json(
          { error: "Subject code already exists" },
          { status: 400 }
        )
      }
    }

    // Validate that primary and co-faculty are different
    if (validatedData.primaryFacultyId && validatedData.coFacultyId && 
        validatedData.primaryFacultyId === validatedData.coFacultyId) {
      return NextResponse.json(
        { error: "Primary faculty and co-faculty cannot be the same" },
        { status: 400 }
      )
    }

    // Calculate total hours based on credits
    const creditHoursRatio = 15 // Default ratio, should come from settings
    const updateData: any = {
      ...validatedData,
    }

    // Calculate total hours if credits are being updated
    if (validatedData.credits) {
      updateData.totalHours = validatedData.credits * creditHoursRatio
    }

    // Convert empty string to null for optional fields
    if (validatedData.coFacultyId === "") {
      updateData.coFacultyId = null
    }
    if (validatedData.description === "") {
      updateData.description = null
    }

    const updatedSubject = await db.subject.update({
      where: { id },
      data: updateData,
      include: {
        batch: {
          include: {
            program: {
              include: {
                department: true
              }
            },
            specialization: true
          }
        },
        primaryFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        coFaculty: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            attendanceSessions: true,
            timetableEntries: true,
          }
        }
      }
    })

    return NextResponse.json(updatedSubject)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating subject:", error)
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
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if subject exists
    const existingSubject = await db.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceSessions: true,
            timetableEntries: true,
          }
        }
      }
    })

    if (!existingSubject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      )
    }

    // Check if subject has attendance sessions or timetable entries
    if (existingSubject._count.attendanceSessions > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete subject with attendance records. Please archive it instead." 
        },
        { status: 400 }
      )
    }

    if (existingSubject._count.timetableEntries > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete subject with timetable entries. Please remove from timetable first." 
        },
        { status: 400 }
      )
    }

    // Delete the subject
    await db.subject.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Subject deleted successfully" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}