import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isFaculty, isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const createBlackoutPeriodSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
})

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: facultyId } = await params
    const body = await request.json()
    const validatedData = createBlackoutPeriodSchema.parse(body)

    // Check if user can create blackout periods for this faculty
    const currentUser = session.user as any
    const canCreate = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canCreate) {
      return NextResponse.json(
        { error: "You don't have permission to create blackout periods for this faculty" },
        { status: 403 }
      )
    }

    // Verify the faculty user exists and has preferences
    const facultyUser = await db.user.findUnique({
      where: { id: facultyId },
      include: { facultyPreferences: true }
    })

    if (!facultyUser || (facultyUser.role !== "FACULTY" && facultyUser.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Faculty user not found" },
        { status: 404 }
      )
    }

    // Create faculty preferences if they don't exist
    let preferences = facultyUser.facultyPreferences
    if (!preferences) {
      preferences = await db.facultyPreferences.create({
        data: {
          facultyId,
          maxDailyHours: 8,
          maxWeeklyHours: 40,
        }
      })
    }

    // Validate dates
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Check for overlapping blackout periods
    const overlappingPeriod = await db.facultyBlackoutPeriod.findFirst({
      where: {
        facultyPreferencesId: preferences.id,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          }
        ]
      }
    })

    if (overlappingPeriod) {
      return NextResponse.json(
        { error: "Overlapping blackout period already exists" },
        { status: 400 }
      )
    }

    // Create blackout period
    const blackoutPeriod = await db.facultyBlackoutPeriod.create({
      data: {
        facultyPreferencesId: preferences.id,
        startDate,
        endDate,
        reason: validatedData.reason,
        isRecurring: validatedData.isRecurring,
      }
    })

    return NextResponse.json(blackoutPeriod)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating blackout period:", error)
    return NextResponse.json(
      { error: "Failed to create blackout period" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: facultyId } = await params

    // Check if user can view blackout periods for this faculty
    const currentUser = session.user as any
    const canView = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canView) {
      return NextResponse.json(
        { error: "You don't have permission to view blackout periods for this faculty" },
        { status: 403 }
      )
    }

    // Get faculty preferences and blackout periods
    const preferences = await db.facultyPreferences.findUnique({
      where: { facultyId },
      include: {
        blackoutPeriods: {
          orderBy: { startDate: 'desc' }
        }
      }
    })

    if (!preferences) {
      return NextResponse.json([])
    }

    return NextResponse.json(preferences.blackoutPeriods)
  } catch (error) {
    console.error("Error fetching blackout periods:", error)
    return NextResponse.json(
      { error: "Failed to fetch blackout periods" },
      { status: 500 }
    )
  }
}