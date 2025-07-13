import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateDepartmentSettingsSchema = z.object({
  // Existing faculty settings
  creditHoursRatio: z.number().min(1).max(30).optional(),
  maxFacultyCredits: z.number().min(1).max(50).optional(),
  coFacultyWeight: z.number().min(0).max(1).optional(),
  
  // Timetable settings
  schedulingMode: z.enum(["MODULE_BASED", "WEEKLY_RECURRING"]).optional(),
  autoCreateAttendance: z.boolean().optional(),
  
  // Display settings
  displaySettings: z.any().optional(),
  
  // JSON fields for complex configurations
  breakConfiguration: z.any().optional(),
  classTypes: z.any().optional(),
  moduleDurations: z.any().optional(),
  conflictRules: z.any().optional(),
})

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: departmentId } = await params
    const body = await request.json()
    const validatedData = updateDepartmentSettingsSchema.parse(body)

    // Verify department exists and user has access
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: {
        department: true
      }
    })

    if (!user?.department || user.department.id !== departmentId) {
      return NextResponse.json(
        { error: "Department not found or access denied" },
        { status: 403 }
      )
    }

    // Prepare update data with only defined fields
    const updateData: any = {}
    
    // Add faculty settings if provided
    if (validatedData.creditHoursRatio !== undefined) {
      updateData.creditHoursRatio = validatedData.creditHoursRatio
    }
    if (validatedData.maxFacultyCredits !== undefined) {
      updateData.maxFacultyCredits = validatedData.maxFacultyCredits
    }
    if (validatedData.coFacultyWeight !== undefined) {
      updateData.coFacultyWeight = validatedData.coFacultyWeight
    }
    
    // Add timetable settings if provided
    if (validatedData.schedulingMode !== undefined) {
      updateData.schedulingMode = validatedData.schedulingMode
    }
    if (validatedData.autoCreateAttendance !== undefined) {
      updateData.autoCreateAttendance = validatedData.autoCreateAttendance
    }
    if (validatedData.displaySettings !== undefined) {
      updateData.displaySettings = validatedData.displaySettings
    }
    if (validatedData.breakConfiguration !== undefined) {
      updateData.breakConfiguration = validatedData.breakConfiguration
    }
    if (validatedData.classTypes !== undefined) {
      updateData.classTypes = validatedData.classTypes
    }
    if (validatedData.moduleDurations !== undefined) {
      updateData.moduledurations = validatedData.moduleDurations
    }
    if (validatedData.conflictRules !== undefined) {
      updateData.conflictRules = validatedData.conflictRules
    }

    // Update or create department settings
    const settings = await db.departmentSettings.upsert({
      where: { departmentId },
      update: updateData,
      create: {
        departmentId,
        ...updateData,
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating department settings:", error)
    return NextResponse.json(
      { error: "Failed to update department settings" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user as any)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: departmentId } = await params

    // Verify department exists and user has access
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      include: {
        department: true
      }
    })

    if (!user?.department || user.department.id !== departmentId) {
      return NextResponse.json(
        { error: "Department not found or access denied" },
        { status: 403 }
      )
    }

    // Get department settings
    const settings = await db.departmentSettings.findUnique({
      where: { departmentId }
    })

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        creditHoursRatio: 15,
        maxFacultyCredits: 30,
        coFacultyWeight: 0.5,
        schedulingMode: "MODULE_BASED",
        autoCreateAttendance: true,
        displaySettings: {
          timeFormat: "12hour",
          showWeekends: false,
          classStartTime: "10:00",
          classEndTime: "16:00",
          defaultSlotDuration: 90,
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        },
        breakConfiguration: {
          lunchBreak: {
            enabled: true,
            startTime: "12:30",
            endTime: "13:15",
            name: "Lunch Break",
          },
          shortBreaks: [],
        },
        classTypes: [
          { id: "regular", name: "Regular", description: "Standard classes", isDefault: true },
          { id: "makeup", name: "Makeup", description: "Makeup classes for missed sessions", isDefault: false },
          { id: "extra", name: "Extra", description: "Additional classes", isDefault: false },
          { id: "special", name: "Special", description: "Special events and workshops", isDefault: false },
        ],
        moduleDurations: [
          { id: "full_semester", name: "Full Semester", isCustom: false },
          { id: "4_weeks", name: "4 Weeks", weeks: 4, isCustom: false },
          { id: "6_weeks", name: "6 Weeks", weeks: 6, isCustom: false },
          { id: "8_weeks", name: "8 Weeks", weeks: 8, isCustom: false },
        ],
        conflictRules: {
          allowFacultyOverlap: false,
          allowBatchOverlap: false,
          requireApprovalForOverride: true,
          autoResolveConflicts: false,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching department settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch department settings" },
      { status: 500 }
    )
  }
}