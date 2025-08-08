// Debug why Thursday attendance is showing as yellow when records exist
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAttendanceDisplay() {
  try {
    console.log('🔍 DEBUG: Why Thursday shows yellow when attendance records exist\n');
    
    // Get the student that you were testing (JLU07709 from screenshot)
    const testStudent = await prisma.student.findFirst({
      where: {
        rollNumber: 'JLU07709'
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    if (!testStudent) {
      console.log('❌ Test student JLU07709 not found');
      return;
    }
    
    console.log(`👤 Test Student: ${testStudent.user?.name} (${testStudent.rollNumber})`);
    console.log(`   Student ID: ${testStudent.id}`);
    
    // Get Summer Internship subject
    const summerInternship = await prisma.subject.findFirst({
      where: { code: 'BDES5-SI' }
    });
    
    // Get Thursday session
    const thursdaySession = await prisma.attendanceSession.findFirst({
      where: {
        subjectId: summerInternship?.id,
        date: new Date('2025-08-07')
      }
    });
    
    if (!thursdaySession) {
      console.log('❌ Thursday session not found');
      return;
    }
    
    console.log(`📅 Thursday Session: ${thursdaySession.id}`);
    console.log(`   Date: ${thursdaySession.date.toISOString().split('T')[0]}`);
    
    // Check this specific student's Thursday attendance record
    const thursdayRecord = await prisma.attendanceRecord.findFirst({
      where: {
        sessionId: thursdaySession.id,
        studentId: testStudent.id
      }
    });
    
    if (thursdayRecord) {
      console.log(`✅ Thursday record exists for this student:`);
      console.log(`   Status: ${thursdayRecord.status}`);
      console.log(`   Record ID: ${thursdayRecord.id}`);
      console.log(`   Created: ${thursdayRecord.createdAt}`);
      
      console.log('\n🤔 PROBLEM: Record exists but UI shows yellow (unmarked)');
      console.log('   This suggests an issue with how attendance history is calculated');
      
    } else {
      console.log(`❌ No Thursday record for student ${testStudent.rollNumber}`);
      console.log('   This explains why it shows yellow - no record exists for this student');
      
      // Check all records for Thursday to see which students have records
      const allThursdayRecords = await prisma.attendanceRecord.findMany({
        where: {
          sessionId: thursdaySession.id
        },
        include: {
          student: { 
            include: {
              user: { select: { name: true } }
            }
          }
        }
      });
      
      console.log(`\n📋 All Thursday records (${allThursdayRecords.length}):`);
      allThursdayRecords.forEach((record, i) => {
        console.log(`   ${i+1}. ${record.student.user?.name} (${record.student.rollNumber}): ${record.status}`);
      });
      
      console.log(`\n🔍 Student ${testStudent.rollNumber} is NOT in the Thursday records`);
      console.log('   This is why the UI shows yellow (unmarked) - correct behavior!');
    }
    
    // Let's also check Wednesday (which should show green)
    const wednesdaySession = await prisma.attendanceSession.findFirst({
      where: {
        subjectId: summerInternship?.id,
        date: new Date('2025-08-06')
      }
    });
    
    if (wednesdaySession) {
      const wednesdayRecord = await prisma.attendanceRecord.findFirst({
        where: {
          sessionId: wednesdaySession.id,
          studentId: testStudent.id
        }
      });
      
      console.log(`\n📅 Wednesday comparison:`);
      if (wednesdayRecord) {
        console.log(`   ✅ Wednesday record: ${wednesdayRecord.status} (should show green/blue/red)`);
      } else {
        console.log(`   ❌ No Wednesday record (should show yellow)`);
      }
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('If Thursday shows yellow, it means:');
    console.log('1. ✅ Session exists (correct)');  
    console.log('2. ❌ No attendance record for this specific student (correct behavior)');
    console.log('3. 🟡 Yellow = "Class scheduled but not marked for this student"');
    console.log('\nTo fix: Mark attendance for this student on Thursday!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAttendanceDisplay();