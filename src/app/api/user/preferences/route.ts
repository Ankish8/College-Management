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

// Default preferences for new users
const defaultPreferences = {
  viewModes: {
    batches: "cards" as const,
    subjects: "cards" as const,
    faculty: "cards" as const,
    students: "cards" as const,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from session (it might be in different places depending on auth setup)
    const userId = (session.user as any).id || session.user.email
    
    if (!userId) {
      console.error("No user ID found in session:", session.user)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    console.log("Session user ID:", userId)
    
    // Find user by ID or email as fallback
    let user = null
    if (typeof userId === 'string' && userId.includes('@')) {
      // If userId looks like an email, search by email
      user = await db.user.findUnique({
        where: { email: userId },
        select: { id: true, email: true }
      })
    } else {
      // Search by ID
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      })
    }
    
    console.log("User found in DB:", user)
    
    if (!user) {
      console.log("User not found in database, returning default preferences")
      return NextResponse.json({
        viewModes: defaultPreferences.viewModes,
        updatedAt: new Date().toISOString(),
      })
    }

    // Try to find existing preferences using the actual user ID from DB
    let preferences = await db.userPreferences.findUnique({
      where: { userId: user.id },
      select: {
        viewModes: true,
        updatedAt: true,
      }
    })

    // If no preferences exist, create default ones
    if (!preferences) {
      try {
        preferences = await db.userPreferences.create({
          data: {
            userId: user.id,
            viewModes: defaultPreferences.viewModes,
          },
          select: {
            viewModes: true,
            updatedAt: true,
          }
        })
      } catch (createError) {
        console.error("Error creating user preferences:", createError)
        // If creation fails (e.g., user doesn't exist), return default preferences
        return NextResponse.json({
          viewModes: defaultPreferences.viewModes,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // Ensure preferences have all required keys with defaults
    const mergedPreferences = {
      viewModes: {
        ...defaultPreferences.viewModes,
        ...(preferences.viewModes as any || {}),
      },
      updatedAt: preferences.updatedAt,
    }

    return NextResponse.json(mergedPreferences)
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    // Return default preferences as fallback
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

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email
    
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Find user by ID or email as fallback
    let user = null
    if (typeof userId === 'string' && userId.includes('@')) {
      user = await db.user.findUnique({
        where: { email: userId },
        select: { id: true }
      })
    } else {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)

    // Get current preferences or create default ones
    let currentPreferences = await db.userPreferences.findUnique({
      where: { userId: user.id },
      select: { viewModes: true }
    })

    let currentViewModes = currentPreferences?.viewModes as any || defaultPreferences.viewModes

    // Merge new preferences with existing ones
    const updatedViewModes = {
      ...currentViewModes,
      ...validatedData.viewModes,
    }

    // Upsert preferences
    const preferences = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        viewModes: updatedViewModes,
      },
      update: {
        viewModes: updatedViewModes,
      },
      select: {
        viewModes: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(preferences)
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

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email
    
    if (!userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Find user by ID or email as fallback
    let user = null
    if (typeof userId === 'string' && userId.includes('@')) {
      user = await db.user.findUnique({
        where: { email: userId },
        select: { id: true }
      })
    } else {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate that we have a page and viewMode
    const pageSchema = z.object({
      page: z.string().min(1),
      viewMode: viewModeSchema,
    })
    
    const { page, viewMode } = pageSchema.parse(body)

    // Get current preferences
    let currentPreferences = await db.userPreferences.findUnique({
      where: { userId: user.id },
      select: { viewModes: true }
    })

    let currentViewModes = currentPreferences?.viewModes as any || defaultPreferences.viewModes

    // Update specific page preference
    const updatedViewModes = {
      ...currentViewModes,
      [page]: viewMode,
    }

    // Upsert preferences
    const preferences = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        viewModes: updatedViewModes,
      },
      update: {
        viewModes: updatedViewModes,
      },
      select: {
        viewModes: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(preferences)
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