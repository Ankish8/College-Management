// Debug script to replicate the exact API query
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAPIQuery() {
  try {
    console.log('🔍 Replicating exact API query...');
    
    // Simulate the exact same query the API uses
    const attendanceQueries = [
      {
        batchId: 'cmdyt7d8f0005ng6fegxwrq4b',
        subjectId: 'cmdyt7jx30007ngafndajz1af',
        date: new Date(2025, 7, 6), // Aug 6 (month is 0-indexed)
        dateStr: '2025-08-06'
      },
      {
        batchId: 'cmdyt7d8f0005ng6fegxwrq4b',
        subjectId: 'cmdyt7jx30007ngafndajz1af',
        date: new Date(2025, 7, 7), // Aug 7 (month is 0-indexed)
        dateStr: '2025-08-07'
      }
    ];

    console.log('📋 Query parameters:');
    attendanceQueries.forEach(q => {
      console.log(`  - ${q.dateStr}: ${q.date.toISOString().split('T')[0]} (${q.date.toDateString()})`);
    });

    // Run the exact same Prisma query as the API
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
    });

    console.log('\n📊 API Query Results:');
    attendanceSessions.forEach((session, index) => {
      const sessionDateStr = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
      
      console.log(`\n--- Session ${index + 1} ---`);
      console.log(`📅 Date in DB: ${session.date.toISOString().split('T')[0]}`);
      console.log(`📅 Date formatted: ${sessionDateStr}`);
      console.log(`🆔 Session ID: ${session.id}`);
      console.log(`📈 Total records: ${session.attendanceRecords.length}`);
      console.log(`👥 Total students in batch: ${session.batch.students.length}`);
      
      const presentStudents = session.attendanceRecords.filter(r => r.status === 'PRESENT').length;
      const attendancePercentage = session.batch.students.length > 0 
        ? Math.round((presentStudents / session.batch.students.length) * 100)
        : 0;
        
      console.log(`✅ Present: ${presentStudents}`);
      console.log(`📊 Percentage: ${attendancePercentage}%`);
    });

    // Create session map like the API does
    const sessionMap = new Map();
    attendanceSessions.forEach(session => {
      const sessionDateStr = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
      const key = `${session.batchId}-${session.subjectId}-${sessionDateStr}`;
      sessionMap.set(key, session);
    });

    console.log('\n🗺️ Session Map:');
    for (const [key, session] of sessionMap.entries()) {
      const presentStudents = session.attendanceRecords.filter(r => r.status === 'PRESENT').length;
      console.log(`  ${key} → ${presentStudents}/${session.batch.students.length} present`);
    }

    // Test lookup for both dates
    console.log('\n🔍 Testing Lookups:');
    attendanceQueries.forEach(({ batchId, subjectId, dateStr, date }) => {
      const key = `${batchId}-${subjectId}-${dateStr}`;
      const session = sessionMap.get(key);
      
      if (session) {
        const presentStudents = session.attendanceRecords.filter(r => r.status === 'PRESENT').length;
        const totalStudents = session.batch.students.length;
        const attendancePercentage = totalStudents > 0 
          ? Math.round((presentStudents / totalStudents) * 100)
          : 0;
          
        console.log(`  ${dateStr}: Found session with ${presentStudents}/${totalStudents} (${attendancePercentage}%)`);
      } else {
        console.log(`  ${dateStr}: No session found for key: ${key}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPIQuery();