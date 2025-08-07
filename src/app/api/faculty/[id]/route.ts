import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await request.json()
    let { name, email, employeeId, phone } = body
    const { status } = body

    // Trim whitespace and validate required fields
    name = name?.trim()
    email = email?.trim().toLowerCase()
    employeeId = employeeId?.trim()
    phone = phone?.trim()

    // Validate required fields
    if (!name || !email || !employeeId) {
      return NextResponse.json(
        { error: "Name, email, and employee ID are required" },
        { status: 400 }
      )
    }

    // Check if faculty exists
    const existingFaculty = await db.user.findUnique({
      where: { id, role: "FACULTY" }
    })

    if (!existingFaculty) {
      return NextResponse.json(
        { error: "Faculty member not found" },
        { status: 404 }
      )
    }

    // Check if email or employeeId already exists (excluding current faculty, case-insensitive)
    const conflictingUser = await db.user.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { email: email },
              { employeeId: employeeId }
            ]
          }
        ]
      }
    })

    if (conflictingUser) {
      return NextResponse.json(
        { error: "Email or Employee ID already exists" },
        { status: 400 }
      )
    }

    // Update faculty member
    const updatedFaculty = await db.user.update({
      where: { id },
      data: {
        name,
        email,
        employeeId,
        phone: phone || null,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        phone: true,
        status: true,
        primarySubjects: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        },
        coFacultySubjects: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        }
      }
    })

    return NextResponse.json(updatedFaculty)
  } catch (error) {
    console.error("Error updating faculty:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    // Check if faculty exists
    const existingFaculty = await db.user.findUnique({
      where: { id, role: "FACULTY" },
      include: {
        primarySubjects: true,
        coFacultySubjects: true,
      }
    })

    if (!existingFaculty) {
      return NextResponse.json(
        { error: "Faculty member not found" },
        { status: 404 }
      )
    }

    // Check if faculty is assigned to any active subjects
    const activeSubjects = await db.subject.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { primaryFacultyId: id },
              { coFacultyId: id }
            ]
          }
        ]
      }
    })

    const hasActiveSubjects = activeSubjects.length > 0

    if (hasActiveSubjects) {
      return NextResponse.json(
        { 
          error: "Cannot delete faculty member who is assigned to active subjects. Please reassign subjects first." 
        },
        { status: 400 }
      )
    }

    // Delete faculty member
    await db.user.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Faculty member deleted successfully" })
  } catch (error) {
    console.error("Error deleting faculty:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}