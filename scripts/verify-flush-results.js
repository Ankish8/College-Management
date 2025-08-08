const { PrismaClient } = require('@prisma/client');

async function verifyFlushResults() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verifying flush results...\n');

    // Check that target tables are empty (should be 0)
    const deletedData = {
      timetableEntries: await prisma.timetableEntry.count(),
      attendanceDisputes: await prisma.attendanceDispute.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      attendanceSessions: await prisma.attendanceSession.count(),
    };

    console.log('📊 Deleted data (should all be 0):');
    console.log(`  ❌ TimetableEntry: ${deletedData.timetableEntries}`);
    console.log(`  ❌ AttendanceDispute: ${deletedData.attendanceDisputes}`);
    console.log(`  ❌ AttendanceRecord: ${deletedData.attendanceRecords}`);
    console.log(`  ❌ AttendanceSession: ${deletedData.attendanceSessions}`);

    // Check that preserved data remains (should be > 0)
    const preservedData = {
      universities: await prisma.university.count(),
      departments: await prisma.department.count(),
      programs: await prisma.program.count(),
      specializations: await prisma.specialization.count(),
      batches: await prisma.batch.count(),
      users: await prisma.user.count(),
      students: await prisma.student.count(),
      subjects: await prisma.subject.count(),
      timeSlots: await prisma.timeSlot.count(),
    };

    console.log('\n📊 Preserved data (should be > 0):');
    console.log(`  ✅ Universities: ${preservedData.universities}`);
    console.log(`  ✅ Departments: ${preservedData.departments}`);
    console.log(`  ✅ Programs: ${preservedData.programs}`);
    console.log(`  ✅ Specializations: ${preservedData.specializations}`);
    console.log(`  ✅ Batches: ${preservedData.batches}`);
    console.log(`  ✅ Users: ${preservedData.users}`);
    console.log(`  ✅ Students: ${preservedData.students}`);
    console.log(`  ✅ Subjects: ${preservedData.subjects}`);
    console.log(`  ✅ TimeSlots: ${preservedData.timeSlots}`);

    // Verification logic
    const targetDataDeleted = Object.values(deletedData).every(count => count === 0);
    const coreDataPreserved = preservedData.users > 0 && 
                              preservedData.students > 0 && 
                              preservedData.subjects > 0 && 
                              preservedData.batches > 0;

    console.log('\n🎯 VERIFICATION RESULTS:');
    if (targetDataDeleted && coreDataPreserved) {
      console.log('✅ SUCCESS: Flush operation completed correctly!');
      console.log('   - All timetable and attendance data has been removed');
      console.log('   - All batches, subjects, students, and faculty remain intact');
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (!targetDataDeleted) {
        console.log('   - Some timetable/attendance data may still exist');
      }
      if (!coreDataPreserved) {
        console.log('   - Some core data may have been accidentally deleted');
      }
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyFlushResults()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });