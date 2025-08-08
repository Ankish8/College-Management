// Simple debug for Thursday attendance session
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugThursdaySimple() {
  try {
    console.log('🔍 DEBUG: Thursday Aug 7 attendance session\n');
    
    // Get Summer Internship subject
    const summerInternship = await prisma.subject.findFirst({
      where: { code: 'BDES5-SI' }
    });
    
    if (!summerInternship) {
      console.log('❌ Summer Internship not found');
      return;
    }
    
    console.log(`📚 Subject: ${summerInternship.name} (${summerInternship.id})`);
    
    // Check for attendance sessions for all Summer Internship dates
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        subjectId: summerInternship.id
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\n📅 All Summer Internship attendance sessions (${sessions.length}):`);
    sessions.forEach((session, i) => {
      const dateStr = session.date.toISOString().split('T')[0];
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][session.date.getDay()];
      console.log(`  ${i+1}. ${dayName} ${dateStr} - Status: ${session.status} (ID: ${session.id})`);
    });
    
    // Check specifically for Thursday Aug 7
    const thursdayDate = new Date('2025-08-07');
    const thursdaySession = sessions.find(s => 
      s.date.toISOString().split('T')[0] === '2025-08-07'
    );
    
    if (thursdaySession) {
      console.log(`\n✅ Thursday session exists: ${thursdaySession.id}`);
      console.log(`   Status: ${thursdaySession.status}`);
      console.log(`   Created by: ${thursdaySession.createdBy}`);
      
      // Check attendance records for Thursday
      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          sessionId: thursdaySession.id
        }
      });
      
      console.log(`   Attendance records: ${attendanceRecords.length}`);
      if (attendanceRecords.length > 0) {
        console.log(`   Records:`, attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status })));
      }
    } else {
      console.log('\n❌ No Thursday Aug 7 session found!');
      console.log('   This explains why attendance marking is not working');
      
      // Get the timetable entry to create the session
      const thursdayEntry = await prisma.timetableEntry.findFirst({
        where: {
          subjectId: summerInternship.id,
          date: new Date('2025-08-07'),
          isActive: true
        }
      });
      
      if (thursdayEntry) {
        console.log('\n🔧 Creating missing Thursday attendance session...');
        
        const newSession = await prisma.attendanceSession.create({
          data: {
            subjectId: summerInternship.id,
            batchId: thursdayEntry.batchId,
            date: new Date('2025-08-07'),
            startTime: '09:30:00',
            endTime: '10:30:00',
            status: 'SCHEDULED',
            createdBy: thursdayEntry.facultyId || summerInternship.primaryFacultyId
          }
        });
        
        console.log(`   ✅ Created session: ${newSession.id}`);
        console.log(`      Date: ${newSession.date.toISOString().split('T')[0]}`);
        console.log(`      Status: ${newSession.status}`);
        
        console.log('\n🎯 Thursday attendance marking should now work!');
        console.log('   Try marking attendance again on the UI.');
      } else {
        console.log('\n❌ No Thursday timetable entry found either!');
      }
    }
    
    // Check Monday session for comparison
    const mondaySession = sessions.find(s => 
      s.date.toISOString().split('T')[0] === '2025-08-04'
    );
    
    console.log(`\n🔍 Monday Aug 4 session: ${mondaySession ? '✅ Exists' : '❌ Missing'}`);
    
    if (!mondaySession) {
      console.log('   Monday is also missing attendance session!');
      
      const mondayEntry = await prisma.timetableEntry.findFirst({
        where: {
          subjectId: summerInternship.id,
          date: new Date('2025-08-04'),
          isActive: true
        }
      });
      
      if (mondayEntry) {
        console.log('   Creating Monday session too...');
        const mondayNewSession = await prisma.attendanceSession.create({
          data: {
            subjectId: summerInternship.id,
            batchId: mondayEntry.batchId,
            date: new Date('2025-08-04'),
            startTime: '09:30:00',
            endTime: '10:30:00',
            status: 'SCHEDULED',
            createdBy: mondayEntry.facultyId || summerInternship.primaryFacultyId
          }
        });
        console.log(`   ✅ Created Monday session: ${mondayNewSession.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugThursdaySimple();