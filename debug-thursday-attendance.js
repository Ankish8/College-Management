// Debug Thursday Aug 7 attendance session and marking
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugThursdayAttendance() {
  try {
    console.log('🔍 DEBUG: Thursday Aug 7 attendance issue\n');
    
    // Get Summer Internship subject
    const summerInternship = await prisma.subject.findFirst({
      where: { code: 'BDES5-SI' },
      select: { id: true, name: true }
    });
    
    if (!summerInternship) {
      console.log('❌ Summer Internship subject not found');
      return;
    }
    
    console.log(`📚 Subject: ${summerInternship.name} (${summerInternship.id})`);
    
    // Check if there's a timetable entry for Thursday Aug 7
    const thursdayEntry = await prisma.timetableEntry.findFirst({
      where: {
        subjectId: summerInternship.id,
        date: new Date('2025-08-07'),
        dayOfWeek: 'THURSDAY',
        isActive: true
      },
      include: {
        timeSlot: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    
    if (!thursdayEntry) {
      console.log('❌ No timetable entry found for Thursday Aug 7');
      return;
    }
    
    console.log(`📅 Thursday Timetable Entry: ${thursdayEntry.id}`);
    console.log(`   Date: ${thursdayEntry.date?.toISOString().split('T')[0]}`);
    console.log(`   Day: ${thursdayEntry.dayOfWeek}`);
    console.log(`   Time: ${thursdayEntry.timeSlot.name}`);
    console.log(`   Batch: ${thursdayEntry.batch.name}`);
    
    // Check if there's an attendance session for Thursday Aug 7
    const thursdaySession = await prisma.attendanceSession.findFirst({
      where: {
        subjectId: summerInternship.id,
        date: new Date('2025-08-07')
      },
      include: {
        attendanceRecords: {
          include: {
            student: { select: { name: true, studentId: true } }
          }
        }
      }
    });
    
    if (!thursdaySession) {
      console.log('\n❌ No attendance session found for Thursday Aug 7');
      console.log('   This explains why attendance is not being saved!');
      console.log('   The system needs to create an attendance session first.');
      
      console.log('\n🔧 SOLUTION: Create attendance session for Thursday');
      
      // Create the missing attendance session
      const newSession = await prisma.attendanceSession.create({
        data: {
          subjectId: summerInternship.id,
          batchId: thursdayEntry.batchId,
          date: new Date('2025-08-07'),
          startTime: thursdayEntry.timeSlot.startTime || '09:30:00',
          endTime: thursdayEntry.timeSlot.endTime || '10:30:00',
          status: 'SCHEDULED',
          createdBy: thursdayEntry.facultyId
        }
      });
      
      console.log(`   ✅ Created attendance session: ${newSession.id}`);
      console.log(`      Date: ${newSession.date.toISOString().split('T')[0]}`);
      console.log(`      Subject: ${summerInternship.name}`);
      console.log(`      Status: ${newSession.status}`);
      
    } else {
      console.log(`\n✅ Attendance session exists: ${thursdaySession.id}`);
      console.log(`   Date: ${thursdaySession.date.toISOString().split('T')[0]}`);
      console.log(`   Status: ${thursdaySession.status}`);
      console.log(`   Records: ${thursdaySession.attendanceRecords.length} students`);
      
      if (thursdaySession.attendanceRecords.length > 0) {
        console.log('\n📋 Attendance records for Thursday:');
        thursdaySession.attendanceRecords.forEach((record, i) => {
          console.log(`   ${i+1}. ${record.student.name} (${record.student.studentId}): ${record.status}`);
        });
      } else {
        console.log('\n📋 No attendance records found for Thursday');
        console.log('   Session exists but no student records created yet');
      }
    }
    
    // Check Monday and Wednesday sessions for comparison
    console.log('\n' + '='.repeat(60));
    console.log('🔍 COMPARISON: Check Monday and Wednesday sessions\n');
    
    const dates = ['2025-08-04', '2025-08-06', '2025-08-07'];
    const dayNames = ['Monday', 'Wednesday', 'Thursday'];
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dayName = dayNames[i];
      
      const session = await prisma.attendanceSession.findFirst({
        where: {
          subjectId: summerInternship.id,
          date: new Date(date)
        }
      });
      
      console.log(`${dayName} ${date}: ${session ? `✅ Session exists (${session.id})` : '❌ No session'}`);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('If Thursday session was missing, it has now been created.');
    console.log('Try marking Thursday attendance again - it should now save properly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugThursdayAttendance();