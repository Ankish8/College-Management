import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { timetableEntries } = body

    if (!Array.isArray(timetableEntries) || timetableEntries.length === 0) {
      return NextResponse.json({ error: 'Invalid timetable entries' }, { status: 400 })
    }

    // Extract unique combinations of batchId, subjectId, and date for querying
    const attendanceQueries = timetableEntries
      .filter(entry => entry.batchId && entry.subjectId && entry.date)
      .map(entry => ({
        batchId: entry.batchId,
        subjectId: entry.subjectId,
        date: new Date(entry.date),
        timetableEntryId: entry.id
      }))

    if (attendanceQueries.length === 0) {
      return NextResponse.json({ attendanceStatus: [] })
    }

    // Batch query for attendance sessions and their records
    const attendanceSessions = await prisma.attendanceSession.findMany({
      where: {
        OR: attendanceQueries.map(({ batchId, subjectId, date }) => ({
          batchId,
          subjectId,
          date: {
            gte: new Date(date.toDateString()), // Start of day
            lt: new Date(new Date(date.toDateString()).getTime() + 24 * 60 * 60 * 1000) // End of day
          }
        }))
      },
      include: {
        attendanceRecords: {
          select: {
            status: true,
            studentId: true
          }
        },
        batch: {
          select: {
            students: {
              select: {
                id: true
              }
            }
          }
        }
      }
    })

    // Create a map for quick lookup
    const sessionMap = new Map()
    attendanceSessions.forEach(session => {
      const key = `${session.batchId}-${session.subjectId}-${session.date.toDateString()}`
      sessionMap.set(key, session)
    })

    // Calculate attendance status for each timetable entry
    const attendanceStatus = attendanceQueries.map(({ timetableEntryId, batchId, subjectId, date }) => {
      const key = `${batchId}-${subjectId}-${date.toDateString()}`
      const session = sessionMap.get(key)

      if (!session) {
        return {
          timetableEntryId,
          isMarked: false,
          attendancePercentage: 0,
          totalStudents: 0,
          presentStudents: 0
        }
      }

      // Calculate attendance stats
      const totalStudents = session.batch.students.length
      const presentStudents = session.attendanceRecords.filter(
        (record: any) => record.status === 'PRESENT'
      ).length
      const attendancePercentage = totalStudents > 0 
        ? Math.round((presentStudents / totalStudents) * 100)
        : 0

      return {
        timetableEntryId,
        isMarked: session.attendanceRecords.length > 0, // Mark as attended if any records exist
        attendancePercentage,
        totalStudents,
        presentStudents
      }
    })

    return NextResponse.json({ attendanceStatus })

  } catch (error) {
    console.error('Error fetching attendance status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance status' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')
    const subjectId = searchParams.get('subjectId')
    const date = searchParams.get('date')

    if (!batchId || !subjectId || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const attendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        batchId,
        subjectId,
        date: {
          gte: new Date(new Date(date).toDateString()),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        attendanceRecords: {
          select: {
            status: true,
            studentId: true
          }
        },
        batch: {
          select: {
            students: {
              select: {
                id: true
              }
            }
          }
        }
      }
    })

    if (!attendanceSession) {
      return NextResponse.json({
        isMarked: false,
        attendancePercentage: 0,
        totalStudents: 0,
        presentStudents: 0
      })
    }

    // Calculate attendance stats
    const totalStudents = attendanceSession.batch.students.length
    const presentStudents = attendanceSession.attendanceRecords.filter(
      (record: any) => record.status === 'PRESENT'
    ).length
    const attendancePercentage = totalStudents > 0 
      ? Math.round((presentStudents / totalStudents) * 100)
      : 0

    return NextResponse.json({
      isMarked: attendanceSession.attendanceRecords.length > 0,
      attendancePercentage,
      totalStudents,
      presentStudents
    })

  } catch (error) {
    console.error('Error fetching single attendance status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance status' },
      { status: 500 }
    )
  }
}