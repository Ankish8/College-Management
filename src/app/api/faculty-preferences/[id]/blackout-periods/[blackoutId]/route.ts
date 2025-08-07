import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isFaculty, isAdmin } from "@/lib/utils/permissions"

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; blackoutId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id: facultyId, blackoutId } = params

    // Check if user can delete blackout periods for this faculty
    const currentUser = session.user as any
    const canDelete = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete blackout periods for this faculty" },
        { status: 403 }
      )
    }

    // Verify the blackout period exists and belongs to the faculty
    const blackoutPeriod = await db.facultyBlackoutPeriod.findFirst({
      where: {
        id: blackoutId,
        facultyPreferences: {
          facultyId
        }
      }
    })

    if (!blackoutPeriod) {
      return NextResponse.json(
        { error: "Blackout period not found" },
        { status: 404 }
      )
    }

    // Delete the blackout period
    await db.facultyBlackoutPeriod.delete({
      where: { id: blackoutId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting blackout period:", error)
    return NextResponse.json(
      { error: "Failed to delete blackout period" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string; blackoutId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id: facultyId, blackoutId } = params
    const body = await request.json()

    // Check if user can update blackout periods for this faculty
    const currentUser = session.user as any
    const canUpdate = isAdmin(currentUser) || (isFaculty(currentUser) && currentUser.id === facultyId)

    if (!canUpdate) {
      return NextResponse.json(
        { error: "You don't have permission to update blackout periods for this faculty" },
        { status: 403 }
      )
    }

    // Verify the blackout period exists and belongs to the faculty
    const blackoutPeriod = await db.facultyBlackoutPeriod.findFirst({
      where: {
        id: blackoutId,
        facultyPreferences: {
          facultyId
        }
      }
    })

    if (!blackoutPeriod) {
      return NextResponse.json(
        { error: "Blackout period not found" },
        { status: 404 }
      )
    }

    // Update the blackout period
    const updatedBlackoutPeriod = await db.facultyBlackoutPeriod.update({
      where: { id: blackoutId },
      data: {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        reason: body.reason,
        isRecurring: body.isRecurring,
      }
    })

    return NextResponse.json(updatedBlackoutPeriod)
  } catch (error) {
    console.error("Error updating blackout period:", error)
    return NextResponse.json(
      { error: "Failed to update blackout period" },
      { status: 500 }
    )
  }
}