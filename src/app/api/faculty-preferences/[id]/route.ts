import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isFaculty, isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateFacultyPreferencesSchema = z.object({
  maxDailyHours: z.number().min(1).max(24),
  maxWeeklyHours: z.number().min(1).max(168),
  preferredTimeSlots: z.array(z.string()).optional(),
  notificationSettings: z.object({
    scheduleChanges: z.boolean(),
    newAssignments: z.boolean(),
    conflictAlerts: z.boolean(),
    reminderNotifications: z.boolean(),
    emailDigest: z.enum(["never", "daily", "weekly"]),
  }).optional(),
})

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: facultyId } = await params
    const body = await request.json()
    const validatedData = updateFacultyPreferencesSchema.parse(body)

    // Check if user can update these preferences (faculty can update their own, admin can update anyone's)
    const currentUser = session.user as any
    const canUpdate = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canUpdate) {
      return NextResponse.json(
        { error: "You don't have permission to update these preferences" },
        { status: 403 }
      )
    }

    // Verify the faculty user exists
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

    // Update or create faculty preferences
    const preferences = await db.facultyPreferences.upsert({
      where: { facultyId },
      update: {
        maxDailyHours: validatedData.maxDailyHours,
        maxWeeklyHours: validatedData.maxWeeklyHours,
        preferredTimeSlots: validatedData.preferredTimeSlots,
        notificationSettings: validatedData.notificationSettings,
      },
      create: {
        facultyId,
        maxDailyHours: validatedData.maxDailyHours,
        maxWeeklyHours: validatedData.maxWeeklyHours,
        preferredTimeSlots: validatedData.preferredTimeSlots,
        notificationSettings: validatedData.notificationSettings,
      },
      include: {
        blackoutPeriods: true
      }
    })

    return NextResponse.json(preferences)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating faculty preferences:", error)
    return NextResponse.json(
      { error: "Failed to update faculty preferences" },
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

    // Check if user can view these preferences
    const currentUser = session.user as any
    const canView = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canView) {
      return NextResponse.json(
        { error: "You don't have permission to view these preferences" },
        { status: 403 }
      )
    }

    // Get faculty preferences
    const preferences = await db.facultyPreferences.findUnique({
      where: { facultyId },
      include: {
        blackoutPeriods: true
      }
    })

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
        maxDailyHours: 8,
        maxWeeklyHours: 40,
        preferredTimeSlots: [],
        notificationSettings: {
          scheduleChanges: true,
          newAssignments: true,
          conflictAlerts: true,
          reminderNotifications: true,
          emailDigest: "daily",
        },
        blackoutPeriods: [],
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error("Error fetching faculty preferences:", error)
    return NextResponse.json(
      { error: "Failed to fetch faculty preferences" },
      { status: 500 }
    )
  }
}