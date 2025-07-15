import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const semesterFilterSchema = z.object({
  departmentId: z.string().optional(),
  academicYear: z.string().optional(),
  isActive: z.boolean().optional(),
  year: z.number().min(2020).max(2030).optional(),
})

const createSemesterSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  semesterName: z.string().min(1, "Semester name is required"),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, "Academic year must be in format YYYY-YY (e.g., 2024-25)"),
  semesterStart: z.string().min(1, "Semester start date is required"),
  semesterEnd: z.string().min(1, "Semester end date is required"),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams.entries())
    
    // Convert parameters to correct types for schema validation
    const queryParams: any = {}
    
    // Copy string parameters directly
    if (rawParams.departmentId) queryParams.departmentId = rawParams.departmentId
    if (rawParams.academicYear) queryParams.academicYear = rawParams.academicYear
    
    // Convert numeric parameters
    if (rawParams.year) queryParams.year = parseInt(rawParams.year)
    
    // Convert boolean parameters
    if (rawParams.isActive) queryParams.isActive = rawParams.isActive === "true"
    
    const filters = semesterFilterSchema.parse(queryParams)
    
    const whereClause: any = {}
    
    // Apply filters
    if (filters.departmentId) {
      whereClause.departmentId = filters.departmentId
    } else {
      // If no specific department, get user's department semesters
      const user = await db.user.findUnique({
        where: { id: (session.user as any).id },
        include: { department: true }
      })
      
      if (user?.departmentId) {
        whereClause.departmentId = user.departmentId
      }
    }
    
    if (filters.academicYear) whereClause.academicYear = filters.academicYear
    if (filters.isActive !== undefined) whereClause.isActive = filters.isActive

    // Year filtering
    if (filters.year) {
      whereClause.semesterStart = { gte: new Date(`${filters.year}-01-01`) }
      whereClause.semesterEnd = { lte: new Date(`${filters.year}-12-31`) }
    }

    const semesters = await db.academicCalendar.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        holidays: {
          select: {
            id: true,
            name: true,
            date: true,
            type: true,
          },
          orderBy: { date: "asc" }
        },
        examPeriods: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            examType: true,
            blockRegularClasses: true,
          },
          orderBy: { startDate: "asc" }
        },
        _count: {
          select: {
            holidays: true,
            examPeriods: true,
          }
        }
      },
      orderBy: { semesterStart: "desc" }
    })

    // Add calculated fields
    const enrichedSemesters = semesters.map(semester => {
      const startDate = new Date(semester.semesterStart)
      const endDate = new Date(semester.semesterEnd)
      const currentDate = new Date()
      
      let status: "upcoming" | "ongoing" | "completed"
      if (currentDate < startDate) {
        status = "upcoming"
      } else if (currentDate > endDate) {
        status = "completed"
      } else {
        status = "ongoing"
      }
      
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const durationWeeks = Math.ceil(durationDays / 7)
      
      // Calculate progress if ongoing
      let progressPercentage = 0
      if (status === "ongoing") {
        const totalDuration = endDate.getTime() - startDate.getTime()
        const elapsed = currentDate.getTime() - startDate.getTime()
        progressPercentage = Math.round((elapsed / totalDuration) * 100)
      } else if (status === "completed") {
        progressPercentage = 100
      }
      
      return {
        ...semester,
        status,
        durationDays,
        durationWeeks,
        progressPercentage,
      }
    })

    return NextResponse.json({
      semesters: enrichedSemesters,
      summary: {
        total: semesters.length,
        upcoming: enrichedSemesters.filter(s => s.status === "upcoming").length,
        ongoing: enrichedSemesters.filter(s => s.status === "ongoing").length,
        completed: enrichedSemesters.filter(s => s.status === "completed").length,
        totalHolidays: semesters.reduce((sum, s) => sum + s._count.holidays, 0),
        totalExamPeriods: semesters.reduce((sum, s) => sum + s._count.examPeriods, 0),
      }
    })
  } catch (error) {
    console.error("Error fetching semesters:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSemesterSchema.parse(body)

    // Validate dates
    const semesterStart = new Date(validatedData.semesterStart)
    const semesterEnd = new Date(validatedData.semesterEnd)
    
    if (isNaN(semesterStart.getTime()) || isNaN(semesterEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      )
    }

    if (semesterEnd <= semesterStart) {
      return NextResponse.json(
        { error: "Semester end date must be after start date" },
        { status: 400 }
      )
    }

    // Validate minimum semester duration (e.g., at least 12 weeks)
    const durationWeeks = Math.ceil((semesterEnd.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24 * 7))
    if (durationWeeks < 12) {
      return NextResponse.json(
        { error: "Semester must be at least 12 weeks long" },
        { status: 400 }
      )
    }

    // Validate department exists
    const department = await db.department.findUnique({
      where: { id: validatedData.departmentId }
    })

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      )
    }

    // Check for duplicate semester (same department, semester name, and academic year)
    const duplicateSemester = await db.academicCalendar.findFirst({
      where: {
        departmentId: validatedData.departmentId,
        semesterName: validatedData.semesterName,
        academicYear: validatedData.academicYear,
      }
    })

    if (duplicateSemester) {
      return NextResponse.json(
        { error: "A semester with this name already exists for this academic year in this department" },
        { status: 400 }
      )
    }

    // Check for overlapping semesters in the same department
    const overlappingSemesters = await db.academicCalendar.findMany({
      where: {
        departmentId: validatedData.departmentId,
        OR: [
          {
            AND: [
              { semesterStart: { lte: semesterStart } },
              { semesterEnd: { gte: semesterStart } }
            ]
          },
          {
            AND: [
              { semesterStart: { lte: semesterEnd } },
              { semesterEnd: { gte: semesterEnd } }
            ]
          },
          {
            AND: [
              { semesterStart: { gte: semesterStart } },
              { semesterEnd: { lte: semesterEnd } }
            ]
          }
        ]
      },
      select: {
        semesterName: true,
        academicYear: true,
        semesterStart: true,
        semesterEnd: true,
      }
    })

    if (overlappingSemesters.length > 0) {
      return NextResponse.json({
        warning: "This semester overlaps with existing semesters",
        overlappingSemesters,
        canProceed: true, // Allow overlapping semesters as some institutions may need this
      }, { status: 409 })
    }

    // Validate academic year format and consistency
    const [startYear, endYearSuffix] = validatedData.academicYear.split("-")
    const endYear = "20" + endYearSuffix
    
    const semesterStartYear = semesterStart.getFullYear()
    const semesterEndYear = semesterEnd.getFullYear()
    
    if (semesterStartYear < parseInt(startYear) || semesterEndYear > parseInt(endYear)) {
      return NextResponse.json(
        { error: "Semester dates must fall within the specified academic year" },
        { status: 400 }
      )
    }

    // Create the semester
    const semester = await db.academicCalendar.create({
      data: {
        departmentId: validatedData.departmentId,
        semesterName: validatedData.semesterName,
        academicYear: validatedData.academicYear,
        semesterStart: semesterStart,
        semesterEnd: semesterEnd,
      },
      include: {
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
        _count: {
          select: {
            holidays: true,
            examPeriods: true,
          }
        }
      }
    })

    const currentDate = new Date()
    let status: "upcoming" | "ongoing" | "completed"
    if (currentDate < semesterStart) {
      status = "upcoming"
    } else if (currentDate > semesterEnd) {
      status = "completed"
    } else {
      status = "ongoing"
    }

    const durationDays = Math.ceil((semesterEnd.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24))
    const durationWeeksCalc = Math.ceil(durationDays / 7)

    let progressPercentage = 0
    if (status === "ongoing") {
      const totalDuration = semesterEnd.getTime() - semesterStart.getTime()
      const elapsed = currentDate.getTime() - semesterStart.getTime()
      progressPercentage = Math.round((elapsed / totalDuration) * 100)
    } else if (status === "completed") {
      progressPercentage = 100
    }

    return NextResponse.json({
      semester: {
        ...semester,
        status,
        durationDays,
        durationWeeks: durationWeeksCalc,
        progressPercentage,
        holidays: [],
        examPeriods: [],
      },
      summary: {
        semesterCreated: true,
        durationDays,
        durationWeeks: durationWeeksCalc,
        status,
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating semester:", error)
    return NextResponse.json(
      { error: "Failed to create semester" },
      { status: 500 }
    )
  }
}