const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAttendanceLogic() {
  try {
    // Get the exact timetable entries that should show attendance
    console.log('🔍 Getting timetable entries for Aug 6, 2025...')
    
    const entries = await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: 'WEDNESDAY',
        date: {
          gte: new Date('2025-08-06T00:00:00Z'),
          lt: new Date('2025-08-07T00:00:00Z')
        }
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } }
      }
    })
    
    console.log(`Found ${entries.length} entries:`)
    entries.forEach(entry => {
      const eventId = `${entry.id}-2025-08-06` // Calendar event ID format
      console.log(`- Event ID: ${eventId}`)
      console.log(`  Entry ID: ${entry.id}`)
      console.log(`  Batch: ${entry.batch?.name} (${entry.batchId})`)
      console.log(`  Subject: ${entry.subject?.name} (${entry.subjectId})`)
      console.log('')
    })
    
    // Check for attendance sessions on the same date
    console.log('📊 Checking attendance sessions...')
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        date: {
          gte: new Date('2025-08-06T00:00:00Z'),
          lt: new Date('2025-08-07T00:00:00Z')
        }
      },
      include: {
        batch: { select: { name: true } },
        subject: { select: { name: true } },
        attendanceRecords: { select: { status: true } }
      }
    })
    
    console.log(`Found ${sessions.length} attendance sessions:`)
    sessions.forEach(session => {
      const totalStudents = 25 // Assuming from earlier data
      const presentStudents = session.attendanceRecords.filter(r => r.status === 'PRESENT').length
      const percentage = Math.round((presentStudents / totalStudents) * 100)
      
      console.log(`- Batch: ${session.batch.name}, Subject: ${session.subject.name}`)
      console.log(`  Records: ${session.attendanceRecords.length}, Present: ${presentStudents}/${totalStudents} (${percentage}%)`)
    })
    
    // Test the API logic manually
    console.log('\n🧪 Testing API logic...')
    
    // Simulate the API call format
    const testEntries = entries.map(entry => ({
      id: `${entry.id}-2025-08-06`,
      batchId: entry.batchId,
      subjectId: entry.subjectId,
      date: '2025-08-06T00:00:00.000Z'
    }))
    
    console.log('Test entries for API:', testEntries)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAttendanceLogic()