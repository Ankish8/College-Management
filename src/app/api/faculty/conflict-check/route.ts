import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, isFaculty } from "@/lib/utils/permissions"

interface ConflictCheckRequest {
  newFacultyId: string
  subjectIds: string[]
  effectiveDate: string
  endDate?: string
  replacementType: 'full' | 'partial' | 'temporary'
}

interface ConflictInfo {
  hasConflicts: boolean
  conflictDetails: string[]
  warnings: string[]
  workloadImpact: {
    currentCredits: number
    newCredits: number
    percentageIncrease: number
  }
  timeSlotConflicts: Array<{
    day: string
    timeSlot: string
    conflictingSubject: string
    conflictingBatch: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (!isAdmin(session.user as any) && !isFaculty(session.user as any))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: ConflictCheckRequest = await request.json()
    const { newFacultyId, subjectIds, effectiveDate, endDate, replacementType } = body

    if (!newFacultyId || !subjectIds || subjectIds.length === 0 || !effectiveDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Validate date format and logic
    const startDate = new Date(effectiveDate)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid effective date format" },
        { status: 400 }
      )
    }

    if (endDate) {
      const endDateObj = new Date(endDate)
      if (isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date format" },
          { status: 400 }
        )
      }
      
      if (endDateObj <= startDate) {
        return NextResponse.json(
          { error: "End date must be after effective date" },
          { status: 400 }
        )
      }
    }

    // Check if new faculty exists and is active
    const newFacultyExists = await db.user.findFirst({
      where: { 
        id: newFacultyId,
        role: "FACULTY",
        status: "ACTIVE"
      }
    })

    if (!newFacultyExists) {
      return NextResponse.json(
        { error: "Selected faculty is not available or not active" },
        { status: 404 }
      )
    }

    // Get new faculty details with current workload
    const newFaculty = await db.user.findUnique({
      where: { id: newFacultyId },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        primarySubjects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            credits: true
          }
        },
        coFacultySubjects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            credits: true
          }
        }
      }
    })

    if (!newFaculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      )
    }

    // Get subjects to be transferred with department validation
    const subjectsToTransfer = await db.subject.findMany({
      where: {
        id: { in: subjectIds },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        credits: true,
        primaryFacultyId: true,
        coFacultyId: true,
        batch: {
          select: {
            id: true,
            name: true,
            program: {
              select: {
                departmentId: true
              }
            }
          }
        }
      }
    })

    // Validate all subjects exist and are active
    if (subjectsToTransfer.length !== subjectIds.length) {
      const foundIds = subjectsToTransfer.map(s => s.id)
      const missingIds = subjectIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Some subjects not found or inactive: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's department for boundary checking
    const currentUser = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: { departmentId: true }
    })

    if (!currentUser?.departmentId) {
      return NextResponse.json(
        { error: "User department not found" },
        { status: 400 }
      )
    }

    // Validate all subjects belong to the same department
    const subjectDepartments = subjectsToTransfer.map(s => s.batch.program.departmentId)
    const invalidSubjects = subjectsToTransfer.filter(s => s.batch.program.departmentId !== currentUser.departmentId)
    
    if (invalidSubjects.length > 0) {
      return NextResponse.json(
        { error: "Cannot transfer subjects from different departments" },
        { status: 403 }
      )
    }

    // Validate new faculty belongs to the same department
    if (newFaculty.department?.id !== currentUser.departmentId) {
      return NextResponse.json(
        { error: "Cannot assign faculty from different department" },
        { status: 403 }
      )
    }

    // Calculate current workload
    const currentCredits = newFaculty.primarySubjects.reduce((sum, s) => sum + s.credits, 0) +
                          newFaculty.coFacultySubjects.reduce((sum, s) => sum + s.credits, 0)

    // Calculate additional workload from transfer
    const additionalCredits = subjectsToTransfer.reduce((sum, s) => sum + s.credits, 0)
    const newCredits = currentCredits + additionalCredits
    const percentageIncrease = currentCredits > 0 ? ((additionalCredits / currentCredits) * 100) : 100

    // Check for time slot conflicts
    const conflictStartDate = new Date(effectiveDate)
    const conflictEndDate = endDate ? new Date(endDate) : null
    
    // Get existing timetable entries for the new faculty during the transfer period
    const existingEntries = await db.timetableEntry.findMany({
      where: {
        facultyId: newFacultyId,
        isActive: true,
        OR: [
          // For specific date entries
          {
            date: {
              gte: conflictStartDate,
              ...(conflictEndDate && { lte: conflictEndDate })
            }
          },
          // For recurring entries (no specific date)
          {
            date: null
          }
        ]
      },
      select: {
        id: true,
        dayOfWeek: true,
        date: true,
        timeSlot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        batch: {
          select: {
            name: true
          }
        }
      }
    })

    // Get timetable entries for subjects being transferred to check for time conflicts
    const transferSubjectEntries = await db.timetableEntry.findMany({
      where: {
        subjectId: { in: subjectIds },
        isActive: true
      },
      select: {
        id: true,
        dayOfWeek: true,
        date: true,
        timeSlot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        batch: {
          select: {
            name: true
          }
        }
      }
    })

    // Find time slot conflicts
    const timeSlotConflicts: Array<{
      day: string
      timeSlot: string
      conflictingSubject: string
      conflictingBatch: string
    }> = []

    for (const transferEntry of transferSubjectEntries) {
      for (const existingEntry of existingEntries) {
        // Check if entries conflict (same day and time slot)
        if (transferEntry.dayOfWeek === existingEntry.dayOfWeek &&
            transferEntry.timeSlot.id === existingEntry.timeSlot.id) {
          
          // For dated entries, check if dates overlap
          if (transferEntry.date && existingEntry.date) {
            const transferDate = new Date(transferEntry.date)
            const existingDate = new Date(existingEntry.date)
            
            if (transferDate.getTime() === existingDate.getTime()) {
              timeSlotConflicts.push({
                day: transferEntry.dayOfWeek,
                timeSlot: transferEntry.timeSlot.name,
                conflictingSubject: existingEntry.subject.code + ' - ' + existingEntry.subject.name,
                conflictingBatch: existingEntry.batch.name
              })
            }
          } else {
            // For recurring entries, there's a conflict
            timeSlotConflicts.push({
              day: transferEntry.dayOfWeek,
              timeSlot: transferEntry.timeSlot.name,
              conflictingSubject: existingEntry.subject.code + ' - ' + existingEntry.subject.name,
              conflictingBatch: existingEntry.batch.name
            })
          }
        }
      }
    }

    // Get department settings for workload limits
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: { 
        departmentId: true,
        department: {
          select: {
            settings: {
              select: {
                maxFacultyCredits: true,
                coFacultyWeight: true
              }
            }
          }
        }
      }
    })

    const maxCredits = user?.department?.settings?.maxFacultyCredits || 30
    const workloadThreshold = maxCredits * 0.8 // 80% of max as warning threshold

    // Determine conflicts and warnings
    const conflictDetails: string[] = []
    const warnings: string[] = []

    // Time slot conflicts
    if (timeSlotConflicts.length > 0) {
      conflictDetails.push(`${newFaculty.name} has ${timeSlotConflicts.length} time slot conflicts`)
      timeSlotConflicts.forEach(conflict => {
        conflictDetails.push(`${conflict.day} ${conflict.timeSlot}: ${conflict.conflictingSubject} (${conflict.conflictingBatch})`)
      })
    }

    // Workload conflicts
    if (newCredits > maxCredits) {
      conflictDetails.push(`${newFaculty.name} workload will exceed maximum limit of ${maxCredits} credits`)
    } else if (newCredits > workloadThreshold) {
      warnings.push(`${newFaculty.name} workload will be ${newCredits} credits (${percentageIncrease.toFixed(1)}% increase)`)
    }

    // High percentage increase warning
    if (percentageIncrease > 50 && newCredits <= maxCredits) {
      warnings.push(`Workload increase of ${percentageIncrease.toFixed(1)}% exceeds recommended 50% threshold`)
    }

    // Temporary replacement warnings
    if (replacementType === 'temporary' && additionalCredits > 10) {
      warnings.push(`Temporary assignment of ${additionalCredits} credits may impact ${newFaculty.name}'s regular schedule`)
    }

    const conflictInfo: ConflictInfo = {
      hasConflicts: conflictDetails.length > 0,
      conflictDetails,
      warnings,
      workloadImpact: {
        currentCredits,
        newCredits,
        percentageIncrease
      },
      timeSlotConflicts
    }

    return NextResponse.json(conflictInfo)

  } catch (error) {
    console.error("Error checking conflicts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}