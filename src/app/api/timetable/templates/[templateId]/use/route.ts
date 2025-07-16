import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

interface RouteParams {
  params: {
    templateId: string
  }
}

// POST /api/timetable/templates/[templateId]/use - Track template usage
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = params

    // Check if template exists
    const template = await db.timetableTemplateNew.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user has permission to use this template
    if (!template.isPublic && template.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update usage statistics
    const updatedTemplate = await db.timetableTemplateNew.update({
      where: { id: templateId },
      data: {
        timesUsed: { increment: 1 },
        lastUsed: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: "Template usage recorded",
      timesUsed: updatedTemplate.timesUsed
    })

  } catch (error) {
    console.error('Error recording template usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}