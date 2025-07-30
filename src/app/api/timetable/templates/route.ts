import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"
import { z } from "zod"

const templateFilterSchema = z.object({
  templateType: z.string().optional(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  templateData: z.string().min(1, "Template data is required"),
  templateType: z.string().optional(),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  targetBatches: z.array(z.string()).optional(),
  creditHours: z.number().min(0).optional(),
  subjectCount: z.number().min(0).optional(),
})

// This endpoint handles Puck.js visual templates, not recurring schedule templates

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
    if (rawParams.templateType) queryParams.templateType = rawParams.templateType
    
    // Convert numeric parameters
    if (rawParams.page) queryParams.page = parseInt(rawParams.page)
    if (rawParams.limit) queryParams.limit = parseInt(rawParams.limit)
    
    // Convert boolean parameters
    if (rawParams.isPublic) queryParams.isPublic = rawParams.isPublic === "true"
    if (rawParams.isDefault) queryParams.isDefault = rawParams.isDefault === "true"
    
    const filters = templateFilterSchema.parse(queryParams)
    
    const whereClause: any = {
      OR: [
        { createdBy: (session.user as any).id }, // User's own templates
        { isPublic: true }              // Public templates
      ]
    }
    
    // Apply additional filters
    if (filters.templateType) whereClause.templateType = filters.templateType
    if (filters.isDefault !== undefined) whereClause.isDefault = filters.isDefault

    const skip = (filters.page - 1) * filters.limit

    const [templates, totalCount] = await Promise.all([
      db.timetableTemplateNew.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              name: true,
              email: true,
            }
          },
          department: {
            select: {
              name: true,
              shortName: true,
            }
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit,
      }),
      db.timetableTemplateNew.count({ where: whereClause })
    ])

    const response = {
      templates,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching timetable templates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    // Get user's department for templates
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: { departmentId: true }
    })

    // If making default template, must be admin
    if (validatedData.isDefault && !isAdmin(session.user as any)) {
      return NextResponse.json(
        { error: "Only admins can create default templates" },
        { status: 403 }
      )
    }

    // Validate template data is valid JSON
    try {
      JSON.parse(validatedData.templateData)
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid template data format" },
        { status: 400 }
      )
    }

    // If setting as default, unset any existing default templates of the same type
    if (validatedData.isDefault) {
      await db.timetableTemplateNew.updateMany({
        where: {
          templateType: validatedData.templateType,
          isDefault: true
        },
        data: { isDefault: false }
      })
    }

    // Create the template
    const template = await db.timetableTemplateNew.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        templateData: validatedData.templateData,
        templateType: validatedData.templateType,
        isDefault: validatedData.isDefault,
        isPublic: validatedData.isPublic,
        departmentId: user?.departmentId,
        createdBy: (session.user as any).id,
        targetBatches: validatedData.targetBatches ? JSON.stringify(validatedData.targetBatches) : undefined,
        creditHours: validatedData.creditHours,
        subjectCount: validatedData.subjectCount,
        timesUsed: 0
      },
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          }
        },
        department: {
          select: {
            name: true,
            shortName: true,
          }
        },
      }
    })

    return NextResponse.json({
      template,
      success: true,
      message: "Template created successfully"
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating timetable template:", error)
    return NextResponse.json(
      { error: "Failed to create timetable template" },
      { status: 500 }
    )
  }
}