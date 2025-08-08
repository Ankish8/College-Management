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
      .map(entry => {
        // Parse the date string properly to avoid timezone issues
        const dateStr = entry.date; // Should be in YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Create date in local timezone
        
        return {
          batchId: entry.batchId,
          subjectId: entry.subjectId,
          date: date,
          dateStr: dateStr, // Keep original string for comparison
          timetableEntryId: entry.id
        };
      })
    
    console.log('📅 Attendance API received queries:', attendanceQueries.map(q => ({
      entryId: q.timetableEntryId,
      dateStr: q.dateStr,
      dateFromJS: q.date.toISOString().split('T')[0],
      dateFromParsing: `${q.date.getFullYear()}-${String(q.date.getMonth() + 1).padStart(2, '0')}-${String(q.date.getDate()).padStart(2, '0')}`
    })));

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
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()), // Start of day in local timezone
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) // Start of next day
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

    console.log('🔍 Found attendance sessions:', attendanceSessions.map(s => ({
      batchId: s.batchId.slice(-8),
      subjectId: s.subjectId.slice(-8),
      date: s.date.toISOString().split('T')[0],
      recordCount: s.attendanceRecords.length,
      presentCount: s.attendanceRecords.filter(r => r.status === 'PRESENT').length,
      totalStudents: s.batch.students.length,
      sessionId: s.id.slice(-8)
    })));

    // Create a map for quick lookup using date strings for consistency
    const sessionMap = new Map()
    attendanceSessions.forEach(session => {
      const sessionDateStr = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
      const key = `${session.batchId}-${session.subjectId}-${sessionDateStr}`
      sessionMap.set(key, session)
    })

    console.log('🗺️ Session map contents:', Array.from(sessionMap.keys()));

    // Calculate attendance status for each timetable entry
    const attendanceStatus = attendanceQueries.map(({ timetableEntryId, batchId, subjectId, dateStr }) => {
      const key = `${batchId}-${subjectId}-${dateStr}`
      const session = sessionMap.get(key)
      
      console.log(`🔍 Looking up attendance for entry ${timetableEntryId.slice(-8)}:`, {
        key: `${batchId.slice(-8)}-${subjectId.slice(-8)}-${dateStr}`,
        found: !!session,
        recordCount: session?.attendanceRecords.length || 0
      });

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

      const result = {
        timetableEntryId,
        isMarked: session.attendanceRecords.length > 0, // Mark as attended if any records exist
        attendancePercentage,
        totalStudents,
        presentStudents
      }
      
      console.log(`📊 Returning attendance for ${timetableEntryId.slice(-8)}:`, {
        ...result,
        timetableEntryId: result.timetableEntryId.slice(-8)
      });
      
      return result;
    })

    console.log('📋 Final attendance status array length:', attendanceStatus.length);
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