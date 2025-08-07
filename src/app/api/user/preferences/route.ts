import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

// Validation schema for view modes
const viewModeSchema = z.enum(["cards", "table"])

// Validation schema for updating preferences
const updatePreferencesSchema = z.object({
  viewModes: z.record(z.string(), viewModeSchema).optional(),
})

// Default preferences for new users - ALWAYS TABLE VIEW
const defaultPreferences = {
  viewModes: {
    batches: "table" as const,
    subjects: "table" as const,
    faculty: "table" as const,
    students: "table" as const,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (process.env.DEBUG_USER_PREFERENCES === 'true') {
      console.log("GET preferences - returning defaults (no user_preferences table)")
    }
    return NextResponse.json({
      viewModes: defaultPreferences.viewModes,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return NextResponse.json({
      viewModes: defaultPreferences.viewModes,
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)

    console.log("PUT preferences - returning defaults (no user_preferences table)")
    const updatedViewModes = {
      ...defaultPreferences.viewModes,
      ...validatedData.viewModes,
    }

    return NextResponse.json({
      viewModes: updatedViewModes,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating user preferences:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate that we have a page and viewMode
    const pageSchema = z.object({
      page: z.string().min(1),
      viewMode: viewModeSchema,
    })
    
    const { page, viewMode } = pageSchema.parse(body)

    console.log(`PATCH preferences - setting ${page} to ${viewMode} (no user_preferences table)`)
    
    const updatedViewModes = {
      ...defaultPreferences.viewModes,
      [page]: viewMode,
    }

    return NextResponse.json({
      viewModes: updatedViewModes,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating user preference:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}