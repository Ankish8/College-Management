import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/utils/permissions"
import { z } from "zod"

interface RouteParams {
  params: {
    templateId: string
  }
}

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  description: z.string().optional(),
  templateData: z.string().min(1, "Template data is required").optional(),
  templateType: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  targetBatches: z.array(z.string()).optional(),
  creditHours: z.number().min(0).optional(),
  subjectCount: z.number().min(0).optional(),
})

// GET /api/timetable/templates/[templateId] - Get specific template
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = params

    const template = await db.timetableTemplateNew.findUnique({
      where: { id: templateId },
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

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user has permission to view this template
    if (!template.isPublic && template.createdBy !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ template })

  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/timetable/templates/[templateId] - Update template
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = params
    const body = await req.json()
    const validatedData = updateTemplateSchema.parse(body)

    // Check if template exists
    const existingTemplate = await db.timetableTemplateNew.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user has permission to update this template
    if (existingTemplate.createdBy !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If making default template, must be admin
    if (validatedData.isDefault && !isAdmin(session.user as any)) {
      return NextResponse.json(
        { error: "Only admins can create default templates" },
        { status: 403 }
      )
    }

    // Validate template data if provided
    if (validatedData.templateData) {
      try {
        JSON.parse(validatedData.templateData)
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid template data format" },
          { status: 400 }
        )
      }
    }

    // If setting as default, unset any existing default templates of the same type
    if (validatedData.isDefault) {
      await db.timetableTemplateNew.updateMany({
        where: {
          templateType: validatedData.templateType || existingTemplate.templateType,
          isDefault: true,
          NOT: { id: templateId }
        },
        data: { isDefault: false }
      })
    }

    // Update the template
    const updatedTemplate = await db.timetableTemplateNew.update({
      where: { id: templateId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.templateData && { templateData: validatedData.templateData }),
        ...(validatedData.templateType && { templateType: validatedData.templateType }),
        ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
        ...(validatedData.isPublic !== undefined && { isPublic: validatedData.isPublic }),
        ...(validatedData.targetBatches && { targetBatches: JSON.stringify(validatedData.targetBatches) }),
        ...(validatedData.creditHours !== undefined && { creditHours: validatedData.creditHours }),
        ...(validatedData.subjectCount !== undefined && { subjectCount: validatedData.subjectCount }),
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
      template: updatedTemplate,
      success: true,
      message: "Template updated successfully"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/timetable/templates/[templateId] - Delete template
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = params

    // Check if template exists
    const existingTemplate = await db.timetableTemplateNew.findUnique({
      where: { id: templateId }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user has permission to delete this template
    if (existingTemplate.createdBy !== session.user.id && !isAdmin(session.user as any)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the template
    await db.timetableTemplateNew.delete({
      where: { id: templateId }
    })

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully"
    })

  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}