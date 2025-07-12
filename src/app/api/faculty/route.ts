import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user) && !isFaculty(session.user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's department to only show faculty from same department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true }
    })

    if (!user?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    const faculty = await db.user.findMany({
      where: {
        role: "FACULTY",
        departmentId: user.departmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        phone: true,
        status: true,
        primarySubjects: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        },
        coFacultySubjects: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        }
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json(faculty)
  } catch (error) {
    console.error("Error fetching faculty:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, employeeId, phone, status } = body

    // Validate required fields
    if (!name || !email || !employeeId) {
      return NextResponse.json(
        { error: "Name, email, and employee ID are required" },
        { status: 400 }
      )
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true }
    })

    if (!user?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Check if email or employeeId already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { employeeId }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or Employee ID already exists" },
        { status: 400 }
      )
    }

    // Create faculty member
    const faculty = await db.user.create({
      data: {
        name,
        email,
        employeeId,
        phone: phone || null,
        role: "FACULTY",
        status: status || "ACTIVE",
        departmentId: user.departmentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        phone: true,
        status: true,
        primarySubjects: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        },
        coFacultySubjects: {
          select: {
            id: true,
            name: true,
            code: true,
            credits: true,
          }
        }
      }
    })

    return NextResponse.json(faculty, { status: 201 })
  } catch (error) {
    console.error("Error creating faculty:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}