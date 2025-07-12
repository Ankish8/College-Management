import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

const updateSettingsSchema = z.object({
  creditHoursRatio: z.number().min(1).max(50).optional(),
  defaultExamTypes: z.array(z.string()).optional(),
  defaultSubjectTypes: z.array(z.string()).optional(),
  customExamTypes: z.array(z.string()).optional(),
  customSubjectTypes: z.array(z.string()).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user)) {
      console.log("Unauthorized access attempt:", session?.user?.role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Fetching settings for user:", session.user.id)

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        department: {
          include: {
            settings: true
          }
        }
      }
    })

    console.log("User found:", user ? "Yes" : "No", "Department:", user?.department ? "Yes" : "No")

    if (!user?.department) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Get or create department settings
    let settings = user.department.settings
    console.log("Existing settings:", settings ? "Found" : "Not found")

    if (!settings) {
      console.log("Creating new department settings for department:", user.department.id)
      // Create default settings if they don't exist
      try {
        settings = await db.departmentSettings.create({
          data: {
            departmentId: user.department.id,
            creditHoursRatio: 15,
            defaultExamTypes: ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
            defaultSubjectTypes: ["CORE", "ELECTIVE"],
            customExamTypes: [],
            customSubjectTypes: [],
          }
        })
        console.log("Created settings:", settings.id)
      } catch (createError) {
        console.error("Error creating department settings:", createError)
        throw createError
      }
    }

    // Return settings with available options
    const response = {
      creditHoursRatio: settings.creditHoursRatio,
      defaultExamTypes: settings.defaultExamTypes as string[] || ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
      defaultSubjectTypes: settings.defaultSubjectTypes as string[] || ["CORE", "ELECTIVE"],
      customExamTypes: settings.customExamTypes as string[] || [],
      customSubjectTypes: settings.customSubjectTypes as string[] || [],
    }

    console.log("Returning settings response")
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching subject settings:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        department: {
          include: {
            settings: true
          }
        }
      }
    })

    if (!user?.department) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    let settings = user.department.settings

    if (!settings) {
      // Create new settings
      settings = await db.departmentSettings.create({
        data: {
          departmentId: user.department.id,
          creditHoursRatio: validatedData.creditHoursRatio || 15,
          defaultExamTypes: validatedData.defaultExamTypes || ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
          defaultSubjectTypes: validatedData.defaultSubjectTypes || ["CORE", "ELECTIVE"],
          customExamTypes: validatedData.customExamTypes || [],
          customSubjectTypes: validatedData.customSubjectTypes || [],
        }
      })
    } else {
      // Update existing settings
      const updateData: Record<string, unknown> = {}
      
      if (validatedData.creditHoursRatio !== undefined) {
        updateData.creditHoursRatio = validatedData.creditHoursRatio
      }
      
      if (validatedData.defaultExamTypes !== undefined) {
        updateData.defaultExamTypes = validatedData.defaultExamTypes
      }
      
      if (validatedData.defaultSubjectTypes !== undefined) {
        updateData.defaultSubjectTypes = validatedData.defaultSubjectTypes
      }
      
      if (validatedData.customExamTypes !== undefined) {
        updateData.customExamTypes = validatedData.customExamTypes
      }
      
      if (validatedData.customSubjectTypes !== undefined) {
        updateData.customSubjectTypes = validatedData.customSubjectTypes
      }

      settings = await db.departmentSettings.update({
        where: { id: settings.id },
        data: updateData
      })
    }

    const response = {
      creditHoursRatio: settings.creditHoursRatio,
      defaultExamTypes: settings.defaultExamTypes as string[] || ["THEORY", "PRACTICAL", "JURY", "PROJECT", "VIVA"],
      defaultSubjectTypes: settings.defaultSubjectTypes as string[] || ["CORE", "ELECTIVE"],
      customExamTypes: settings.customExamTypes as string[] || [],
      customSubjectTypes: settings.customSubjectTypes as string[] || [],
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating subject settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}